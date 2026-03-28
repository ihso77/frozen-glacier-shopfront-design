-- ============================================================
-- ============================================================
--     🧊 FROZEN GLACIER SHOPFRONT - SUPABASE DATABASE SETUP
-- ============================================================
-- ============================================================
-- 
-- هذه السكربت تقوم بإعداد قاعدة البيانات كاملة لمتجر فروزن
-- قم بنسخ هذا الكود بالكامل ووضعه في Supabase SQL Editor
-- 
-- الجداول المتضمنة:
--   1. profiles       - ملفات المستخدمين
--   2. user_roles     - أدوار المستخدمين
--   3. categories     - أقسام المنتجات
--   4. products       - المنتجات
--   5. orders         - الطلبات
--   6. messages       - رسائل التواصل
--   7. support_tickets - تذاكر الدعم
--   8. ticket_messages - رسائل التذاكر
--   9. site_settings  - إعدادات الموقع
--   10. analytics_events - أحداث التحليلات
--
-- ============================================================
-- ============================================================


-- ============================================================
-- الجزء 1: إنشاء الأنواع المخصصة (Custom Types)
-- ============================================================

-- حذف النوع القديم إذا كان موجوداً (يحتاج معالجة خاصة)
-- ملاحظة: لا يمكن حذف الـ enum بسهولة إذا كان مستخدماً، لذا نستخدم طريقة بديلة

-- إنشاء نوع دور المستخدم
DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('owner', 'admin', 'member', 'customer', 'vip_customer');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- تعليق على النوع
COMMENT ON TYPE public.app_role IS 'أدوار المستخدمين في النظام: owner (مالك), admin (مشرف), member (عضو عادي), customer (عميل), vip_customer (عميل مميز)';


-- ============================================================
-- الجزء 2: إنشاء الدوال المساعدة (Helper Functions)
-- ============================================================

-- دالة لتحديث حقل updated_at تلقائياً
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.update_updated_at_column() IS 'دالة تقوم بتحديث حقل updated_at تلقائياً عند تعديل أي سجل';


-- دالة للتحقق من دور المستخدم
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
        AND role = _role
    )
$$;

COMMENT ON FUNCTION public.has_role(UUID, app_role) IS 'دالة للتحقق مما إذا كان المستخدم لديه دور معين';


-- دالة للتحقق من أن المستخدم مشرف أو مالك
CREATE OR REPLACE FUNCTION public.is_admin_or_owner(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
        AND role IN ('admin', 'owner')
    )
$$;

COMMENT ON FUNCTION public.is_admin_or_owner(UUID) IS 'دالة للتحقق مما إذا كان المستخدم مشرفاً أو مالكاً';


-- دالة للتحقق من أن المستخدم مالك
CREATE OR REPLACE FUNCTION public.is_owner(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
        AND role = 'owner'
    )
$$;

COMMENT ON FUNCTION public.is_owner(UUID) IS 'دالة للتحقق مما إذا كان المستخدم مالكاً للموقع';


-- ============================================================
-- الجزء 3: إنشاء الجداول الأساسية (Core Tables)
-- ============================================================

-- ============================================================
-- جدول ملفات المستخدمين (Profiles Table)
-- ============================================================
-- هذا الجدول يخزن معلومات إضافية عن المستخدمين
-- مثل الاسم الكامل، رقم الهاتف، والجنس

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    phone TEXT,
    gender TEXT CHECK (gender IN ('male', 'female')),
    email TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    
    -- القيود الخارجية
    CONSTRAINT profiles_user_id_fkey 
        FOREIGN KEY (user_id) 
        REFERENCES auth.users(id) 
        ON DELETE CASCADE
);

-- إنشاء فهرس لتسريع البحث
CREATE INDEX IF NOT EXISTS profiles_user_id_idx ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles(email);

