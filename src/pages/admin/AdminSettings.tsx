import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Save, AlertTriangle, Palette, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface SiteSettings {
  maintenance_mode: { enabled: boolean; message: string };
  site_theme: { primary_color: string; accent_color: string };
  site_info: { name: string; description: string };
}

const AdminSettings = () => {
  const [settings, setSettings] = useState<SiteSettings>({
    maintenance_mode: { enabled: false, message: "الموقع تحت الصيانة" },
    site_theme: { primary_color: "195 100% 50%", accent_color: "180 100% 45%" },
    site_info: { name: "فروزن", description: "متجر لبيع اليوزرات والاشتراكات" },
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data, error } = await supabase.from("site_settings").select("*");

    if (error) {
      console.error("Error fetching settings:", error);
    } else if (data) {
      const newSettings = { ...settings };
      data.forEach((item) => {
        if (item.key === "maintenance_mode") {
          newSettings.maintenance_mode = item.value as any;
        } else if (item.key === "site_theme") {
          newSettings.site_theme = item.value as any;
        } else if (item.key === "site_info") {
          newSettings.site_info = item.value as any;
        }
      });
      setSettings(newSettings);
    }
    setLoading(false);
  };

  const saveSettings = async () => {
    setSaving(true);

    const updates = [
      { key: "maintenance_mode", value: settings.maintenance_mode },
      { key: "site_theme", value: settings.site_theme },
      { key: "site_info", value: settings.site_info },
    ];

    for (const update of updates) {
      const { error } = await supabase
        .from("site_settings")
        .update({ value: update.value })
        .eq("key", update.key);

      if (error) {
        toast({ title: "خطأ", description: error.message, variant: "destructive" });
        setSaving(false);
        return;
      }
    }

    toast({ title: "تم الحفظ", description: "تم حفظ الإعدادات بنجاح" });
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
          <p className="text-muted-foreground">تخصيص إعدادات المتجر</p>
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
              <p className="text-sm text-muted-foreground">الاسم والوصف العام للموقع</p>
            </div>
          </div>

          <div className="grid gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                اسم الموقع
              </label>
              <input
                type="text"
                className="auth-input"
                value={settings.site_info.name}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    site_info: { ...settings.site_info, name: e.target.value },
                  })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                وصف الموقع
              </label>
              <textarea
                className="auth-input min-h-[80px]"
                value={settings.site_info.description}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    site_info: { ...settings.site_info, description: e.target.value },
                  })
                }
              />
            </div>
          </div>
        </div>

        {/* Theme Settings */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-aurora/10 flex items-center justify-center">
              <Palette className="w-5 h-5 text-aurora" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">الألوان والثيم</h2>
              <p className="text-sm text-muted-foreground">تخصيص ألوان الموقع</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                اللون الأساسي (HSL)
              </label>
              <input
                type="text"
                className="auth-input"
                placeholder="195 100% 50%"
                value={settings.site_theme.primary_color}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    site_theme: { ...settings.site_theme, primary_color: e.target.value },
                  })
                }
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                لون التمييز (HSL)
              </label>
              <input
                type="text"
                className="auth-input"
                placeholder="180 100% 45%"
                value={settings.site_theme.accent_color}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    site_theme: { ...settings.site_theme, accent_color: e.target.value },
                  })
                }
                dir="ltr"
              />
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
              <p className="text-sm text-muted-foreground">تفعيل وضع الصيانة لإيقاف الموقع مؤقتاً</p>
            </div>
          </div>

          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="w-5 h-5 rounded"
                checked={settings.maintenance_mode.enabled}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    maintenance_mode: { ...settings.maintenance_mode, enabled: e.target.checked },
                  })
                }
              />
              <span className="text-foreground font-medium">تفعيل وضع الصيانة</span>
            </label>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                رسالة الصيانة
              </label>
              <input
                type="text"
                className="auth-input"
                value={settings.maintenance_mode.message}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    maintenance_mode: { ...settings.maintenance_mode, message: e.target.value },
                  })
                }
              />
            </div>

            {settings.maintenance_mode.enabled && (
              <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
                <p className="text-destructive text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  تحذير: الموقع في وضع الصيانة ولن يظهر للزوار
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
