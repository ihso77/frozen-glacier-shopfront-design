import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { v4 as uuidv4 } from "https://esm.sh/uuid";
import * as path from "https://deno.land/std@0.168.0/path/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================
// إعدادات Paymento - بوابة الدفع
// ============================================
const PAYMENTO_API_KEY = 'MzFCRUEzMTk0MzVCQzRDMDg2N0ZCREFCMzQ5OTc4QzI=';
const PAYMENTO_SECRET_KEY = 'MzE1NERFQjM3MzcyQUREMkEwOEI2ODJGODc4RjFFQzY=';
const PAYMENTO_API = 'https://api.paymento.io/v1';
const PAYMENTO_GATEWAY = 'https://app.paymento.io/gateway';
// ============================================

const getSupabase = () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(supabaseUrl, supabaseKey);
};

const getAnonSupabase = () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  return createClient(supabaseUrl, supabaseKey);
};

async function authenticateUser(req: Request): Promise<{ userId: string } | Response> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const supabase = getAnonSupabase();
  const { data: { user }, error } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
  if (error || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  return { userId: user.id };
}

// CREATE BOT - Extract files from ZIP and store in database
async function handleCreateBot(body: any, userId: string) {
  const { productId, botName, zipUrl, botId } = body;

  if (!productId || !botName) {
    throw new Error('Missing required parameters');
  }

  const supabase = getSupabase();

  let bot;
  if (botId) {
    const { data: existingBot, error } = await supabase
      .from('user_bots')
      .select('*')
      .eq('id', botId)
      .eq('user_id', userId)
      .single();
    
    if (error || !existingBot) {
      throw new Error('Bot not found');
    }
    bot = existingBot;
  } else {
    const { data: newBot, error: botError } = await supabase
      .from('user_bots')
      .insert({
        user_id: userId,
        product_id: productId,
        name: (botName as string).substring(0, 100),
        status: 'stopped'
      })
      .select()
      .single();

    if (botError) throw botError;
    bot = newBot;
  }

  const tempDir = `/tmp/bot-extract-${uuidv4()}`;
  const zipPath = `${tempDir}/bot.zip`;

  await Deno.mkdir(tempDir, { recursive: true });

  const response = await fetch(zipUrl);
  if (!response.ok) throw new Error('Failed to download zip file');

  const zipData = await response.arrayBuffer();
  await Deno.writeFile(zipPath, new Uint8Array(zipData));

  try {
    const unzipCommand = new Deno.Command('unzip', {
      args: ['-o', zipPath, '-d', `${tempDir}/extracted`],
      stdout: 'piped',
      stderr: 'piped'
    });
    await unzipCommand.output();
  } catch {
    const altCommand = new Deno.Command('python3', {
      args: ['-c', `import zipfile,os; zipfile.ZipFile("${zipPath}",'r').extractall("${tempDir}/extracted")`],
      stdout: 'piped',
      stderr: 'piped'
    });
    await altCommand.output();
  }

  const readFiles = async (dir: string, basePath: string = '/'): Promise<{ filename: string; content: string; path: string }[]> => {
    const files: { filename: string; content: string; path: string }[] = [];
    try {
      for await (const entry of Deno.readDir(dir)) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory) {
          const subFiles = await readFiles(fullPath, `${basePath}${entry.name}/`);
          files.push(...subFiles);
        } else if (entry.isFile) {
          const ext = path.extname(entry.name).toLowerCase();
          if (['.js', '.ts', '.json', '.md', '.txt', '.env', '.yml', '.yaml', '.mjs', '.cjs'].includes(ext) || entry.name === '.env' || entry.name === '.gitignore') {
            try {
              const content = await Deno.readTextFile(fullPath);
              files.push({ filename: entry.name, content, path: basePath });
            } catch { }
          }
        }
      }
    } catch { }
    return files;
  };

  const files = await readFiles(`${tempDir}/extracted`);

  for (const file of files) {
    await supabase.from('bot_files').insert({
      bot_id: bot.id,
      filename: file.filename,
      content: file.content,
      path: file.path,
      is_edited: false
    });
  }

  const defaultEnvVars = [
    { key: 'DISCORD_TOKEN', value: '', is_secret: true },
    { key: 'PREFIX', value: '!', is_secret: false },
    { key: 'OWNER_ID', value: '', is_secret: true }
  ];

  for (const env of defaultEnvVars) {
    await supabase.from('bot_env_vars').insert({ bot_id: bot.id, ...env });
  }

  await supabase.from('bot_logs').insert({
    bot_id: bot.id,
    log_type: 'info',
    message: `Bot created with ${files.length} files. Add your token and run!`
  });

  try { await Deno.remove(tempDir, { recursive: true }); } catch { }

  return { success: true, botId: bot.id, filesCount: files.length };
}