-- تعليقات على الجدول والأعمدة
COMMENT ON TABLE public.profiles IS 'جدول ملفات المستخدمين - يخزن معلومات إضافية عن كل مستخدم مسجل';
COMMENT ON COLUMN public.profiles.id IS 'المعرف الفريد للملف الشخصي';
COMMENT ON COLUMN public.profiles.user_id IS 'معرف المستخدم من جدول auth.users (مفتاح خارجي)';
COMMENT ON COLUMN public.profiles.full_name IS 'الاسم الكامل للمستخدم';
COMMENT ON COLUMN public.profiles.phone IS 'رقم الهاتف (اختياري)';
COMMENT ON COLUMN public.profiles.gender IS 'الجنس: male (ذكر) أو female (أنثى)';
COMMENT ON COLUMN public.profiles.email IS 'البريد الإلكتروني للمستخدم';
COMMENT ON COLUMN public.profiles.created_at IS 'تاريخ ووقت إنشاء الملف';
COMMENT ON COLUMN public.profiles.updated_at IS 'تاريخ ووقت آخر تحديث للملف';


-- ============================================================
-- جدول أدوار المستخدمين (User Roles Table)
-- ============================================================
-- هذا الجدول يحدد صلاحيات كل مستخدم في النظام
-- الأدوار: owner, admin, member, customer, vip_customer

CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    role app_role NOT NULL DEFAULT 'member',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    
    -- القيود
    CONSTRAINT user_roles_user_id_fkey 
        FOREIGN KEY (user_id) 
        REFERENCES auth.users(id) 
        ON DELETE CASCADE,
    CONSTRAINT user_roles_user_id_role_unique UNIQUE (user_id, role)
);

-- إنشاء فهارس
CREATE INDEX IF NOT EXISTS user_roles_user_id_idx ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS user_roles_role_idx ON public.user_roles(role);

-- تعليقات
COMMENT ON TABLE public.user_roles IS 'جدول أدوار المستخدمين - يحدد صلاحيات كل مستخدم';
COMMENT ON COLUMN public.user_roles.user_id IS 'معرف المستخدم من جدول auth.users';
COMMENT ON COLUMN public.user_roles.role IS 'دور المستخدم: owner, admin, member, customer, vip_customer';


-- ============================================================
-- جدول الأقسام (Categories Table)
-- ============================================================
-- هذا الجدول يخزن أقسام المنتجات في المتجر
-- يمكن ترتيب الأقسام وتفعيل/تعطيل عرضها

CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- فهارس
CREATE INDEX IF NOT EXISTS categories_is_active_idx ON public.categories(is_active);
CREATE INDEX IF NOT EXISTS categories_display_order_idx ON public.categories(display_order);

-- تعليقات
COMMENT ON TABLE public.categories IS 'جدول أقسام المنتجات - ينظم المنتجات في مجموعات منطقية';
COMMENT ON COLUMN public.categories.name IS 'اسم القسم';
COMMENT ON COLUMN public.categories.description IS 'وصف القسم (اختياري)';
COMMENT ON COLUMN public.categories.icon IS 'أيقونة القسم (اسم الأيقونة من Lucide)';
COMMENT ON COLUMN public.categories.display_order IS 'ترتيب العرض - الأرقام الأصغر تظهر أولاً';
COMMENT ON COLUMN public.categories.is_active IS 'هل القسم نشط ومرئي للمستخدمين';


-- ============================================================
-- جدول المنتجات (Products Table)
-- ============================================================
-- هذا الجدول يخزن جميع المنتجات المعروضة في المتجر
-- يتضمن الأسعار، الوصف، الصور، وحالة المخزون

CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10, 3) NOT NULL,
    original_price DECIMAL(10, 3),
    category_id UUID,
    image_url TEXT,
    badge TEXT,
    is_new BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    stock INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    
    -- القيود الخارجية
    CONSTRAINT products_category_id_fkey 
        FOREIGN KEY (category_id) 
        REFERENCES public.categories(id) 
        ON DELETE SET NULL
);

-- فهارس
CREATE INDEX IF NOT EXISTS products_category_id_idx ON public.products(category_id);
CREATE INDEX IF NOT EXISTS products_is_active_idx ON public.products(is_active);
CREATE INDEX IF NOT EXISTS products_is_new_idx ON public.products(is_new);
CREATE INDEX IF NOT EXISTS products_price_idx ON public.products(price);

