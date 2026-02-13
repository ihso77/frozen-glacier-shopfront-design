import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SYSTEM_PROMPT = `أنت مساعد ذكي لإدارة متجر "فروزن" الرقمي. لديك صلاحيات لتعديل إعدادات الموقع.

الأوامر المتاحة:
1. تفعيل/تعطيل وضع الصيانة: أرجع action: "toggle_maintenance" مع enabled: true/false
2. تغيير الثيم: أرجع action: "change_theme" مع preset (ice, ocean, sunset, forest, purple, gold, rose, neon)
3. تغيير معلومات الموقع: أرجع action: "update_info" مع name و/أو description
4. استعلام البيانات: أرجع action: "query" مع query_type (users_count, products_count, orders_count, recent_orders)

الثيمات المتاحة:
- ice (جليدي ❄️), ocean (محيطي 🌊), sunset (غروب 🌅), forest (غابة 🌲)
- purple (بنفسجي 💜), gold (ذهبي ✨), rose (وردي 🌸), neon (نيون ⚡)

قواعد:
- أجب بالعربية دائماً
- إذا كان الأمر يتطلب تعديل، أرجع JSON يحتوي على action
- إذا كان سؤالاً عادياً، أجب بشكل طبيعي
- أرجع الرد دائماً في حقل reply

عند تنفيذ أمر، أرجع:
{ "action": "نوع_الإجراء", "params": {...}, "reply": "وصف ما تم" }

عند الإجابة العادية:
{ "reply": "الإجابة" }`;

const THEME_PRESETS: Record<string, { primary: string; accent: string }> = {
  ice: { primary: "195 100% 50%", accent: "180 100% 45%" },
  ocean: { primary: "210 100% 50%", accent: "200 90% 55%" },
  sunset: { primary: "25 95% 55%", accent: "350 85% 55%" },
  forest: { primary: "150 80% 40%", accent: "170 70% 45%" },
  purple: { primary: "270 80% 55%", accent: "290 70% 50%" },
  gold: { primary: "45 90% 50%", accent: "35 85% 45%" },
  rose: { primary: "340 80% 55%", accent: "320 70% 50%" },
  neon: { primary: "160 100% 45%", accent: "130 100% 50%" },
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Not authenticated');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify admin
    const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await anonClient.auth.getUser(token);
    if (authError || !user) throw new Error('Not authenticated');

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!roleData || (roleData.role !== 'admin' && roleData.role !== 'owner')) {
      throw new Error('Not authorized');
    }

    const { message, history = [] } = await req.json();

    // Get context data
    const [usersRes, productsRes, ordersRes] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('products').select('*', { count: 'exact', head: true }),
      supabase.from('orders').select('*', { count: 'exact', head: true }),
    ]);

    const contextInfo = `
معلومات حالية:
- عدد المستخدمين: ${usersRes.count || 0}
- عدد المنتجات: ${productsRes.count || 0}
- عدد الطلبات: ${ordersRes.count || 0}
`;

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT + contextInfo },
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
        max_tokens: 1000,
        temperature: 0.5,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('AI error:', errText);
      throw new Error(`AI error: ${response.status}`);
    }

    const aiData = await response.json();
    const aiReply = aiData.choices?.[0]?.message?.content || '';

    // Try to parse action from reply
    let result: any = { reply: aiReply };
    try {
      const jsonMatch = aiReply.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.action) {
          result = parsed;
          // Execute the action
          if (parsed.action === 'toggle_maintenance') {
            const enabled = parsed.params?.enabled ?? parsed.enabled ?? true;
            const msg = parsed.params?.message || 'الموقع تحت الصيانة حالياً، سنعود قريباً!';
            await supabase.from('site_settings').update({
              value: { enabled, message: msg } as any,
            }).eq('key', 'maintenance_mode');
            result.action_description = enabled ? 'تم تفعيل وضع الصيانة' : 'تم تعطيل وضع الصيانة';
          } else if (parsed.action === 'change_theme') {
            const preset = parsed.params?.preset || parsed.preset;
            if (preset && THEME_PRESETS[preset]) {
              const theme = THEME_PRESETS[preset];
              await supabase.from('site_settings').update({
                value: { primary_color: theme.primary, accent_color: theme.accent, preset } as any,
              }).eq('key', 'site_theme');
              result.action_description = `تم تغيير الثيم إلى ${preset}`;
            }
          } else if (parsed.action === 'update_info') {
            const { data: current } = await supabase.from('site_settings').select('value').eq('key', 'site_info').maybeSingle();
            const currentValue = (current?.value as any) || {};
            const newValue = {
              name: parsed.params?.name || currentValue.name || 'فروزن',
              description: parsed.params?.description || currentValue.description || '',
            };
            await supabase.from('site_settings').update({ value: newValue as any }).eq('key', 'site_info');
            result.action_description = 'تم تحديث معلومات الموقع';
          }
        }
      }
    } catch {
      // Not JSON, just a text reply
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Admin AI error:', msg);
    return new Response(JSON.stringify({ reply: `عذراً، حدث خطأ: ${msg}` }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
