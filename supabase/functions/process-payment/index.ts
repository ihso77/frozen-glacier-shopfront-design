import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const PAYPAL_CLIENT_ID = Deno.env.get('PAYPAL_CLIENT_ID');
    const PAYPAL_SECRET = Deno.env.get('PAYPAL_SECRET');

    if (!PAYPAL_CLIENT_ID || !PAYPAL_SECRET) {
      throw new Error('PayPal credentials not configured');
    }

    const { action, order_id, amount, currency = 'USD', description } = await req.json();

    // PayPal Sandbox API
    const PAYPAL_API = 'https://api-m.sandbox.paypal.com';

    // Get access token
    const authResponse = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!authResponse.ok) {
      const errText = await authResponse.text();
      console.error('PayPal auth error:', errText);
      throw new Error(`PayPal authentication failed: ${authResponse.status}`);
    }

    const { access_token } = await authResponse.json();

    if (action === 'create') {
      // Validate amount
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0 || numAmount > 10000) {
        throw new Error('Invalid amount');
      }

      const orderRes = await fetch(`${PAYPAL_API}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          intent: 'CAPTURE',
          purchase_units: [{
            amount: {
              currency_code: currency,
              value: numAmount.toFixed(2),
            },
            description: description?.substring(0, 127) || 'Frozen Store Purchase',
          }],
          application_context: {
            brand_name: 'Frozen Store',
            landing_page: 'NO_PREFERENCE',
            user_action: 'PAY_NOW',
            return_url: 'https://frozen-glacier-shopfront-design.lovable.app/payment-success',
            cancel_url: 'https://frozen-glacier-shopfront-design.lovable.app/payment-cancel',
          },
        }),
      });

      if (!orderRes.ok) {
        const errText = await orderRes.text();
        console.error('PayPal create order error:', errText);
        throw new Error(`Failed to create PayPal order: ${orderRes.status}`);
      }

      const orderData = await orderRes.json();
      const approveLink = orderData.links?.find((l: any) => l.rel === 'approve')?.href;

      return new Response(JSON.stringify({
        id: orderData.id,
        status: orderData.status,
        approve_url: approveLink,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'capture') {
      if (!order_id || typeof order_id !== 'string') {
        throw new Error('Invalid order_id');
      }

      const captureRes = await fetch(`${PAYPAL_API}/v2/checkout/orders/${encodeURIComponent(order_id)}/capture`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!captureRes.ok) {
        const errText = await captureRes.text();
        console.error('PayPal capture error:', errText);
        throw new Error(`Failed to capture PayPal order: ${captureRes.status}`);
      }

      const captureData = await captureRes.json();

      return new Response(JSON.stringify({
        id: captureData.id,
        status: captureData.status,
        payer: captureData.payer,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error('Invalid action. Use "create" or "capture".');
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Payment error:', errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
