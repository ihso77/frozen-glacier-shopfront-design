import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { v4 as uuidv4 } from "https://esm.sh/uuid";
import * as path from "https://deno.land/std@0.168.0/path/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const COINGATE_API_KEY = 'gCxoJVnV5Ljzk3dAkTiJDRaR8s9GSWajxanqLzMU';
const COINGATE_API = 'https://api-sandbox.coingate.com/v2';

// ⚠️ PAYMENT DISABLED FOR TESTING - Set to false to re-enable payments
const PAYMENT_DISABLED = true;
const PAYMENT_DISABLED_MESSAGE = 'الدفع معطل مؤقتاً لأغراض الاختبار. يرجى المحاولة لاحقاً.';


const getSupabase = () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(supabaseUrl, supabaseKey);
};

// CREATE BOT - Extract files from ZIP and store in database
async function handleCreateBot(body: any) {
  const { userId, productId, botName, zipUrl, botId } = body;

  if (!userId || !productId || !botName) {
    throw new Error('Missing required parameters');
  }

  const supabase = getSupabase();

  // إذا تم تمرير botId، استخدمه مباشرة
  let bot;
  if (botId) {
    const { data: existingBot, error } = await supabase
      .from('user_bots')
      .select('*')
      .eq('id', botId)
      .single();
    
    if (error || !existingBot) {
      throw new Error('Bot not found');
    }
    bot = existingBot;
  } else {
    // إنشاء بوت جديد فقط إذا لم يتم تمرير botId
    const { data: newBot, error: botError } = await supabase
      .from('user_bots')
      .insert({
        user_id: userId,
        product_id: productId,
        name: botName,
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

  // Download ZIP file
  const response = await fetch(zipUrl);
  if (!response.ok) throw new Error('Failed to download zip file');

  const zipData = await response.arrayBuffer();
  await Deno.writeFile(zipPath, new Uint8Array(zipData));

  // Extract ZIP
  try {
    const unzipCommand = new Deno.Command('unzip', {
      args: ['-o', zipPath, '-d', `${tempDir}/extracted`],
      stdout: 'piped',
      stderr: 'piped'
    });
    await unzipCommand.output();
  } catch {
    // Fallback to Python
    const altCommand = new Deno.Command('python3', {
      args: ['-c', `import zipfile,os; zipfile.ZipFile("${zipPath}",'r').extractall("${tempDir}/extracted")`],
      stdout: 'piped',
      stderr: 'piped'
    });
    await altCommand.output();
  }

  // Read all files recursively
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
          // Read text-based files
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

  // Insert files into database
  for (const file of files) {
    await supabase.from('bot_files').insert({
      bot_id: bot.id,
      filename: file.filename,
      content: file.content,
      path: file.path,
      is_edited: false
    });
  }

  // Create default environment variables if not exists
  const { data: existingEnvVars } = await supabase
    .from('bot_env_vars')
    .select('id')
    .eq('bot_id', bot.id);

  if (!existingEnvVars || existingEnvVars.length === 0) {
    const defaultEnvVars = [
      { key: 'DISCORD_TOKEN', value: '', is_secret: true },
      { key: 'PREFIX', value: '!', is_secret: false },
      { key: 'OWNER_ID', value: '', is_secret: true }
    ];

    for (const env of defaultEnvVars) {
      await supabase.from('bot_env_vars').insert({ bot_id: bot.id, ...env });
    }
  }

  // Add initial log
  await supabase.from('bot_logs').insert({
    bot_id: bot.id,
    log_type: 'info',
    message: `تم إنشاء البوت مع ${files.length} ملف. أضف التوكن وشغّل!`
  });

  // Cleanup
  try { await Deno.remove(tempDir, { recursive: true }); } catch { }

  return { success: true, botId: bot.id, filesCount: files.length };
}

// RUN BOT - Actually execute the bot code
async function handleRunBot(body: any) {
  const { botId, files, envVars } = body;

  if (!botId || !files || !Array.isArray(files)) {
    throw new Error('Missing required parameters');
  }

  const processId = uuidv4();
  const botDir = `/tmp/bot-${processId}`;

  const supabase = getSupabase();

  try {
    await Deno.mkdir(botDir, { recursive: true });

    // Find the main bot directory (skip nested folders)
    let mainDir = '';
    for (const file of files) {
      if (file.filename === 'index.js' || file.filename === 'main.js' || file.filename === 'bot.js') {
        mainDir = file.path;
        break;
      }
    }

    // Write all files
    for (const file of files) {
      const filePath = file.path === '/' ? `${botDir}/${file.filename}` : `${botDir}${file.path}${file.filename}`;
      const dirPath = file.path === '/' ? botDir : `${botDir}${file.path}`;
      
      try {
        await Deno.mkdir(dirPath, { recursive: true });
        await Deno.writeTextFile(filePath, file.content || '');
      } catch (e) {
        console.error(`Error writing file ${filePath}:`, e);
      }
    }

    // Write .env file
    const envContent = (envVars || []).map((e: any) => `${e.key}=${e.value || ''}`).join('\n');
    await Deno.writeTextFile(`${botDir}/.env`, envContent);

    // Create environment object
    const env: Record<string, string> = { ...Deno.env.toObject() };
    (envVars || []).forEach((e: any) => {
      if (e.key && e.value) {
        env[e.key] = e.value;
      }
    });

    // Find main file
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

    // Update status to running
    await supabase.from('user_bots').update({ status: 'running' }).eq('id', botId);
    await supabase.from('bot_logs').insert({ 
      bot_id: botId, 
      log_type: 'info', 
      message: `Starting bot: ${mainFile.filename}` 
    });

    // Try to run with Node.js first, then Deno
    let command;
    let usingNode = false;

    try {
      // Check if node is available
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
      // Use Deno to run the JavaScript
      // Deno can run JS files but needs some compatibility setup
      await supabase.from('bot_logs').insert({ 
        bot_id: botId, 
        log_type: 'warning', 
        message: 'Node.js not available, trying Deno runtime...' 
      });

      // Create a wrapper that imports the bot code
      const wrapperCode = `
// Deno compatibility wrapper
const require = (mod) => {
  // Map common Node modules to Deno equivalents
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

// Set up environment
${Object.entries(env).map(([k, v]) => `process.env.${k} = "${(v || '').replace(/"/g, '\\"')}";`).join('\n')}

// Load and run the bot
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

    // Read and log stdout
    const stdoutReader = process.stdout.getReader();
    const stderrReader = process.stderr.getReader();

    // Read stdout in background
    const readStdout = async () => {
      try {
        while (true) {
          const { done, value } = await stdoutReader.read();
          if (done) break;
          const text = new TextDecoder().decode(value);
          if (text.trim()) {
            await supabase.from('bot_logs').insert({ 
              bot_id: botId, 
              log_type: 'info', 
              message: text.trim() 
            });
          }
        }
      } catch (e) {
        console.error('stdout reader error:', e);
      }
    };

    // Read stderr in background
    const readStderr = async () => {
      try {
        while (true) {
          const { done, value } = await stderrReader.read();
          if (done) break;
          const text = new TextDecoder().decode(value);
          if (text.trim()) {
            await supabase.from('bot_logs').insert({ 
              bot_id: botId, 
              log_type: 'error', 
              message: text.trim() 
            });
          }
        }
      } catch (e) {
        console.error('stderr reader error:', e);
      }
    };

    // Start reading outputs
    readStdout();
    readStderr();

    // Wait for process to complete (with timeout)
    const timeout = 300000; // 5 minutes max
    const status = await Promise.race([
      process.status,
      new Promise<{ success: boolean; code: number }>((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), timeout)
      )
    ]).catch(async (e) => {
      // Kill process on timeout
      try { process.kill('SIGTERM'); } catch { }
      return { success: false, code: -1, message: e.message };
    });

    // Log completion
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

    // Update status
    await supabase.from('user_bots').update({ status: 'stopped' }).eq('id', botId);

    // Cleanup
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
  // ⚠️ PAYMENT DISABLED CHECK
  if (PAYMENT_DISABLED) {
    return new Response(JSON.stringify({ 
      error: PAYMENT_DISABLED_MESSAGE,
      payment_disabled: true,
      message_ar: 'الدفع معطل مؤقتاً لأغراض الاختبار',
      message_en: 'Payment is temporarily disabled for testing'
    }), {
      status: 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const origin = req.headers.get('origin') || req.headers.get('referer')?.split('/').slice(0, 3).join('/') || 'https://nova-store.vercel.app';
    const body = await req.json();
    const { action, amount, currency = 'USD', title, description } = body;

    // CoinGate Payment Creation
    if (action === 'create') {
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return new Response(JSON.stringify({ error: 'Invalid amount' }), { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      const orderRes = await fetch(`${COINGATE_API}/orders`, {
        method: 'POST',
        headers: { 
          'Authorization': `Token ${COINGATE_API_KEY}`, 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({
          order_id: crypto.randomUUID(),
          price_amount: numAmount.toFixed(2),
          price_currency: currency,
          receive_currency: currency,
          title: title?.substring(0, 150) || 'Nova Store Purchase',
          description: description?.substring(0, 500) || 'Digital product purchase',
          success_url: `${origin}/payment-success`,
          cancel_url: `${origin}/payment-cancel`,
        }),
      });

      const responseText = await orderRes.text();
      if (!orderRes.ok) {
        return new Response(JSON.stringify({ error: `CoinGate error: ${responseText}` }), { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      const orderData = JSON.parse(responseText);
      return new Response(JSON.stringify({ 
        id: orderData.id, 
        status: orderData.status, 
        payment_url: orderData.payment_url 
      }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Create Bot
    if (action === 'create-bot') {
      const result = await handleCreateBot(body);
      return new Response(JSON.stringify(result), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Run Bot
    if (action === 'run-bot') {
      const result = await handleRunBot(body);
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
    return new Response(JSON.stringify({ error: message }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