-- تعليقات
COMMENT ON TABLE public.products IS 'جدول المنتجات - يخزن جميع منتجات المتجر';
COMMENT ON COLUMN public.products.name IS 'اسم المنتج';
COMMENT ON COLUMN public.products.description IS 'وصف تفصيلي للمنتج';
COMMENT ON COLUMN public.products.price IS 'السعر الحالي للمنتج';
COMMENT ON COLUMN public.products.original_price IS 'السعر الأصلي (قبل الخصم)';
COMMENT ON COLUMN public.products.category_id IS 'معرف القسم الذي ينتمي إليه المنتج';
COMMENT ON COLUMN public.products.image_url IS 'رابط صورة المنتج';
COMMENT ON COLUMN public.products.badge IS 'شارة المنتج (مثل: جديد، حصري، إلخ)';
COMMENT ON COLUMN public.products.is_new IS 'هل المنتج جديد';
COMMENT ON COLUMN public.products.is_active IS 'هل المنتج نشط ومرئي';
COMMENT ON COLUMN public.products.stock IS 'الكمية المتوفرة في المخزون';


-- ============================================================
-- جدول الطلبات (Orders Table)
-- ============================================================
-- هذا الجدول يخزن جميع طلبات الشراء
-- يتضمن معلومات الدفع وكود الاسترداد

CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    product_id UUID,
    product_name TEXT NOT NULL,
    price DECIMAL(10, 3) NOT NULL,
    payment_method TEXT NOT NULL DEFAULT 'card',
    payment_status TEXT NOT NULL DEFAULT 'completed',
    redemption_code TEXT NOT NULL DEFAULT encode(gen_random_bytes(8), 'hex'),
    is_redeemed BOOLEAN NOT NULL DEFAULT false,
    redeemed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    
    -- القيود الخارجية
    CONSTRAINT orders_product_id_fkey 
        FOREIGN KEY (product_id) 
        REFERENCES public.products(id) 
        ON DELETE SET NULL
);

-- فهارس
CREATE INDEX IF NOT EXISTS orders_user_id_idx ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS orders_payment_status_idx ON public.orders(payment_status);
CREATE INDEX IF NOT EXISTS orders_redemption_code_idx ON public.orders(redemption_code);
CREATE INDEX IF NOT EXISTS orders_created_at_idx ON public.orders(created_at DESC);

-- تعليقات
COMMENT ON TABLE public.orders IS 'جدول الطلبات - يخزن جميع عمليات الشراء';
COMMENT ON COLUMN public.orders.user_id IS 'معرف المستخدم الذي قام بالطلب';
COMMENT ON COLUMN public.orders.product_id IS 'معرف المنتج المطلوب';
COMMENT ON COLUMN public.orders.product_name IS 'اسم المنتج (محفوظ للتاريخ)';
COMMENT ON COLUMN public.orders.price IS 'السعر المدفوع';
COMMENT ON COLUMN public.orders.payment_method IS 'طريقة الدفع: card, wallet, transfer';
COMMENT ON COLUMN public.orders.payment_status IS 'حالة الدفع: pending, completed, failed, refunded';
COMMENT ON COLUMN public.orders.redemption_code IS 'كود استرداد المنتج (8 بايت عشوائية)';
COMMENT ON COLUMN public.orders.is_redeemed IS 'هل تم استرداد المنتج';
COMMENT ON COLUMN public.orders.redeemed_at IS 'تاريخ ووقت الاسترداد';


-- ============================================================
-- جدول رسائل التواصل (Messages Table)
-- ============================================================
-- هذا الجدول يخزن رسائل التواصل من الزوار والمستخدمين
-- يمكن للمشرفين الرد على الرسائل

CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_email TEXT NOT NULL,
    sender_name TEXT,
    subject TEXT NOT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    replied_at TIMESTAMP WITH TIME ZONE,
    reply_content TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- فهارس
CREATE INDEX IF NOT EXISTS messages_is_read_idx ON public.messages(is_read);
CREATE INDEX IF NOT EXISTS messages_created_at_idx ON public.messages(created_at DESC);

