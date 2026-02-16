import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { phone, otp } = await req.json();

    if (!phone || !otp) {
      return new Response(JSON.stringify({ error: 'Phone and OTP are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // تنظيف رقم الجوال: إزالة أي مسافات أو رموز غير رقمية (ما عدا +)
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');

    const WEBEX_TOKEN = 'aky_39lE2225XnRrGIisf2Jp0jvYuzu';
    const WEBEX_API = 'https://api.webexinteract.com/v1/sms';

    console.log(`Attempting to send OTP ${otp} to ${cleanPhone}`);

    const response = await fetch(WEBEX_API, {
      method: 'POST',
      headers: {
        'X-AUTH-KEY': WEBEX_TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message_body: `رمز التحقق الخاص بك في متجر فروزن هو: ${otp}`,
        from: 'FrozenStore',
        to: [
          {
            phone: [cleanPhone]
          }
        ]
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Webex API error:', result);
      return new Response(JSON.stringify({ 
        error: 'Failed to send SMS via provider', 
        details: result 
      }), {
        status: 200, // نرجع 200 حتى لا يسبب مشاكل في الـ Fetch بالفرونت إند، لكن مع رسالة خطأ
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Function error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 200, // نرجع 200 لضمان وصول رسالة الخطأ للفرونت إند
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
