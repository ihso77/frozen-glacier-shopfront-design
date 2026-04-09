import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Paymento Secret Key for HMAC verification
const PAYMENTO_SECRET_KEY = 'MzE1NERFQjM3MzcyQUREMkEwOEI2ODJGODc4RjFFQzY=';

// Order Statuses from Paymento:
// 0 = Initialize - Payment request accepted
// 1 = Pending - User has chosen a coin
// 2 = PartialPaid - User paid less than order amount
// 3 = WaitingToConfirm - Transaction in mempool/block
// 4 = Timeout - Payment deadline expired
// 5 = UserCanceled - User clicked cancel
// 7 = Paid - Transaction confirmed
// 8 = Approve - Payment verified by store
// 9 = Reject - Payment not verified

const ORDER_STATUS_MAP: Record<number, string> = {
  0: 'initialized',
  1: 'pending',
  2: 'partial_paid',
  3: 'waiting_confirmation',
  4: 'timeout',
  5: 'cancelled',
  7: 'paid',
  8: 'approved',
  9: 'rejected'
};

const getSupabase = () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(supabaseUrl, supabaseKey);
};

// HMAC-SHA256 verification
async function verifyHMAC(payload: string, signature: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(payload);
  
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, messageData);
  const hashArray = Array.from(new Uint8Array(signatureBuffer));
  const calculatedSignature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  
  return calculatedSignature === signature.toUpperCase();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = getSupabase();
    
    // Get raw body for HMAC verification
    const rawBody = await req.text();
    const body = JSON.parse(rawBody);
    
    // Get HMAC signature from headers
    const hmacSignature = req.headers.get('X-HMAC-SHA256-SIGNATURE') || 
                          req.headers.get('HMAC_SHA256_SIGNATURE') ||
                          req.headers.get('x-hmac-sha256-signature');
    
    console.log('Received Paymento callback:', { body, hmacSignature });
    
    // Verify HMAC signature
    if (hmacSignature) {
      const isValid = await verifyHMAC(rawBody, hmacSignature, PAYMENTO_SECRET_KEY);
      if (!isValid) {
        console.error('Invalid HMAC signature');
        return new Response(JSON.stringify({ error: 'Invalid signature' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      console.log('HMAC signature verified successfully');
    } else {
      console.log('No HMAC signature provided, proceeding without verification');
    }

    const { Token, PaymentId, OrderId, OrderStatus, AdditionalData } = body;

    if (!OrderId) {
      return new Response(JSON.stringify({ error: 'Missing OrderId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const statusString = ORDER_STATUS_MAP[OrderStatus] || 'unknown';
    console.log(`Order ${OrderId} status: ${OrderStatus} (${statusString})`);

    // Update order in database
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: statusString,
        payment_id: PaymentId?.toString(),
        payment_token: Token,
        updated_at: new Date().toISOString()
      })
      .eq('id', OrderId);

    if (updateError) {
      console.error('Error updating order:', updateError);
      return new Response(JSON.stringify({ error: 'Failed to update order' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // If payment is successful (Paid = 7 or Approve = 8), handle order completion
    if (OrderStatus === 7 || OrderStatus === 8) {
      console.log(`Payment confirmed for order ${OrderId}`);
      
      // Get order details
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', OrderId)
        .single();

      if (!orderError && order) {
        // Create notification for user
        try {
          await supabase.from('notifications').insert({
            user_id: order.user_id,
            title: 'تم تأكيد الدفع ✅',
            message: `تم تأكيد دفع طلبك #${OrderId.substring(0, 8)}`,
            type: 'payment',
            read: false
          });
        } catch (e) {
          console.log('Could not create notification');
        }

        // Create order items if there are pending items
        try {
          const pendingOrder = localStorage.getItem('pending_order');
          if (pendingOrder) {
            const orderData = JSON.parse(pendingOrder);
            // Store order items in order_items table if it exists
          }
        } catch (e) {
          console.log('No pending order data');
        }
      }
    }

    // If payment failed or cancelled
    if (OrderStatus === 4 || OrderStatus === 5 || OrderStatus === 9) {
      console.log(`Payment failed for order ${OrderId}, status: ${statusString}`);
      
      // Get order details for notification
      const { data: order } = await supabase
        .from('orders')
        .select('user_id')
        .eq('id', OrderId)
        .single();

      if (order) {
        try {
          await supabase.from('notifications').insert({
            user_id: order.user_id,
            title: 'فشل الدفع ❌',
            message: `فشل دفع طلبك #${OrderId.substring(0, 8)} - الحالة: ${statusString}`,
            type: 'payment',
            read: false
          });
        } catch (e) {
          console.log('Could not create notification');
        }
      }
    }

    // Return success response
    return new Response(JSON.stringify({ 
      success: true,
      orderId: OrderId,
      status: statusString
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Callback Error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