-- تعليقات
COMMENT ON TABLE public.messages IS 'جدول رسائل التواصل - يخزن رسائل الزوار والمستخدمين';
COMMENT ON COLUMN public.messages.sender_email IS 'بريد المرسل';
COMMENT ON COLUMN public.messages.sender_name IS 'اسم المرسل (اختياري)';
COMMENT ON COLUMN public.messages.subject IS 'موضوع الرسالة';
COMMENT ON COLUMN public.messages.content IS 'محتوى الرسالة';
COMMENT ON COLUMN public.messages.is_read Is 'هل تم قراءة الرسالة من قبل المشرف';
COMMENT ON COLUMN public.messages.replied_at IS 'تاريخ ووقت الرد';
COMMENT ON COLUMN public.messages.reply_content IS 'محتوى الرد';


-- ============================================================
-- جدول تذاكر الدعم (Support Tickets Table)
-- ============================================================
-- هذا الجدول يخزن تذاكر الدعم الفني للمستخدمين المسجلين

CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    user_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    closed_at TIMESTAMP WITH TIME ZONE,
    
    -- القيود الخارجية
    CONSTRAINT support_tickets_user_id_fkey 
        FOREIGN KEY (user_id) 
        REFERENCES auth.users(id) 
        ON DELETE CASCADE
);

-- فهارس
CREATE INDEX IF NOT EXISTS support_tickets_user_id_idx ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS support_tickets_status_idx ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS support_tickets_created_at_idx ON public.support_tickets(created_at DESC);

-- تعليقات
COMMENT ON TABLE public.support_tickets IS 'جدول تذاكر الدعم - يخزن طلبات الدعم الفني للمستخدمين';
COMMENT ON COLUMN public.support_tickets.user_id IS 'معرف المستخدم صاحب التذكرة';
COMMENT ON COLUMN public.support_tickets.user_email IS 'بريد المستخدم (محفوظ للتواصل)';
COMMENT ON COLUMN public.support_tickets.subject IS 'موضوع التذكرة';
COMMENT ON COLUMN public.support_tickets.status IS 'حالة التذكرة: open, in_progress, closed';
COMMENT ON COLUMN public.support_tickets.closed_at IS 'تاريخ ووقت إغلاق التذكرة';


-- ============================================================
-- جدول رسائل التذاكر (Ticket Messages Table)
-- ============================================================
-- هذا الجدول يخزن المحادثات داخل كل تذكرة دعم

CREATE TABLE IF NOT EXISTS public.ticket_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL,
    sender_id UUID NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    
    -- القيود الخارجية
    CONSTRAINT ticket_messages_ticket_id_fkey 
        FOREIGN KEY (ticket_id) 
        REFERENCES public.support_tickets(id) 
        ON DELETE CASCADE
);

-- فهارس
CREATE INDEX IF NOT EXISTS ticket_messages_ticket_id_idx ON public.ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS ticket_messages_created_at_idx ON public.ticket_messages(created_at);

-- تعليقات
COMMENT ON TABLE public.ticket_messages IS 'جدول رسائل التذاكر - يخزن المحادثات داخل كل تذكرة';
COMMENT ON COLUMN public.ticket_messages.ticket_id IS 'معرف التذكرة';
COMMENT ON COLUMN public.ticket_messages.sender_id IS 'معرف المرسل (مستخدم أو مشرف)';
COMMENT ON COLUMN public.ticket_messages.content IS 'محتوى الرسالة';


-- ============================================================
-- جدول إعدادات الموقع (Site Settings Table)
-- ============================================================
-- هذا الجدول يخزن إعدادات الموقع المتغيرة
-- مثل: وضع الصيانة، ألوان الموقع، معلومات المتجر

CREATE TABLE IF NOT EXISTS public.site_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    value JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_by UUID,
    
    -- القيود الخارجية
    CONSTRAINT site_settings_updated_by_fkey 
        FOREIGN KEY (updated_by) 
        REFERENCES auth.users(id) 
        ON DELETE SET NULL
);

-- فهارس
CREATE INDEX IF NOT EXISTS site_settings_key_idx ON public.site_settings(key);

