import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // معالجة طلب Preflight (OPTIONS) بشكل صحيح لحل مشكلة CORS
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

    const WEBEX_TOKEN = 'aky_39lE2225XnRrGIisf2Jp0jvYuzu';
    const WEBEX_API = 'https://api.webexinteract.com/v1/sms';

    console.log(`Sending OTP ${otp} to ${phone}`);

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
            phone: [phone]
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
        status: response.status,
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
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
