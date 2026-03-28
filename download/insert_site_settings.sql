-- ==========================================
-- إعدادات الموقع الافتراضية - فروزن
-- ==========================================

-- إدراج معلومات الموقع الأساسية
INSERT INTO public.site_settings (key, value) VALUES
('site_info', '{"name": "فروزن", "description": "متجرك الرقمي الموثوق لشراء الحسابات والاشتراكات والخدمات الرقمية. جودة عالية، تسليم فوري، دعم فني 24/7.", "logo_url": "/images/og-image.png"}'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- إعدادات SEO
INSERT INTO public.site_settings (key, value) VALUES
('site_seo', '{"meta_title": "فروزن | Frozen - متجرك الرقمي الموثوق", "meta_description": "فروزن - متجرك الرقمي الموثوق. اشترِ حسابات نتفلكس، سبوتيفاي، دسكورد، يوزرات، ألعاب، واشتراكات رقمية بأفضل الأسعار.", "keywords": "فروزن, Frozen, متجر رقمي, حسابات نتفلكس, حسابات سبوتيفاي, دسكورد, يوزرات, ألعاب, اشتراكات رقمية"}'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- التحقق من الإعدادات
SELECT * FROM public.site_settings;
