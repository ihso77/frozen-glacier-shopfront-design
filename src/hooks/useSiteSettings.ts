import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SiteTheme {
  primary_color: string;
  accent_color: string;
  preset?: string;
}

export interface MaintenanceMode {
  enabled: boolean;
  message: string;
}

export interface SiteInfo {
  name: string;
  description: string;
}

export interface SiteSettingsData {
  maintenance_mode: MaintenanceMode;
  site_theme: SiteTheme;
  site_info: SiteInfo;
}

const defaultSettings: SiteSettingsData = {
  maintenance_mode: { enabled: false, message: "الموقع تحت الصيانة حالياً، سنعود قريباً!" },
  site_theme: { primary_color: "195 100% 50%", accent_color: "180 100% 45%", preset: "ice" },
  site_info: { name: "فروزن", description: "متجر لبيع اليوزرات والاشتراكات" },
};

export const useSiteSettings = () => {
  const [settings, setSettings] = useState<SiteSettingsData>(defaultSettings);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    const { data } = await supabase.from("site_settings").select("*");
    if (data) {
      const newSettings = { ...defaultSettings };
      data.forEach((item) => {
        if (item.key === "maintenance_mode") newSettings.maintenance_mode = item.value as any;
        else if (item.key === "site_theme") newSettings.site_theme = item.value as any;
        else if (item.key === "site_info") newSettings.site_info = item.value as any;
      });
      setSettings(newSettings);
      applyTheme(newSettings.site_theme);
    }
    setLoading(false);
  };

  const applyTheme = (theme: SiteTheme) => {
    document.documentElement.style.setProperty("--primary", theme.primary_color);
    document.documentElement.style.setProperty("--accent", theme.accent_color);
    document.documentElement.style.setProperty("--ring", theme.primary_color);
    document.documentElement.style.setProperty("--sidebar-primary", theme.primary_color);
    document.documentElement.style.setProperty("--sidebar-ring", theme.primary_color);
  };

  useEffect(() => {
    fetchSettings();
    // Listen for settings changes
    const channel = supabase
      .channel("site-settings-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "site_settings" }, () => fetchSettings())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  return { settings, loading, refetch: fetchSettings };
};

export const THEME_PRESETS: Record<string, { name: string; primary: string; accent: string; emoji: string }> = {
  ice: { name: "جليدي", primary: "195 100% 50%", accent: "180 100% 45%", emoji: "❄️" },
  ocean: { name: "محيطي", primary: "210 100% 50%", accent: "200 90% 55%", emoji: "🌊" },
  sunset: { name: "غروب", primary: "25 95% 55%", accent: "350 85% 55%", emoji: "🌅" },
  forest: { name: "غابة", primary: "150 80% 40%", accent: "170 70% 45%", emoji: "🌲" },
  purple: { name: "بنفسجي", primary: "270 80% 55%", accent: "290 70% 50%", emoji: "💜" },
  gold: { name: "ذهبي", primary: "45 90% 50%", accent: "35 85% 45%", emoji: "✨" },
  rose: { name: "وردي", primary: "340 80% 55%", accent: "320 70% 50%", emoji: "🌸" },
  neon: { name: "نيون", primary: "160 100% 45%", accent: "130 100% 50%", emoji: "⚡" },
};
