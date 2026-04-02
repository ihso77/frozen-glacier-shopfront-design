-- ============================================
-- إصلاح شامل لمشاكل التسجيل والأدوار
-- ============================================

-- 1. إضافة دور supplier إلى الـ ENUM
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'supplier';

-- 2. إزالة القيود المكررة وإعادة إنشائها بشكل صحيح
DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    FOR constraint_record IN
        SELECT conname, conrelid::regclass as table_name
        FROM pg_constraint
        WHERE contype = 'u'
        AND conrelid = 'public.user_roles'::regclass
    LOOP
        EXECUTE format('ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS %I', constraint_record.conname);
    END LOOP;
END $$;

-- إضافة قيد فريد واحد فقط
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_role_unique UNIQUE (user_id, role);

-- 3. تحديث دالة handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- إدخال الملف الشخصي
  INSERT INTO public.profiles (user_id, full_name, email, phone, gender)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'gender'
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- إدخال الدور member للمستخدم الجديد
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'member')
  ON CONFLICT ON CONSTRAINT user_roles_user_id_role_unique DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. إعادة إنشاء التريغر
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. تنظيف الأدوار المكررة
DELETE FROM public.user_roles a
USING public.user_roles b
WHERE a.id > b.id
AND a.user_id = b.user_id
AND a.role = b.role;

-- 6. التأكد من أن جميع المستخدمين لديهم دور
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'member'
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.user_roles)
ON CONFLICT ON CONSTRAINT user_roles_user_id_role_unique DO NOTHING;

-- 7. عرض النتيجة
SELECT
    u.email,
    array_agg(ur.role) as roles,
    u.created_at as user_created
FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
GROUP BY u.id, u.email, u.created_at
ORDER BY u.created_at DESC;