-- تعليقات
COMMENT ON TABLE public.site_settings IS 'جدول إعدادات الموقع - يخزن الإعدادات القابلة للتغيير';
COMMENT ON COLUMN public.site_settings.key IS 'مفتاح الإعداد (فريد)';
COMMENT ON COLUMN public.site_settings.value IS 'قيمة الإعداد (JSON)';
COMMENT ON COLUMN public.site_settings.updated_by IS 'معرف المستخدم الذي عدل الإعداد آخر مرة';


-- ============================================================
-- جدول أحداث التحليلات (Analytics Events Table)
-- ============================================================
-- هذا الجدول يخزن أحداث التتبع والتحليلات
-- مثل: زيارات الصفحات، النقرات، عمليات الشراء

CREATE TABLE IF NOT EXISTS public.analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    event_data JSONB DEFAULT '{}',
    user_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    
    -- القيود الخارجية
    CONSTRAINT analytics_events_user_id_fkey 
        FOREIGN KEY (user_id) 
        REFERENCES auth.users(id) 
        ON DELETE SET NULL
);

-- فهارس
CREATE INDEX IF NOT EXISTS analytics_events_event_type_idx ON public.analytics_events(event_type);
CREATE INDEX IF NOT EXISTS analytics_events_user_id_idx ON public.analytics_events(user_id);
CREATE INDEX IF NOT EXISTS analytics_events_created_at_idx ON public.analytics_events(created_at DESC);

-- تعليقات
COMMENT ON TABLE public.analytics_events IS 'جدول أحداث التحليلات - يخزن بيانات التتبع والإحصائيات';
COMMENT ON COLUMN public.analytics_events.event_type IS 'نوع الحدث: page_view, click, purchase, etc.';
COMMENT ON COLUMN public.analytics_events.event_data IS 'بيانات إضافية للحدث (JSON)';
COMMENT ON COLUMN public.analytics_events.user_id IS 'معرف المستخدم (اختياري)';


-- ============================================================
-- الجزء 4: تفعيل Row Level Security (RLS)
-- ============================================================

-- تفعيل RLS على جميع الجداول
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- الجزء 5: سياسات الأمان (RLS Policies)
-- ============================================================

-- ============================================================
-- سياسات جدول الملفات الشخصية (Profiles Policies)
-- ============================================================

-- المستخدمون يمكنهم رؤية ملفاتهم الخاصة فقط
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT
    USING (auth.uid() = user_id);

-- المشرفون والمالك يمكنهم رؤية جميع الملفات
CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR SELECT
    USING (is_admin_or_owner(auth.uid()));

-- المستخدمون يمكنهم إنشاء ملفاتهم الخاصة
CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- المستخدمون يمكنهم تحديث ملفاتهم الخاصة
CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);


-- ============================================================
-- سياسات جدول أدوار المستخدمين (User Roles Policies)
-- ============================================================

-- المستخدمون يمكنهم رؤية دورهم فقط
CREATE POLICY "Users can view own role" ON public.user_roles
    FOR SELECT
    USING (auth.uid() = user_id);

-- المشرفون والمالك يمكنهم رؤية جميع الأدوار
CREATE POLICY "Admins can view all roles" ON public.user_roles
    FOR SELECT
    USING (is_admin_or_owner(auth.uid()));

-- فقط المالك يمكنه إضافة أدوار
CREATE POLICY "Only owner can insert roles" ON public.user_roles
    FOR INSERT
    TO authenticated
    WITH CHECK (is_owner(auth.uid()));

-- فقط المالك يمكنه تحديث الأدوار
CREATE POLICY "Only owner can update roles" ON public.user_roles
    FOR UPDATE
    TO authenticated
    USING (is_owner(auth.uid()));

-- فقط المالك يمكنه حذف الأدوار
CREATE POLICY "Only owner can delete roles" ON public.user_roles
    FOR DELETE
    TO authenticated
    USING (is_owner(auth.uid()));


-- ============================================================
-- سياسات جدول الأقسام (Categories Policies)
-- ============================================================

