-- إضافة عمود اللغة لجدول user_bots
-- Run this in Supabase SQL Editor

-- إضافة عمود language إذا لم يكن موجوداً
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_bots' AND column_name = 'language'
  ) THEN
    ALTER TABLE user_bots ADD COLUMN language VARCHAR(10) DEFAULT 'ar';
  END IF;
END $$;

-- تحديث القيم الافتراضية
UPDATE user_bots SET language = 'ar' WHERE language IS NULL;

-- التأكد من صلاحيات الوصول
GRANT ALL ON user_bots TO authenticated;
GRANT ALL ON user_bots TO service_role;
