import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// CoinGate Sandbox API
const COINGATE_API = 'https://api-sandbox.coingate.com/v2';

// Sandbox API Key - يمكنك تغييره إذا لزم الأمر
const COINGATE_API_KEY = 'gCxoJVnV5Ljzk3dAkTiJDRaR8s9GSWajxanqLzMU';

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized - No token' }), {
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify token
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized - Invalid token' }), {
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = claimsData.claims.sub;
    const origin = req.headers.get('origin') || 'https://frozen-store.lovable.app';
    
    // Parse request body
    const body = await req.json();
    const { action, type, order_id, amount, currency = 'USD', title, description, coupon_code, success_url, cancel_url, user_email } = body;

    console.log('Payment request:', { action, type, amount, userId });

    // ============================================
    // HOSTING PAYMENT (New Format)
    // ============================================
    if (type === 'hosting') {
      let numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return new Response(JSON.stringify({ error: 'Invalid amount' }), {
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const finalSuccessUrl = success_url || `${origin}/payment-success?type=hosting`;
      const finalCancelUrl = cancel_url || `${origin}/hosting`;

      console.log('Creating hosting payment:', { amount: numAmount, successUrl: finalSuccessUrl });

      const orderRes = await fetch(`${COINGATE_API}/orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${COINGATE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          order_id: `hosting_${crypto.randomUUID()}`,
          price_amount: numAmount.toFixed(2),
          price_currency: currency,
          receive_currency: currency,
          title: 'Nova Store - Bot Hosting (2 months)',
          description: `Bot hosting subscription for user ${user_email || userId}`,
          success_url: finalSuccessUrl,
          cancel_url: finalCancelUrl,
        }),
      });

      const responseText = await orderRes.text();
      console.log('CoinGate response:', responseText);

      if (!orderRes.ok) {
        console.error('CoinGate error:', responseText);
        return new Response(JSON.stringify({ error: 'Payment gateway error', details: responseText }), {
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const orderData = JSON.parse(responseText);

      return new Response(JSON.stringify({
        id: orderData.id,
        status: orderData.status,
        payment_url: orderData.payment_url,
        type: 'hosting',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ============================================
    // PRODUCT PAYMENT (Old Format - Create Order)
    // ============================================
    if (action === 'create') {
      let numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return new Response(JSON.stringify({ error: 'Invalid amount' }), {
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Validate coupon if provided
      let couponId = null;
      let discountAmount = 0;
      
      if (coupon_code) {
        const { data: couponResult } = await supabase.rpc('apply_coupon', {
          _code: coupon_code,
          _user_id: userId,
          _order_total: numAmount,
        });
        
        if (couponResult?.error) {
          return new Response(JSON.stringify({ error: couponResult.error }), {
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        if (couponResult?.success) {
          couponId = couponResult.coupon_id;
          discountAmount = couponResult.discount;
          numAmount = numAmount - discountAmount;
        }
      }

      console.log('Creating product payment:', { amount: numAmount, discount: discountAmount });

      const orderRes = await fetch(`${COINGATE_API}/orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${COINGATE_API_KEY}`,
          'Content-Type': 'application/json',
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
      console.log('CoinGate response:', responseText);

      if (!orderRes.ok) {
        console.error('CoinGate error:', responseText);
        return new Response(JSON.stringify({ error: 'Payment gateway error' }), {
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const orderData = JSON.parse(responseText);

      return new Response(JSON.stringify({
        id: orderData.id,
        status: orderData.status,
        payment_url: orderData.payment_url,
        coupon_id: couponId,
        discount_amount: discountAmount,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ============================================
    // CHECK ORDER STATUS
    // ============================================
    if (action === 'check') {
      if (!order_id) {
        return new Response(JSON.stringify({ error: 'Missing order_id' }), {
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const checkRes = await fetch(`${COINGATE_API}/orders/${order_id}`, {
        headers: { 'Authorization': `Token ${COINGATE_API_KEY}` },
      });

      const responseText = await checkRes.text();
      
      if (!checkRes.ok) {
        return new Response(JSON.stringify({ error: 'Check failed' }), {
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const checkData = JSON.parse(responseText);
      
      return new Response(JSON.stringify({
        id: checkData.id,
        status: checkData.status,
        price_amount: checkData.price_amount,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Invalid action
    return new Response(JSON.stringify({ error: 'Invalid action. Use: type=hosting or action=create/check' }), {
      status: 400, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Payment error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
