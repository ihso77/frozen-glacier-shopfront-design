-- تحديث إعدادات الدفع للوضع الحقيقي
-- Run this in Supabase SQL Editor

-- حذف الإعدادات القديمة إن وجدت
DELETE FROM site_settings WHERE key = 'payment_settings';

-- إدراج الإعدادات الجديدة مع API Key الحقيقي
INSERT INTO site_settings (key, value, created_at, updated_at)
VALUES (
  'payment_settings',
  jsonb_build_object(
    'mode', 'live',
    'sandbox_api_key', 'gCxoJVnV5Ljzk3dAkTiJDRaR8s9GSWajxanqLzMU',
    'live_api_key', 'oMWyXkHrgGUx-xdFmUMhPq3JwEG7sdp-UFSHyrcX',
    'currency', 'USD',
    'min_amount', 0.01,
    'max_amount', 10000
  ),
  NOW(),
  NOW()
);

-- التحقق من الإعدادات
SELECT * FROM site_settings WHERE key = 'payment_settings';
