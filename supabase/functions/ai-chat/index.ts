import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SYSTEM_PROMPT = `أنت مساعد ذكي لمتجر "فروزن" - متجر رقمي لبيع اليوزرات والاشتراكات الرقمية.

معلومات عن المتجر:
- متجر فروزن يبيع يوزرات وحسابات رقمية واشتراكات
- يدعم الدفع عبر البطاقة و PayPal
- كل عملية شراء تنتج كود استرداد فريد
- يوجد نظام تذاكر دعم فني للمساعدة

قواعد:
- أجب دائماً باللغة العربية
- كن مهذباً وودوداً ومختصراً
- إذا كان السؤال عن مشكلة تقنية معقدة، اقترح فتح تذكرة دعم فني
- لا تشارك معلومات حساسة أو أسعار محددة إلا إذا كانت متاحة
- ساعد المستخدمين في الأسئلة الشائعة عن الموقع والشراء والدعم`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const { message, history = [] } = await req.json();

    if (!message || typeof message !== 'string' || message.length > 2000) {
      throw new Error('Invalid message');
    }

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history.slice(-10).map((m: any) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: String(m.content).substring(0, 2000),
      })),
      { role: 'user', content: message },
    ];

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages,
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('AI API error:', errText);
      throw new Error(`AI service error: ${response.status}`);
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || 'عذراً، لم أتمكن من الرد. حاول مرة أخرى.';

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('AI chat error:', errorMessage);
    return new Response(JSON.stringify({ 
      reply: 'عذراً، حدث خطأ. يرجى المحاولة مرة أخرى لاحقاً.' 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
