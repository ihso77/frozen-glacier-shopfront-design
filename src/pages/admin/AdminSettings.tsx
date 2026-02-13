import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Save, AlertTriangle, Palette, Info, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { THEME_PRESETS } from "@/hooks/useSiteSettings";

interface SiteSettings {
  maintenance_mode: { enabled: boolean; message: string };
  site_theme: { primary_color: string; accent_color: string; preset?: string };
  site_info: { name: string; description: string };
}

const AdminSettings = () => {
  const [settings, setSettings] = useState<SiteSettings>({
    maintenance_mode: { enabled: false, message: "الموقع تحت الصيانة حالياً، سنعود قريباً!" },
    site_theme: { primary_color: "195 100% 50%", accent_color: "180 100% 45%", preset: "ice" },
    site_info: { name: "فروزن", description: "متجر لبيع اليوزرات والاشتراكات" },
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data } = await supabase.from("site_settings").select("*");
    if (data) {
      const newSettings = { ...settings };
      data.forEach((item) => {
        if (item.key === "maintenance_mode") newSettings.maintenance_mode = item.value as any;
        else if (item.key === "site_theme") newSettings.site_theme = item.value as any;
        else if (item.key === "site_info") newSettings.site_info = item.value as any;
      });
      setSettings(newSettings);
    }
    setLoading(false);
  };

  const selectPreset = (presetKey: string) => {
    const preset = THEME_PRESETS[presetKey];
    if (preset) {
      setSettings({
        ...settings,
        site_theme: { primary_color: preset.primary, accent_color: preset.accent, preset: presetKey },
      });
      // Live preview
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
    ];

    for (const update of updates) {
      const { data: existing } = await supabase
        .from("site_settings")
        .select("id")
        .eq("key", update.key)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("site_settings")
          .update({ value: update.value as any })
          .eq("key", update.key);
        if (error) {
          toast({ title: "خطأ", description: error.message, variant: "destructive" });
          setSaving(false);
          return;
        }
      } else {
        const { error } = await supabase
          .from("site_settings")
          .insert({ key: update.key, value: update.value as any });
        if (error) {
          toast({ title: "خطأ", description: error.message, variant: "destructive" });
          setSaving(false);
          return;
        }
      }
    }

    toast({ title: "تم الحفظ ✅", description: "تم تطبيق الإعدادات على الموقع فوراً" });
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-secondary rounded w-48" />
        <div className="h-64 bg-secondary rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2">إعدادات الموقع</h1>
          <p className="text-muted-foreground">تخصيص إعدادات المتجر - التغييرات تُطبق فوراً</p>
        </div>
        <Button onClick={saveSettings} disabled={saving} className="gap-2">
          <Save className="w-4 h-4" />
          {saving ? "جاري الحفظ..." : "حفظ الإعدادات"}
        </Button>
      </div>

      <div className="grid gap-6">
        {/* Site Info */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Info className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">معلومات الموقع</h2>
              <p className="text-sm text-muted-foreground">الاسم والوصف العام</p>
            </div>
          </div>
          <div className="grid gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">اسم الموقع</label>
              <input
                type="text"
                className="auth-input"
                value={settings.site_info.name}
                onChange={(e) => setSettings({ ...settings, site_info: { ...settings.site_info, name: e.target.value } })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">وصف الموقع</label>
              <textarea
                className="auth-input min-h-[80px]"
                value={settings.site_info.description}
                onChange={(e) => setSettings({ ...settings, site_info: { ...settings.site_info, description: e.target.value } })}
              />
            </div>
          </div>
        </div>

        {/* Theme Presets */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
              <Palette className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">ثيم الموقع</h2>
              <p className="text-sm text-muted-foreground">اختر ثيم جاهز أو خصص الألوان يدوياً</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {Object.entries(THEME_PRESETS).map(([key, preset]) => {
              const isActive = settings.site_theme.preset === key;
              return (
                <button
                  key={key}
                  onClick={() => selectPreset(key)}
                  className={`relative p-4 rounded-xl border transition-all duration-300 text-center group ${
                    isActive
                      ? "border-primary bg-primary/10 shadow-lg shadow-primary/10"
                      : "border-border hover:border-primary/30 hover:bg-secondary/30"
                  }`}
                >
                  {isActive && (
                    <div className="absolute top-2 left-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-3 h-3 text-primary-foreground" />
                    </div>
                  )}
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
                <input
                  type="text"
                  className="auth-input flex-1"
                  placeholder="195 100% 50%"
                  value={settings.site_theme.primary_color}
                  onChange={(e) => setSettings({ ...settings, site_theme: { ...settings.site_theme, primary_color: e.target.value, preset: undefined } })}
                  dir="ltr"
                />
                <div className="w-10 h-10 rounded-lg border border-border shrink-0" style={{ background: `hsl(${settings.site_theme.primary_color})` }} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">لون التمييز (HSL)</label>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  className="auth-input flex-1"
                  placeholder="180 100% 45%"
                  value={settings.site_theme.accent_color}
                  onChange={(e) => setSettings({ ...settings, site_theme: { ...settings.site_theme, accent_color: e.target.value, preset: undefined } })}
                  dir="ltr"
                />
                <div className="w-10 h-10 rounded-lg border border-border shrink-0" style={{ background: `hsl(${settings.site_theme.accent_color})` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Maintenance Mode */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">وضع الصيانة</h2>
              <p className="text-sm text-muted-foreground">عند التفعيل، لن يرى الزوار المتجر بل صفحة الصيانة فقط</p>
            </div>
          </div>

          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="w-5 h-5 rounded"
                checked={settings.maintenance_mode.enabled}
                onChange={(e) => setSettings({ ...settings, maintenance_mode: { ...settings.maintenance_mode, enabled: e.target.checked } })}
              />
              <span className="text-foreground font-medium">تفعيل وضع الصيانة</span>
            </label>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">رسالة الصيانة</label>
              <input
                type="text"
                className="auth-input"
                value={settings.maintenance_mode.message}
                onChange={(e) => setSettings({ ...settings, maintenance_mode: { ...settings.maintenance_mode, message: e.target.value } })}
              />
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
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
