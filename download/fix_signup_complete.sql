-- ============================================
-- إصلاح مشكلة التسجيل وتعارض الأدوار
-- ============================================

-- 1. إزالة القيود المكررة وإعادة إنشائها بشكل صحيح
-- أولاً، نجد ونحذف جميع القيود الفريدة على (user_id, role)
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

-- 2. تحديث دالة handle_new_user للتعامل الصحيح مع التعارضات
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

  -- إدخال الدور مع تحديد الـ constraint بشكل صريح
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'member')
  ON CONFLICT ON CONSTRAINT user_roles_user_id_role_unique DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. التأكد من وجود التريغر
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. تنظيف الأدوار المكررة (إذا وجدت)
DELETE FROM public.user_roles a
USING public.user_roles b
WHERE a.id > b.id
AND a.user_id = b.user_id
AND a.role = b.role;

-- 5. التأكد من أن جميع المستخدمين لديهم دور
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'member'
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.user_roles)
ON CONFLICT ON CONSTRAINT user_roles_user_id_role_unique DO NOTHING;

-- 6. التحقق من النتيجة
SELECT 
    u.email,
    ur.role,
    u.created_at as user_created
FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
ORDER BY u.created_at DESC
LIMIT 20;
