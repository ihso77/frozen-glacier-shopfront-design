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
    const { phone, otp } = await req.json();

    if (!phone || !otp) {
      throw new Error('Phone and OTP are required');
    }

    const WEBEX_TOKEN = 'aky_39lE2225XnRrGIisf2Jp0jvYuzu';
    const WEBEX_API = 'https://api.webexinteract.com/v1/sms';

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
      throw new Error(result.message || 'Failed to send SMS');
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
