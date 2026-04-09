import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { v4 as uuidv4 } from 'https://esm.sh/uuid';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// الدفع الحقيقي - Live Mode
const COINGATE_API_KEY = 'oMWyXkHrgGUx-xdFmUMhPq3JwEG7sdp-UFSHyrcX';
const COINGATE_API = 'https://api.coingate.com/v2';

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authResult = await authenticateUser(req);
    if (authResult instanceof Response) return authResult;
    const { userId } = authResult;

    const origin = req.headers.get('origin') || req.headers.get('referer')?.split('/').slice(0, 3).join('/') || 'https://www.nova-store.dev';
    const body = await req.json();
    const { action, amount, currency = 'USD', title, description, productId, orderId } = body;

    // CoinGate Payment Creation - Live Mode
    if (action === 'create') {
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return new Response(JSON.stringify({ error: 'Invalid amount' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const customOrderId = orderId || crypto.randomUUID();

      const orderRes = await fetch(`${COINGATE_API}/orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${COINGATE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          order_id: customOrderId,
          price_amount: numAmount.toFixed(2),
          price_currency: currency,
          receive_currency: currency,
          title: title?.substring(0, 150) || 'Nova Store Purchase',
          description: description?.substring(0, 500) || 'Digital product purchase',
          callback_url: `https://daqpmzbbmjigmxubjfkx.supabase.co/functions/v1/payment-callback`,
          success_url: `${origin}/payment-success?order_id=${customOrderId}`,
          cancel_url: `${origin}/payment-cancel`,
        }),
      });

      const responseText = await orderRes.text();
      if (!orderRes.ok) {
        console.error('CoinGate error:', responseText);
        return new Response(JSON.stringify({ error: `CoinGate error: ${responseText}` }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const orderData = JSON.parse(responseText);

      // حفظ الطلب في قاعدة البيانات
      const supabase = getSupabase();
      await supabase.from('orders').insert({
        id: customOrderId,
        user_id: userId,
        product_id: productId,
        total: numAmount,
        status: 'pending',
        payment_method: 'coingate',
        coingate_order_id: orderData.id
      }).catch(() => {});

      return new Response(JSON.stringify({
        id: orderData.id,
        status: orderData.status,
        payment_url: orderData.payment_url,
        order_id: customOrderId,
        mode: 'live'
      }), {
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