-- الجميع يمكنهم رؤية الأقسام النشطة
CREATE POLICY "Anyone can view active categories" ON public.categories
    FOR SELECT
    USING (is_active = true);

-- المشرفون والمالك يمكنهم إدارة الأقسام
CREATE POLICY "Admins can manage categories" ON public.categories
    FOR ALL
    TO authenticated
    USING (is_admin_or_owner(auth.uid()));


-- ============================================================
-- سياسات جدول المنتجات (Products Policies)
-- ============================================================

-- الجميع يمكنهم رؤية المنتجات النشطة
CREATE POLICY "Anyone can view active products" ON public.products
    FOR SELECT
    USING (is_active = true);

-- المشرفون والمالك يمكنهم إدارة المنتجات
CREATE POLICY "Admins can manage products" ON public.products
    FOR ALL
    TO authenticated
    USING (is_admin_or_owner(auth.uid()));


-- ============================================================
-- سياسات جدول الطلبات (Orders Policies)
-- ============================================================

-- المستخدمون يمكنهم رؤية طلباتهم الخاصة
CREATE POLICY "Users can view own orders" ON public.orders
    FOR SELECT
    USING (auth.uid() = user_id);

-- المشرفون والمالك يمكنهم رؤية جميع الطلبات
CREATE POLICY "Admins can view all orders" ON public.orders
    FOR SELECT
    USING (is_admin_or_owner(auth.uid()));

-- المستخدمون يمكنهم إنشاء طلبات جديدة
CREATE POLICY "Users can create orders" ON public.orders
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- المشرفون والمالك يمكنهم تحديث الطلبات
CREATE POLICY "Admins can update orders" ON public.orders
    FOR UPDATE
    USING (is_admin_or_owner(auth.uid()));


-- ============================================================
-- سياسات جدول الرسائل (Messages Policies)
-- ============================================================

-- المستخدمون المسجلون يمكنهم إرسال رسائل
CREATE POLICY "Authenticated users can send messages" ON public.messages
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- المشرفون والمالك يمكنهم قراءة الرسائل
CREATE POLICY "Admin can read messages" ON public.messages
    FOR SELECT
    TO authenticated
    USING (is_admin_or_owner(auth.uid()));

-- المشرفون والمالك يمكنهم تحديث الرسائل (للرد)
CREATE POLICY "Admin can update messages" ON public.messages
    FOR UPDATE
    TO authenticated
    USING (is_admin_or_owner(auth.uid()));

-- المشرفون والمالك يمكنهم حذف الرسائل
CREATE POLICY "Admin can delete messages" ON public.messages
    FOR DELETE
    TO authenticated
    USING (is_admin_or_owner(auth.uid()));


-- ============================================================
-- سياسات جدول تذاكر الدعم (Support Tickets Policies)
-- ============================================================

-- المستخدمون يمكنهم رؤية تذاكرهم الخاصة
CREATE POLICY "Users can view own tickets" ON public.support_tickets
    FOR SELECT
    USING (auth.uid() = user_id);

-- المشرفون والمالك يمكنهم رؤية جميع التذاكر
CREATE POLICY "Admins can view all tickets" ON public.support_tickets
    FOR SELECT
    USING (is_admin_or_owner(auth.uid()));

-- المستخدمون يمكنهم إنشاء تذاكر جديدة
CREATE POLICY "Users can create tickets" ON public.support_tickets
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- المشرفون والمالك يمكنهم تحديث التذاكر
CREATE POLICY "Admins can update tickets" ON public.support_tickets
    FOR UPDATE
    USING (is_admin_or_owner(auth.uid()));


-- ============================================================
-- سياسات جدول رسائل التذاكر (Ticket Messages Policies)
-- ============================================================

-- المشاركون في التذكرة يمكنهم رؤية الرسائل
CREATE POLICY "Ticket participants can view messages" ON public.ticket_messages
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 
            FROM public.support_tickets 
            WHERE id = ticket_id AND user_id = auth.uid()
        )
        OR is_admin_or_owner(auth.uid())
    );