// RUN BOT
async function handleRunBot(body: any, userId: string) {
  const { botId, files, envVars } = body;

  if (!botId || !files || !Array.isArray(files)) {
    throw new Error('Missing required parameters');
  }

  const supabase = getSupabase();

  // Verify bot ownership
  const { data: botData, error: botErr } = await supabase
    .from('user_bots')
    .select('id')
    .eq('id', botId)
    .eq('user_id', userId)
    .single();

  if (botErr || !botData) {
    throw new Error('Bot not found or access denied');
  }

  const processId = uuidv4();
  const botDir = `/tmp/bot-${processId}`;

  try {
    await Deno.mkdir(botDir, { recursive: true });

    let mainDir = '';
    for (const file of files) {
      if (file.filename === 'index.js' || file.filename === 'main.js' || file.filename === 'bot.js') {
        mainDir = file.path;
        break;
      }
    }

    for (const file of files) {
      const filePath = file.path === '/' ? `${botDir}/${file.filename}` : `${botDir}${file.path}${file.filename}`;
      const dirPath = file.path === '/' ? botDir : `${botDir}${file.path}`;
      
      try {
        await Deno.mkdir(dirPath, { recursive: true });
        await Deno.writeTextFile(filePath, file.content || '');
      } catch (e) {
        // File write error
      }
    }

    const envContent = (envVars || []).map((e: any) => `${e.key}=${e.value || ''}`).join('\n');
    await Deno.writeTextFile(`${botDir}/.env`, envContent);

    const env: Record<string, string> = { ...Deno.env.toObject() };
    (envVars || []).forEach((e: any) => {
      if (e.key && e.value) {
        env[e.key] = e.value;
      }
    });

    let mainFile = files.find((f: any) => f.filename === 'index.js');
    if (!mainFile) mainFile = files.find((f: any) => f.filename === 'main.js');
    if (!mainFile) mainFile = files.find((f: any) => f.filename === 'bot.js');
    if (!mainFile) mainFile = files.find((f: any) => f.filename.endsWith('.js'));
    
    if (!mainFile) {
      throw new Error('No JavaScript file found in bot');
    }

    const mainFilePath = mainFile.path === '/' 
      ? `${botDir}/${mainFile.filename}` 
      : `${botDir}${mainFile.path}${mainFile.filename}`;

    await supabase.from('user_bots').update({ status: 'running' }).eq('id', botId);
    await supabase.from('bot_logs').insert({ 
      bot_id: botId, 
      log_type: 'info', 
      message: `Starting bot: ${mainFile.filename}` 
    });

    let command;
    let usingNode = false;

    try {
      const nodeCheck = new Deno.Command('which', { args: ['node'] });
      const nodeResult = await nodeCheck.output();
      if (nodeResult.code === 0) {
        command = new Deno.Command('node', {
          args: [mainFilePath],
          cwd: botDir,
          env: env,
          stdout: 'piped',
          stderr: 'piped'
        });
        usingNode = true;
      }
    } catch {
      // Node not available
    }

    if (!usingNode) {
      await supabase.from('bot_logs').insert({ 
        bot_id: botId, 
        log_type: 'warning', 
        message: 'Node.js not available, trying Deno runtime...' 
      });

      const wrapperCode = `
const require = (mod) => {
  const modules = {
    'fs': { 
      existsSync: (p) => { try { Deno.statSync(p); return true; } catch { return false; } },
      readFileSync: (p) => Deno.readTextFileSync(p),
      writeFileSync: (p, d) => Deno.writeTextFileSync(p, d),
      readdirSync: (p) => Array.from(Deno.readDirSync(p)).map(e => e.name),
      mkdirSync: (p) => Deno.mkdirSync(p, { recursive: true }),
    },
    'path': {
      join: (...args) => args.join('/'),
      dirname: (p) => p.split('/').slice(0, -1).join('/'),
      basename: (p) => p.split('/').pop(),
      extname: (p) => { const i = p.lastIndexOf('.'); return i >= 0 ? p.slice(i) : ''; },
    },
    'http': {},
    'https': {},
  };
  return modules[mod] || {};
};

${Object.entries(env).map(([k, v]) => `process.env.${k} = "${(v || '').replace(/"/g, '\\"')}";`).join('\n')}

import('${mainFilePath}');
`;
      const wrapperPath = `${botDir}/deno-wrapper.js`;
      await Deno.writeTextFile(wrapperPath, wrapperCode);

      command = new Deno.Command('deno', {
        args: ['run', '--allow-all', '--unstable', wrapperPath],
        cwd: botDir,
        env: env,
        stdout: 'piped',
        stderr: 'piped'
      });
    }

    const process = command.spawn();

    const stdoutReader = process.stdout.getReader();
    const stderrReader = process.stderr.getReader();

    const readStdout = async () => {
      try {
        while (true) {
          const { done, value } = await stdoutReader.read();
          if (done) break;
          const text = new TextDecoder().decode(value);
          if (text.trim()) {
            await supabase.from('bot_logs').insert({ bot_id: botId, log_type: 'info', message: text.trim() });
          }
        }
      } catch { }
    };

    const readStderr = async () => {
      try {
        while (true) {
          const { done, value } = await stderrReader.read();
          if (done) break;
          const text = new TextDecoder().decode(value);
          if (text.trim()) {
            await supabase.from('bot_logs').insert({ bot_id: botId, log_type: 'error', message: text.trim() });
          }
        }
      } catch { }
    };

    readStdout();
    readStderr();

    const timeout = 300000;
    const status = await Promise.race([
      process.status,
      new Promise<{ success: boolean; code: number }>((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), timeout)
      )
    ]).catch(async (e) => {
      try { process.kill('SIGTERM'); } catch { }
      return { success: false, code: -1, message: e.message };
    });

    const exitMessage = typeof status === 'object' && 'message' in status 
      ? `Bot stopped: ${status.message}`
      : status.success 
        ? 'Bot finished successfully' 
        : `Bot exited with error code ${status.code}`;

    await supabase.from('bot_logs').insert({ 
      bot_id: botId, 
      log_type: status.success ? 'success' : 'error', 
      message: exitMessage
    });

    await supabase.from('user_bots').update({ status: 'stopped' }).eq('id', botId);
    try { await Deno.remove(botDir, { recursive: true }); } catch { }

    return { 
      success: status.success, 
      processId, 
      exitCode: typeof status === 'object' && 'code' in status ? status.code : 0 
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    await supabase.from('bot_logs').insert({ 
      bot_id: botId, 
      log_type: 'error', 
      message: `Failed to run: ${errorMessage}` 
    });
    
    await supabase.from('user_bots').update({ status: 'stopped' }).eq('id', botId);
    try { await Deno.remove(botDir, { recursive: true }); } catch { }
    
    throw error;
  }
}

// STOP BOT
async function handleStopBot(body: any) {
  const { processId } = body;
  if (!processId) throw new Error('Missing processId');
  
  const botDir = `/tmp/bot-${processId}`;
  try { await Deno.remove(botDir, { recursive: true }); } catch { }
  
  return { success: true, message: 'Stop signal sent' };
}

// MAIN HANDLER
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user for all actions
    const authResult = await authenticateUser(req);
    if (authResult instanceof Response) return authResult;
    const { userId } = authResult;

    const origin = req.headers.get('origin') || req.headers.get('referer')?.split('/').slice(0, 3).join('/') || 'https://www.nova-store.dev';
    const body = await req.json();
    const { action, amount, currency = 'USD', title, description, productId, email } = body;

    // Paymento Payment Creation
    if (action === 'create') {
      const numAmount = parseFloat(amount);
      
      if (isNaN(numAmount) || numAmount <= 0) {
        return new Response(JSON.stringify({ error: 'Invalid amount' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const orderId = crypto.randomUUID();

      console.log(`Creating Paymento order for amount: ${numAmount} ${currency}`);

      // Create payment request with Paymento
      const paymentRes = await fetch(`${PAYMENTO_API}/payment/request`, {
        method: 'POST',
        headers: { 
          'Api-key': PAYMENTO_API_KEY, 
          'Content-Type': 'application/json',
          'Accept': 'text/plain'
        },
        body: JSON.stringify({
          fiatAmount: numAmount.toFixed(2),
          fiatCurrency: currency,
          ReturnUrl: `${origin}/payment-success?order_id=${orderId}`,
          orderId: orderId,
          Speed: 0, // 0 = High (accept on mempool), 1 = Low (wait for confirmations)
          EmailAddress: email || ''
        }),
      });

      const responseText = await paymentRes.text();
      console.log('Paymento response:', responseText);
      
      if (!paymentRes.ok) {
        console.error('Paymento error:', responseText);
        return new Response(JSON.stringify({ 
          error: 'فشل في معالجة الدفع',
          details: responseText 
        }), { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      const paymentData = JSON.parse(responseText);
      
      if (!paymentData.success) {
        return new Response(JSON.stringify({ 
          error: 'فشل في إنشاء طلب الدفع',
          details: paymentData.message 
        }), { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      const token = paymentData.body;
      const paymentUrl = `${PAYMENTO_GATEWAY}?token=${token}`;
      
      // حفظ الطلب في قاعدة البيانات
      const supabase = getSupabase();
      try {
        await supabase.from('orders').insert({
          id: orderId,
          user_id: userId,
          product_id: productId,
          total: numAmount,
          status: 'pending',
          payment_method: 'paymento',
          payment_token: token
        });
      } catch (e) {
        console.log('Could not save order to database:', e);
      }

      return new Response(JSON.stringify({ 
        id: token, 
        status: 'pending', 
        payment_url: paymentUrl,
        order_id: orderId,
        token: token,
        mode: 'live'
      }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Verify Payment
    if (action === 'verify') {
      const { token } = body;
      
      if (!token) {
        return new Response(JSON.stringify({ error: 'Token required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      console.log(`Verifying payment with token: ${token}`);

      const verifyRes = await fetch(`${PAYMENTO_API}/payment/verify`, {
        method: 'POST',
        headers: { 
          'Api-key': PAYMENTO_API_KEY, 
          'Content-Type': 'application/json',
          'Accept': 'text/plain'
        },
        body: JSON.stringify({ token }),
      });

      const responseText = await verifyRes.text();
      console.log('Paymento verify response:', responseText);

      if (!verifyRes.ok) {
        return new Response(JSON.stringify({ 
          error: 'فشل في التحقق من الدفع',
          details: responseText 
        }), { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      const verifyData = JSON.parse(responseText);

      return new Response(JSON.stringify({ 
        success: verifyData.success,
        data: verifyData.body
      }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Create Bot
    if (action === 'create-bot') {
      const result = await handleCreateBot(body, userId);
      return new Response(JSON.stringify(result), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Run Bot
    if (action === 'run-bot') {
      const result = await handleRunBot(body, userId);
      return new Response(JSON.stringify(result), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Stop Bot
    if (action === 'stop-bot') {
      const result = await handleStopBot(body);
      return new Response(JSON.stringify(result), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), { 
      status: 400, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error:', message);
    return new Response(JSON.stringify({ error: message }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
