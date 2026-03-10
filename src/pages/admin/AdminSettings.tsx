import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Save, AlertTriangle, Palette, Info, Check, Globe, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { THEME_PRESETS } from "@/hooks/useSiteSettings";

interface SiteSettings {
  maintenance_mode: { enabled: boolean; message: string };
  site_theme: { primary_color: string; accent_color: string; preset?: string };
  site_info: { name: string; description: string };
  site_features: {
    snow_effect: boolean;
    support_widget: boolean;
    show_badges: boolean;
    show_original_price: boolean;
    rtl: boolean;
    currency: string;
  };
  site_seo: {
    meta_title: string;
    meta_description: string;
    keywords: string;
  };
}

const defaultFeatures = {
  snow_effect: true,
  support_widget: true,
  show_badges: true,
  show_original_price: true,
  rtl: true,
  currency: "ر.ع",
};

const defaultSeo = {
  meta_title: "",
  meta_description: "",
  keywords: "",
};

const AdminSettings = () => {
  const [settings, setSettings] = useState<SiteSettings>({
    maintenance_mode: { enabled: false, message: "الموقع تحت الصيانة حالياً، سنعود قريباً!" },
    site_theme: { primary_color: "270 80% 65%", accent_color: "290 70% 60%", preset: "purple" },
    site_info: { name: "Nova Store", description: "متجر لبيع اليوزرات والاشتراكات" },
    site_features: defaultFeatures,
    site_seo: defaultSeo,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("info");
  const { toast } = useToast();

  useEffect(() => { fetchSettings(); }, []);

  const fetchSettings = async () => {
    const { data } = await supabase.from("site_settings").select("*");
    if (data) {
      const ns = { ...settings };
      data.forEach((item) => {
        if (item.key === "maintenance_mode") ns.maintenance_mode = item.value as any;
        else if (item.key === "site_theme") ns.site_theme = item.value as any;
        else if (item.key === "site_info") ns.site_info = item.value as any;
        else if (item.key === "site_features") ns.site_features = { ...defaultFeatures, ...(item.value as any) };
        else if (item.key === "site_seo") ns.site_seo = { ...defaultSeo, ...(item.value as any) };
      });
      setSettings(ns);
    }
    setLoading(false);
  };

  const selectPreset = (presetKey: string) => {
    const preset = THEME_PRESETS[presetKey];
    if (preset) {
      setSettings({ ...settings, site_theme: { primary_color: preset.primary, accent_color: preset.accent, preset: presetKey } });
      document.documentElement.style.setProperty("--primary", preset.primary);
      document.documentElement.style.setProperty("--accent", preset.accent);
      document.documentElement.style.setProperty("--ring", preset.primary);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    const updates = [
      { key: "maintenance_mode", value: settings.maintenance_mode },
      { key: "site_theme", value: settings.site_theme },
      { key: "site_info", value: settings.site_info },
      { key: "site_features", value: settings.site_features },
      { key: "site_seo", value: settings.site_seo },
    ];

    for (const update of updates) {
      const { data: existing } = await supabase.from("site_settings").select("id").eq("key", update.key).maybeSingle();
      if (existing) {
        const { error } = await supabase.from("site_settings").update({ value: update.value as any }).eq("key", update.key);
        if (error) { toast({ title: "خطأ", description: error.message, variant: "destructive" }); setSaving(false); return; }
      } else {
        const { error } = await supabase.from("site_settings").insert({ key: update.key, value: update.value as any });
        if (error) { toast({ title: "خطأ", description: error.message, variant: "destructive" }); setSaving(false); return; }
      }
    }
    toast({ title: "تم الحفظ ✅", description: "تم تطبيق الإعدادات على الموقع فوراً" });
    setSaving(false);
  };

  if (loading) {
    return <div className="animate-pulse space-y-4"><div className="h-8 bg-secondary rounded w-48" /><div className="h-64 bg-secondary rounded-2xl" /></div>;
  }

  const tabItems = [
    { id: "info", label: "معلومات الموقع", icon: Info },
    { id: "theme", label: "الثيم", icon: Palette },
    { id: "features", label: "الميزات", icon: Bell },
    { id: "seo", label: "SEO", icon: Globe },
    { id: "maintenance", label: "الصيانة", icon: AlertTriangle },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2">إعدادات الموقع</h1>
          <p className="text-muted-foreground">تخصيص إعدادات المتجر - التغييرات تُطبق فوراً</p>
        </div>
        <Button onClick={saveSettings} disabled={saving} className="gap-2">
          <Save className="w-4 h-4" />
          {saving ? "جاري الحفظ..." : "حفظ الإعدادات"}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabItems.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab.id ? "bg-primary/10 text-primary border border-primary/30" : "text-muted-foreground hover:bg-secondary/50"
            }`}>
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Info Tab */}
      {activeTab === "info" && (
        <div className="glass-card p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">اسم الموقع</label>
            <input className="auth-input" value={settings.site_info.name}
              onChange={(e) => setSettings({ ...settings, site_info: { ...settings.site_info, name: e.target.value } })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">وصف الموقع</label>
            <textarea className="auth-input min-h-[80px]" value={settings.site_info.description}
              onChange={(e) => setSettings({ ...settings, site_info: { ...settings.site_info, description: e.target.value } })} />
          </div>
        </div>
      )}

      {/* Theme Tab */}
      {activeTab === "theme" && (
        <div className="glass-card p-6">
          <h3 className="font-semibold text-foreground mb-4">اختر ثيم جاهز</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {Object.entries(THEME_PRESETS).map(([key, preset]) => {
              const isActive = settings.site_theme.preset === key;
              return (
                <button key={key} onClick={() => selectPreset(key)}
                  className={`relative p-4 rounded-xl border transition-all duration-300 text-center ${
                    isActive ? "border-primary bg-primary/10 shadow-lg shadow-primary/10" : "border-border hover:border-primary/30 hover:bg-secondary/30"
                  }`}>
                  {isActive && <div className="absolute top-2 left-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center"><Check className="w-3 h-3 text-primary-foreground" /></div>}
                  <span className="text-2xl block mb-2">{preset.emoji}</span>
                  <span className="text-sm font-medium text-foreground">{preset.name}</span>
                  <div className="flex items-center justify-center gap-1 mt-2">
                    <div className="w-4 h-4 rounded-full" style={{ background: `hsl(${preset.primary})` }} />
                    <div className="w-4 h-4 rounded-full" style={{ background: `hsl(${preset.accent})` }} />
                  </div>
                </button>
              );
            })}
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">اللون الأساسي (HSL)</label>
              <div className="flex items-center gap-3">
                <input className="auth-input flex-1" value={settings.site_theme.primary_color} dir="ltr"
                  onChange={(e) => setSettings({ ...settings, site_theme: { ...settings.site_theme, primary_color: e.target.value, preset: undefined } })} />
                <div className="w-10 h-10 rounded-lg border border-border shrink-0" style={{ background: `hsl(${settings.site_theme.primary_color})` }} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">لون التمييز (HSL)</label>
              <div className="flex items-center gap-3">
                <input className="auth-input flex-1" value={settings.site_theme.accent_color} dir="ltr"
                  onChange={(e) => setSettings({ ...settings, site_theme: { ...settings.site_theme, accent_color: e.target.value, preset: undefined } })} />
                <div className="w-10 h-10 rounded-lg border border-border shrink-0" style={{ background: `hsl(${settings.site_theme.accent_color})` }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Features Tab */}
      {activeTab === "features" && (
        <div className="glass-card p-6 space-y-4">
          <h3 className="font-semibold text-foreground mb-2">ميزات الموقع</h3>
          {[
            { key: "snow_effect", label: "تأثير الثلج ❄️", desc: "عرض رقاقات الثلج المتساقطة على الموقع" },
            { key: "support_widget", label: "ويدجت الدعم 💬", desc: "عرض زر الدعم الفني للزوار" },
            { key: "show_badges", label: "شارات المنتجات 🏷️", desc: "عرض شارات مثل 'جديد' و'خصم' على المنتجات" },
            { key: "show_original_price", label: "السعر الأصلي 💰", desc: "عرض السعر قبل الخصم مشطوب" },
            { key: "rtl", label: "اتجاه RTL 📝", desc: "عرض الموقع من اليمين لليسار" },
          ].map((feature) => (
            <label key={feature.key} className="flex items-center justify-between p-4 bg-secondary/30 border border-border/50 rounded-xl cursor-pointer hover:border-primary/30 transition-all">
              <div>
                <p className="text-foreground font-medium">{feature.label}</p>
                <p className="text-xs text-muted-foreground">{feature.desc}</p>
              </div>
              <input type="checkbox" className="w-5 h-5 rounded accent-primary"
                checked={(settings.site_features as any)[feature.key] ?? true}
                onChange={(e) => setSettings({ ...settings, site_features: { ...settings.site_features, [feature.key]: e.target.checked } })} />
            </label>
          ))}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">العملة</label>
            <input className="auth-input w-32" value={settings.site_features.currency}
              onChange={(e) => setSettings({ ...settings, site_features: { ...settings.site_features, currency: e.target.value } })} />
          </div>
        </div>
      )}

      {/* SEO Tab */}
      {activeTab === "seo" && (
        <div className="glass-card p-6 space-y-4">
          <h3 className="font-semibold text-foreground mb-2">تحسين محركات البحث (SEO)</h3>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">عنوان الصفحة (Meta Title)</label>
            <input className="auth-input" value={settings.site_seo.meta_title} placeholder={settings.site_info.name}
              onChange={(e) => setSettings({ ...settings, site_seo: { ...settings.site_seo, meta_title: e.target.value } })} />
            <p className="text-xs text-muted-foreground mt-1">{(settings.site_seo.meta_title || settings.site_info.name).length}/60 حرف</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">وصف الصفحة (Meta Description)</label>
            <textarea className="auth-input min-h-[80px]" value={settings.site_seo.meta_description} placeholder={settings.site_info.description}
              onChange={(e) => setSettings({ ...settings, site_seo: { ...settings.site_seo, meta_description: e.target.value } })} />
            <p className="text-xs text-muted-foreground mt-1">{(settings.site_seo.meta_description || settings.site_info.description).length}/160 حرف</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">الكلمات المفتاحية</label>
            <input className="auth-input" value={settings.site_seo.keywords} placeholder="متجر, رقمي, اشتراكات"
              onChange={(e) => setSettings({ ...settings, site_seo: { ...settings.site_seo, keywords: e.target.value } })} />
          </div>
        </div>
      )}

      {/* Maintenance Tab */}
      {activeTab === "maintenance" && (
        <div className="glass-card p-6 space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" className="w-5 h-5 rounded"
              checked={settings.maintenance_mode.enabled}
              onChange={(e) => setSettings({ ...settings, maintenance_mode: { ...settings.maintenance_mode, enabled: e.target.checked } })} />
            <span className="text-foreground font-medium">تفعيل وضع الصيانة</span>
          </label>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">رسالة الصيانة</label>
            <input className="auth-input" value={settings.maintenance_mode.message}
              onChange={(e) => setSettings({ ...settings, maintenance_mode: { ...settings.maintenance_mode, message: e.target.value } })} />
          </div>
          {settings.maintenance_mode.enabled && (
            <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
              <p className="text-destructive text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                تحذير: عند الحفظ، الموقع سيُغلق أمام الزوار فوراً (الأدمن يستمر بالوصول)
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminSettings;