-- المشاركون في التذكرة يمكنهم إرسال رسائل
CREATE POLICY "Ticket participants can send messages" ON public.ticket_messages
    FOR INSERT
    WITH CHECK (
        auth.uid() = sender_id 
        AND (
            EXISTS (
                SELECT 1 
                FROM public.support_tickets 
                WHERE id = ticket_id AND user_id = auth.uid()
            )
            OR is_admin_or_owner(auth.uid())
        )
    );


-- ============================================================
-- سياسات جدول إعدادات الموقع (Site Settings Policies)
-- ============================================================

-- الجميع يمكنهم رؤية الإعدادات العامة (غير السرية)
CREATE POLICY "Anyone can view public settings" ON public.site_settings
    FOR SELECT
    USING (key NOT LIKE 'secret_%');

-- المشرفون والمالك يمكنهم إدارة الإعدادات
CREATE POLICY "Admins can manage settings" ON public.site_settings
    FOR ALL
    TO authenticated
    USING (is_admin_or_owner(auth.uid()));


-- ============================================================
-- سياسات جدول التحليلات (Analytics Events Policies)
-- ============================================================

-- المستخدمون المسجلون يمكنهم إضافة أحداث
CREATE POLICY "Authenticated users can insert analytics" ON public.analytics_events
    FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL 
        AND (user_id IS NULL OR user_id = auth.uid())
    );

-- المشرفون والمالك يمكنهم رؤية التحليلات
CREATE POLICY "Admins can view analytics" ON public.analytics_events
    FOR SELECT
    TO authenticated
    USING (is_admin_or_owner(auth.uid()));


-- ============================================================
-- الجزء 6: إنشاء Triggers
-- ============================================================

-- Trigger لتحديث updated_at في جدول profiles
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger لتحديث updated_at في جدول categories
DROP TRIGGER IF EXISTS update_categories_updated_at ON public.categories;
CREATE TRIGGER update_categories_updated_at
    BEFORE UPDATE ON public.categories
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger لتحديث updated_at في جدول products
DROP TRIGGER IF EXISTS update_products_updated_at ON public.products;
CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger لتحديث updated_at في جدول site_settings
DROP TRIGGER IF EXISTS update_site_settings_updated_at ON public.site_settings;
CREATE TRIGGER update_site_settings_updated_at
    BEFORE UPDATE ON public.site_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================================
-- الجزء 7: دوال و Triggers للإنشاء التلقائي
-- ============================================================

-- دالة إنشاء ملف المستخدم تلقائياً عند التسجيل
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- إنشاء ملف المستخدم
    INSERT INTO public.profiles (user_id, full_name, email, phone, gender)
    VALUES (
        NEW.id,
        COALESCE(
            NEW.raw_user_meta_data->>'full_name', 
            split_part(NEW.email, '@', 1)
        ),
        NEW.email,
        NEW.raw_user_meta_data->>'phone',
        NEW.raw_user_meta_data->>'gender'
    )
    ON CONFLICT (user_id) DO NOTHING;

    -- تعيين دور member للمستخدم الجديد
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'member')
    ON CONFLICT (user_id, role) DO NOTHING;

    RETURN NEW;
END;
$$;

-- Trigger لإنشاء ملف المستخدم تلقائياً
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();


-- ============================================================
-- الجزء 8: دالة ترقية دور العميل تلقائياً
-- ============================================================

-- دالة ترقية دور العميل بناءً على عدد الطلبات
CREATE OR REPLACE FUNCTION public.assign_customer_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    order_count INTEGER;
    current_role app_role;
