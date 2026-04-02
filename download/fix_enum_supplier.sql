-- ============================================
-- بديل: إصلاح الـ ENUM إذا فشل الكود السابق
-- ============================================

-- طريقة بديلة لإضافة قيمة للـ ENUM (إذا فشل ADD VALUE IF NOT EXISTS)
-- ملاحظة: هذه العملية لا يمكن التراجع عنها، لذا نفذها بحذر

-- التحقق من القيم الموجودة
SELECT unnest(enum_range(NULL::public.app_role)) AS existing_roles;

-- إضافة القيمة supplier (إذا لم تكن موجودة)
-- PostgreSQL لا يدعم IF NOT EXISTS لـ ADD VALUE بشكل مباشر
-- لذا نحتاج لطريقة مختلفة

DO $$
BEGIN
    -- محاولة إضافة القيمة
    BEGIN
        ALTER TYPE public.app_role ADD VALUE 'supplier';
    EXCEPTION
        WHEN duplicate_object THEN NULL;
        WHEN unique_violation THEN NULL;
    END;
END $$;

-- التحقق من نجاح الإضافة
SELECT unnest(enum_range(NULL::public.app_role)) AS all_roles;

-- ============================================
-- إذا فشلت الطريقة أعلاه، استخدم هذه الطريقة:
-- ============================================

-- إنشاء ENUM جديد مع جميع القيم
-- (غير فعّال هذه الأسطر إلا إذا فشلت الطريقة السابقة)

/*
DROP TYPE public.app_role CASCADE;

CREATE TYPE public.app_role AS ENUM ('owner', 'admin', 'member', 'customer', 'vip_customer', 'supplier');

-- إعادة إنشاء الجدول والدوال
ALTER TABLE public.user_roles ALTER COLUMN role TYPE public.app_role USING role::text::public.app_role;
*/
