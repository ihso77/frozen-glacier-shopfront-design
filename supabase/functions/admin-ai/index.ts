import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

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

const SYSTEM_PROMPT = `أنت مساعد ذكي متقدم لإدارة متجر "فروزن" الرقمي. لديك صلاحيات المالك الكاملة للموقع.

## صلاحياتك:
1. **إدارة الموقع**: تغيير الثيم، تفعيل/تعطيل الصيانة، تعديل معلومات الموقع
2. **إدارة المنتجات**: إضافة/تعديل/حذف منتجات، تغيير الأسعار، تفعيل/تعطيل منتجات
3. **إدارة المستخدمين**: عرض المستخدمين، تغيير أدوارهم (owner/admin/member/customer/vip_customer)
4. **إدارة الطلبات**: عرض الطلبات، تحديث حالتها
5. **الإحصائيات**: عرض إحصائيات شاملة عن الموقع
6. **إدارة الأقسام**: إضافة/تعديل/حذف أقسام المنتجات
7. **إعدادات الموقع**: تعديل أي إعداد في الموقع

## الأوامر المتاحة (أرجع JSON):
- toggle_maintenance: { enabled: bool, message?: string }
- change_theme: { preset: "ice"|"ocean"|"sunset"|"forest"|"purple"|"gold"|"rose"|"neon" }
- update_info: { name?: string, description?: string }
- add_product: { name, price, description?, category_id?, image_url?, original_price?, badge?, stock? }
- update_product: { id, name?, price?, description?, is_active?, stock?, badge?, image_url? }
- delete_product: { id }
- add_category: { name, description?, icon? }
- update_category: { id, name?, description?, is_active? }
- update_user_role: { user_id, role: "owner"|"admin"|"member"|"customer"|"vip_customer" }
- query_stats: { type: "overview"|"revenue"|"top_products"|"recent_orders"|"users_list" }
- update_order: { id, payment_status?, is_redeemed? }

## الثيمات:
ice (جليدي ❄️), ocean (محيطي 🌊), sunset (غروب 🌅), forest (غابة 🌲), purple (بنفسجي 💜), gold (ذهبي ✨), rose (وردي 🌸), neon (نيون ⚡)

## الأدوار:
- owner = المالك (صاحب الموقع)
- admin = المدير (إداري)
- member = عضو
- customer = عميل (مشتري)
- vip_customer = عميل VIP (أكثر من 10 مشتريات)

## قواعد:
- أجب بالعربية دائماً
- عند تنفيذ أمر: { "action": "نوع", "params": {...}, "reply": "وصف" }
- عند الإجابة العادية: { "reply": "الإجابة" }
- كن ودوداً ومحترفاً
- إذا طلب المستخدم شيئاً خارج صلاحياتك، اعتذر واشرح ما يمكنك فعله`;

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

    // Get comprehensive context
    const [usersRes, productsRes, ordersRes, categoriesRes, recentOrdersRes, settingsRes] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('products').select('*', { count: 'exact' }),
      supabase.from('orders').select('*', { count: 'exact' }),
      supabase.from('categories').select('*'),
      supabase.from('orders').select('*, product:products(name)').order('created_at', { ascending: false }).limit(5),
      supabase.from('site_settings').select('*'),
    ]);

    // Calculate revenue
    const totalRevenue = ordersRes.data?.reduce((sum: number, o: any) => sum + (o.price || 0), 0) || 0;
    const activeProducts = productsRes.data?.filter((p: any) => p.is_active)?.length || 0;

    const contextInfo = `
## معلومات الموقع الحالية:
- عدد المستخدمين: ${usersRes.count || 0}
- عدد المنتجات: ${productsRes.count || 0} (${activeProducts} نشط)
- عدد الطلبات: ${ordersRes.count || 0}
- إجمالي الإيرادات: ${totalRevenue.toFixed(2)} ر.ع
- الأقسام: ${categoriesRes.data?.map((c: any) => c.name).join(', ') || 'لا يوجد'}

## آخر 5 طلبات:
${recentOrdersRes.data?.map((o: any) => `- ${o.product_name} | ${o.price} ر.ع | ${o.payment_status} | ${new Date(o.created_at).toLocaleDateString('ar-SA')}`).join('\n') || 'لا يوجد طلبات'}

## الإعدادات الحالية:
${settingsRes.data?.map((s: any) => `- ${s.key}: ${JSON.stringify(s.value)}`).join('\n') || 'لا يوجد إعدادات'}

## المنتجات:
${productsRes.data?.slice(0, 10).map((p: any) => `- ${p.name} | ${p.price} ر.ع | ${p.is_active ? 'نشط' : 'معطل'} | المخزون: ${p.stock ?? 'غير محدد'}`).join('\n') || 'لا يوجد'}
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
        max_tokens: 2000,
        temperature: 0.4,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ reply: '⚠️ تم تجاوز حد الطلبات، حاول بعد قليل.' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ reply: '⚠️ الرصيد غير كافي، يرجى إضافة رصيد.' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI error: ${response.status}`);
    }

    const aiData = await response.json();
    const aiReply = aiData.choices?.[0]?.message?.content || '';

    let result: any = { reply: aiReply };
    try {
      const jsonMatch = aiReply.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.action) {
          result = parsed;
          const params = parsed.params || parsed;

          switch (parsed.action) {
            case 'toggle_maintenance': {
              const enabled = params.enabled ?? true;
              const msg = params.message || 'الموقع تحت الصيانة حالياً، سنعود قريباً!';
              const { data: existing } = await supabase.from('site_settings').select('id').eq('key', 'maintenance_mode').maybeSingle();
              if (existing) {
                await supabase.from('site_settings').update({ value: { enabled, message: msg } as any }).eq('key', 'maintenance_mode');
              } else {
                await supabase.from('site_settings').insert({ key: 'maintenance_mode', value: { enabled, message: msg } as any });
              }
              result.action_description = enabled ? '✅ تم تفعيل وضع الصيانة' : '✅ تم تعطيل وضع الصيانة';
              break;
            }
            case 'change_theme': {
              const preset = params.preset;
              if (preset && THEME_PRESETS[preset]) {
                const theme = THEME_PRESETS[preset];
                const { data: existing } = await supabase.from('site_settings').select('id').eq('key', 'site_theme').maybeSingle();
                if (existing) {
                  await supabase.from('site_settings').update({ value: { primary_color: theme.primary, accent_color: theme.accent, preset } as any }).eq('key', 'site_theme');
                } else {
                  await supabase.from('site_settings').insert({ key: 'site_theme', value: { primary_color: theme.primary, accent_color: theme.accent, preset } as any });
                }
                result.action_description = `✅ تم تغيير الثيم إلى ${preset}`;
              }
              break;
            }
            case 'update_info': {
              const { data: current } = await supabase.from('site_settings').select('value').eq('key', 'site_info').maybeSingle();
              const cv = (current?.value as any) || {};
              const newVal = { name: params.name || cv.name || 'فروزن', description: params.description || cv.description || '' };
              const { data: existing } = await supabase.from('site_settings').select('id').eq('key', 'site_info').maybeSingle();
              if (existing) {
                await supabase.from('site_settings').update({ value: newVal as any }).eq('key', 'site_info');
              } else {
                await supabase.from('site_settings').insert({ key: 'site_info', value: newVal as any });
              }
              result.action_description = '✅ تم تحديث معلومات الموقع';
              break;
            }
            case 'add_product': {
              const { error } = await supabase.from('products').insert({
                name: params.name,
                price: params.price,
                description: params.description || null,
                category_id: params.category_id || null,
                image_url: params.image_url || null,
                original_price: params.original_price || null,
                badge: params.badge || null,
                stock: params.stock ?? 0,
                is_active: true,
              });
              result.action_description = error ? `❌ خطأ: ${error.message}` : `✅ تمت إضافة المنتج "${params.name}"`;
              break;
            }
            case 'update_product': {
              const updateData: any = {};
              if (params.name) updateData.name = params.name;
              if (params.price !== undefined) updateData.price = params.price;
              if (params.description !== undefined) updateData.description = params.description;
              if (params.is_active !== undefined) updateData.is_active = params.is_active;
              if (params.stock !== undefined) updateData.stock = params.stock;
              if (params.badge !== undefined) updateData.badge = params.badge;
              if (params.image_url !== undefined) updateData.image_url = params.image_url;
              if (params.original_price !== undefined) updateData.original_price = params.original_price;
              const { error } = await supabase.from('products').update(updateData).eq('id', params.id);
              result.action_description = error ? `❌ خطأ: ${error.message}` : '✅ تم تحديث المنتج';
              break;
            }
            case 'delete_product': {
              const { error } = await supabase.from('products').update({ is_active: false }).eq('id', params.id);
              result.action_description = error ? `❌ خطأ: ${error.message}` : '✅ تم حذف المنتج (تعطيل)';
              break;
            }
            case 'add_category': {
              const { error } = await supabase.from('categories').insert({
                name: params.name,
                description: params.description || null,
                icon: params.icon || null,
                is_active: true,
              });
              result.action_description = error ? `❌ خطأ: ${error.message}` : `✅ تمت إضافة القسم "${params.name}"`;
              break;
            }
            case 'update_category': {
              const updateData: any = {};
              if (params.name) updateData.name = params.name;
              if (params.description !== undefined) updateData.description = params.description;
              if (params.is_active !== undefined) updateData.is_active = params.is_active;
              const { error } = await supabase.from('categories').update(updateData).eq('id', params.id);
              result.action_description = error ? `❌ خطأ: ${error.message}` : '✅ تم تحديث القسم';
              break;
            }
            case 'update_user_role': {
              const { data: existingRole } = await supabase.from('user_roles').select('id').eq('user_id', params.user_id).maybeSingle();
              if (existingRole) {
                await supabase.from('user_roles').update({ role: params.role }).eq('user_id', params.user_id);
              } else {
                await supabase.from('user_roles').insert({ user_id: params.user_id, role: params.role });
              }
              result.action_description = `✅ تم تحديث دور المستخدم إلى ${params.role}`;
              break;
            }
            case 'query_stats': {
              // Already included in context, just let AI answer
              result.action_description = '📊 تم عرض الإحصائيات';
              break;
            }
            case 'update_order': {
              const updateData: any = {};
              if (params.payment_status) updateData.payment_status = params.payment_status;
              if (params.is_redeemed !== undefined) updateData.is_redeemed = params.is_redeemed;
              const { error } = await supabase.from('orders').update(updateData).eq('id', params.id);
              result.action_description = error ? `❌ خطأ: ${error.message}` : '✅ تم تحديث الطلب';
              break;
            }
          }
        }
      }
    } catch {
      // Not JSON, text reply
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