BEGIN
    -- الحصول على الدور الحالي
    SELECT role INTO current_role 
    FROM public.user_roles 
    WHERE user_id = NEW.user_id;
    
    -- لا نغير دور المشرف أو المالك
    IF current_role IN ('admin', 'owner') THEN
        RETURN NEW;
    END IF;
    
    -- عد طلبات المستخدم
    SELECT COUNT(*) INTO order_count 
    FROM public.orders 
    WHERE user_id = NEW.user_id;
    
    -- إذا كان لديه 10+ طلبات، يصبح VIP
    IF order_count >= 10 THEN
        IF current_role IS NOT NULL THEN
            UPDATE public.user_roles 
            SET role = 'vip_customer' 
            WHERE user_id = NEW.user_id;
        ELSE
            INSERT INTO public.user_roles (user_id, role) 
            VALUES (NEW.user_id, 'vip_customer')
            ON CONFLICT (user_id, role) DO NOTHING;
        END IF;
    ELSE
        -- تعيين دور customer إذا كان عضواً عادياً
        IF current_role IS NULL OR current_role = 'member' THEN
            IF current_role IS NOT NULL THEN
                UPDATE public.user_roles 
                SET role = 'customer' 
                WHERE user_id = NEW.user_id;
            ELSE
                INSERT INTO public.user_roles (user_id, role) 
                VALUES (NEW.user_id, 'customer')
                ON CONFLICT (user_id, role) DO NOTHING;
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Trigger لترقية دور العميل تلقائياً
DROP TRIGGER IF EXISTS auto_assign_customer_role ON public.orders;
CREATE TRIGGER auto_assign_customer_role
    AFTER INSERT ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.assign_customer_role();


-- ============================================================
-- الجزء 9: تفعيل Realtime
-- ============================================================

-- تفعيل Realtime للجداول المهمة
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;


-- ============================================================
-- الجزء 10: إدراج البيانات الافتراضية
-- ============================================================

-- إدراج الأقسام الافتراضية
INSERT INTO public.categories (name, description, icon, display_order, is_active) VALUES
    ('اشتراكات مسلسلات', 'اشتراكات منصات المسلسلات والأفلام بأفضل الأسعار', 'credit-card', 1, true),
    ('اشتراكات عامة', 'خدمات متنوعة لتلبية احتياجاتك اليومية', 'credit-card', 2, true),
    ('اشتراكات دسكورد', 'اشتراكات Discord Nitro بأسعار تنافسية', 'credit-card', 3, true),
    ('خدمات دسكورد', 'خدمات بوتات وتطوير سيرفرات دسكورد', 'credit-card', 4, true),
    ('خدمات الألعاب', 'خدمات متنوعة للألعاب والأنشطة الترفيهية', 'credit-card', 5, true),
    ('يوزرات', 'يوزرات مميزة بأسعار منافسة', 'user', 6, true)
ON CONFLICT DO NOTHING;

-- إدراج الإعدادات الافتراضية للموقع
INSERT INTO public.site_settings (key, value) VALUES
    ('maintenance_mode', '{"enabled": false, "message": "الموقع تحت الصيانة"}'::jsonb),
    ('site_theme', '{"primary_color": "195 100% 50%", "accent_color": "180 100% 45%"}'::jsonb),
    ('site_info', '{"name": "فروزن", "description": "متجر لبيع اليوزرات والاشتراكات"}'::jsonb),
    ('social_links', '{"twitter": "", "instagram": "", "discord": "", "telegram": ""}'::jsonb),
    ('contact_info', '{"email": "", "phone": "", "whatsapp": ""}'::jsonb)
ON CONFLICT (key) DO NOTHING;


-- ============================================================
-- ============================================================
--                    ✅ تم الانتهاء من الإعداد!
-- ============================================================
-- ============================================================
-- 
-- الآن قم بتنفيذ الخطوات التالية:
-- 
-- 1. أنشئ حساب مالك (Owner) للموقع:
--    - سجل حساب جديد عبر صفحة التسجيل في موقعك
--    - ثم نفذ الأمر التالي في SQL Editor:
--    
--    UPDATE public.user_roles 
--    SET role = 'owner' 
--    WHERE user_id = 'معرف-المستخدم-هنا';
--    
--    أو:
--    INSERT INTO public.user_roles (user_id, role) 
--    VALUES ('معرف-المستخدم-هنا', 'owner');
-- 
-- 2. تحديث ملف .env في المشروع:
--    VITE_SUPABASE_URL="https://your-project.supabase.co"
--    VITE_SUPABASE_PUBLISHABLE_KEY="your-publishable-key"
-- 
-- 3. أضف Secret Key في Supabase Edge Functions إذا كنت تستخدمها
-- 
-- ============================================================
-- ============================================================
