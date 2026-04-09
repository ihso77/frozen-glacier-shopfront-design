import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================
// إعدادات الدفع الحقيقي - LIVE MODE
// ============================================
const COINGATE_API_KEY = 'oMWyXkHrgGUx-xdFmUMhPq3JwEG7sdp-UFSHyrcX';
const COINGATE_API = 'https://api.coingate.com/v2';
// ============================================

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('=== Payment Request Started ===');

  try {
    // Parse body
    let body;
    try {
      body = await req.json();
    } catch (e) {
      console.error('Failed to parse body:', e);
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Request body:', JSON.stringify(body));

    const { action, amount, currency = 'USD', title, description } = body;

    // Only handle 'create' action
    if (action !== 'create') {
      return new Response(JSON.stringify({ error: 'Invalid action. Use "create"' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate amount
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return new Response(JSON.stringify({ error: 'Invalid amount' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get origin for callbacks
    const origin = req.headers.get('origin') || 
                   req.headers.get('referer')?.split('/').slice(0, 3).join('/') || 
                   'https://www.nova-store.dev';

    const orderId = crypto.randomUUID();

    console.log(`Creating CoinGate order: ${orderId}`);
    console.log(`Amount: ${numAmount} ${currency}`);
    console.log(`API Key: ${COINGATE_API_KEY.substring(0, 10)}...`);

    // Create CoinGate order
    const orderPayload = {
      order_id: orderId,
      price_amount: numAmount.toFixed(2),
      price_currency: currency,
      receive_currency: currency,
      title: (title || 'Nova Store Purchase').substring(0, 150),
      description: (description || 'Digital product purchase').substring(0, 500),
      callback_url: 'https://daqpmzbbmjigmxubjfkx.supabase.co/functions/v1/payment-callback',
      success_url: `${origin}/payment-success?order_id=${orderId}`,
      cancel_url: `${origin}/payment-cancel`,
    };

    console.log('Order payload:', JSON.stringify(orderPayload));

    const orderRes = await fetch(`${COINGATE_API}/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${COINGATE_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(orderPayload),
    });

    const responseText = await orderRes.text();
    console.log(`CoinGate response status: ${orderRes.status}`);
    console.log(`CoinGate response: ${responseText}`);

    if (!orderRes.ok) {
      console.error('CoinGate API error:', responseText);
      return new Response(JSON.stringify({ 
        error: 'فشل في الاتصال ببوابة الدفع',
        details: responseText,
        status: orderRes.status
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let orderData;
    try {
      orderData = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse CoinGate response:', e);
      return new Response(JSON.stringify({ error: 'Invalid response from payment gateway' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Order created successfully:', orderData.id);

    return new Response(JSON.stringify({
      success: true,
      id: orderData.id,
      status: orderData.status,
      payment_url: orderData.payment_url,
      order_id: orderId,
      mode: 'live'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const stack = error instanceof Error ? error.stack : '';
    console.error('=== ERROR ===');
    console.error('Message:', message);
    console.error('Stack:', stack);
    
    return new Response(JSON.stringify({ 
      error: message,
      stack: stack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
