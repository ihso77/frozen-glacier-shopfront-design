-- ============================================
-- إصلاح مشكلة التسجيل وتعارض الأدوار
-- ============================================

-- 1. تحديث دالة handle_new_user لإصلاح ON CONFLICT
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

  -- إدخال الدور مع تحديد الـ constraint بشكل صحيح
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'member')
  ON CONFLICT ON CONSTRAINT user_roles_user_id_role_unique DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. التأكد من أن الـ constraint موجود
DO $$
BEGIN
  -- التحقق من وجود الـ constraint
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_roles_user_id_role_unique'
  ) THEN
    -- إضافة الـ constraint إذا لم يكن موجوداً
    ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_role_unique UNIQUE (user_id, role);
  END IF;
END $$;

-- 3. تنظيف الأدوار المكررة (إذا وجدت)
DELETE FROM public.user_roles a
USING public.user_roles b
WHERE a.id > b.id
AND a.user_id = b.user_id
AND a.role = b.role;

-- 4. التأكد من عدم وجود مستخدمين بدون دور
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'member'
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.user_roles)
ON CONFLICT ON CONSTRAINT user_roles_user_id_role_unique DO NOTHING;

-- 5. إزالة أي أدوار owner تم تعيينها بسبب الشراء (إذا كان المستخدم يريد ذلك)
-- ملاحظة: هذا السطر محذوف بناءً على طلب المستخدم
-- UPDATE public.user_roles SET role = 'member' WHERE role = 'owner' AND user_id != '...';

-- 6. التحقق من أن التريغر يعمل بشكل صحيح
SELECT pg_get_triggerdef(oid) 
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';
