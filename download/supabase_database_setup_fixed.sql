-- ============================================================
-- ============================================================
--     🧊 FROZEN GLACIER SHOPFRONT - SUPABASE DATABASE SETUP
-- ============================================================
-- ============================================================
-- 
-- هذه السكربت تقوم بإعداد قاعدة البيانات كاملة لمتجر فروزن
-- قم بنسخ هذا الكود بالكامل ووضعه في Supabase SQL Editor
-- 
-- ============================================================
-- ============================================================


-- ============================================================
-- الجزء 1: إنشاء الأنواع المخصصة (Custom Types)
-- ============================================================

DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('owner', 'admin', 'member', 'customer', 'vip_customer');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;


-- ============================================================
-- الجزء 2: إنشاء الجداول أولاً (Core Tables)
-- ============================================================

-- جدول ملفات المستخدمين
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    phone TEXT,
    gender TEXT CHECK (gender IN ('male', 'female')),
    email TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- جدول أدوار المستخدمين
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    role app_role NOT NULL DEFAULT 'member',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT user_roles_user_id_role_unique UNIQUE (user_id, role)
);

-- جدول الأقسام
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

-- جدول المنتجات
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
    CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL
);

-- جدول الطلبات
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
    CONSTRAINT orders_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL
);

-- جدول رسائل التواصل
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

-- جدول تذاكر الدعم
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    user_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    closed_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT support_tickets_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- جدول رسائل التذاكر
CREATE TABLE IF NOT EXISTS public.ticket_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL,
    sender_id UUID NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    CONSTRAINT ticket_messages_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.support_tickets(id) ON DELETE CASCADE
);

-- جدول إعدادات الموقع
CREATE TABLE IF NOT EXISTS public.site_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    value JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_by UUID,
    CONSTRAINT site_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL
);

-- جدول أحداث التحليلات
CREATE TABLE IF NOT EXISTS public.analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    event_data JSONB DEFAULT '{}',
    user_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    CONSTRAINT analytics_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL
);


-- ============================================================
-- الجزء 3: إنشاء الفهارس (Indexes)
-- ============================================================

CREATE INDEX IF NOT EXISTS profiles_user_id_idx ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles(email);
CREATE INDEX IF NOT EXISTS user_roles_user_id_idx ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS user_roles_role_idx ON public.user_roles(role);
CREATE INDEX IF NOT EXISTS categories_is_active_idx ON public.categories(is_active);
CREATE INDEX IF NOT EXISTS categories_display_order_idx ON public.categories(display_order);
CREATE INDEX IF NOT EXISTS products_category_id_idx ON public.products(category_id);
CREATE INDEX IF NOT EXISTS products_is_active_idx ON public.products(is_active);
CREATE INDEX IF NOT EXISTS products_is_new_idx ON public.products(is_new);
CREATE INDEX IF NOT EXISTS products_price_idx ON public.products(price);
CREATE INDEX IF NOT EXISTS orders_user_id_idx ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS orders_payment_status_idx ON public.orders(payment_status);
CREATE INDEX IF NOT EXISTS orders_redemption_code_idx ON public.orders(redemption_code);
CREATE INDEX IF NOT EXISTS orders_created_at_idx ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS messages_is_read_idx ON public.messages(is_read);
CREATE INDEX IF NOT EXISTS messages_created_at_idx ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS support_tickets_user_id_idx ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS support_tickets_status_idx ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS support_tickets_created_at_idx ON public.support_tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS ticket_messages_ticket_id_idx ON public.ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS ticket_messages_created_at_idx ON public.ticket_messages(created_at);
CREATE INDEX IF NOT EXISTS site_settings_key_idx ON public.site_settings(key);
CREATE INDEX IF NOT EXISTS analytics_events_event_type_idx ON public.analytics_events(event_type);
CREATE INDEX IF NOT EXISTS analytics_events_user_id_idx ON public.analytics_events(user_id);
CREATE INDEX IF NOT EXISTS analytics_events_created_at_idx ON public.analytics_events(created_at DESC);


-- ============================================================
-- الجزء 4: إنشاء الدوال المساعدة (Helper Functions)
-- ============================================================

-- دالة تحديث updated_at
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

-- دالة التحقق من دور المستخدم
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = _user_id AND role = _role
    )
$$;

-- دالة التحقق من أن المستخدم مشرف أو مالك
CREATE OR REPLACE FUNCTION public.is_admin_or_owner(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = _user_id AND role IN ('admin', 'owner')
    )
$$;

-- دالة التحقق من أن المستخدم مالك
CREATE OR REPLACE FUNCTION public.is_owner(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = _user_id AND role = 'owner'
    )
$$;


-- ============================================================
-- الجزء 5: تفعيل Row Level Security (RLS)
-- ============================================================

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
-- الجزء 6: سياسات الأمان (RLS Policies)
-- ============================================================

-- سياسات profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (is_admin_or_owner(auth.uid()));
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- سياسات user_roles
CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (is_admin_or_owner(auth.uid()));
CREATE POLICY "Only owner can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (is_owner(auth.uid()));
CREATE POLICY "Only owner can update roles" ON public.user_roles FOR UPDATE TO authenticated USING (is_owner(auth.uid()));
CREATE POLICY "Only owner can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (is_owner(auth.uid()));

-- سياسات categories
CREATE POLICY "Anyone can view active categories" ON public.categories FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage categories" ON public.categories FOR ALL TO authenticated USING (is_admin_or_owner(auth.uid()));

-- سياسات products
CREATE POLICY "Anyone can view active products" ON public.products FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage products" ON public.products FOR ALL TO authenticated USING (is_admin_or_owner(auth.uid()));

-- سياسات orders
CREATE POLICY "Users can view own orders" ON public.orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all orders" ON public.orders FOR SELECT USING (is_admin_or_owner(auth.uid()));
CREATE POLICY "Users can create orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can update orders" ON public.orders FOR UPDATE USING (is_admin_or_owner(auth.uid()));

-- سياسات messages
CREATE POLICY "Authenticated users can send messages" ON public.messages FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admin can read messages" ON public.messages FOR SELECT TO authenticated USING (is_admin_or_owner(auth.uid()));
CREATE POLICY "Admin can update messages" ON public.messages FOR UPDATE TO authenticated USING (is_admin_or_owner(auth.uid()));
CREATE POLICY "Admin can delete messages" ON public.messages FOR DELETE TO authenticated USING (is_admin_or_owner(auth.uid()));

-- سياسات support_tickets
CREATE POLICY "Users can view own tickets" ON public.support_tickets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all tickets" ON public.support_tickets FOR SELECT USING (is_admin_or_owner(auth.uid()));
CREATE POLICY "Users can create tickets" ON public.support_tickets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can update tickets" ON public.support_tickets FOR UPDATE USING (is_admin_or_owner(auth.uid()));

-- سياسات ticket_messages
CREATE POLICY "Ticket participants can view messages" ON public.ticket_messages FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.support_tickets WHERE id = ticket_id AND user_id = auth.uid())
    OR is_admin_or_owner(auth.uid())
);
CREATE POLICY "Ticket participants can send messages" ON public.ticket_messages FOR INSERT WITH CHECK (
    auth.uid() = sender_id 
    AND (EXISTS (SELECT 1 FROM public.support_tickets WHERE id = ticket_id AND user_id = auth.uid()) OR is_admin_or_owner(auth.uid()))
);

-- سياسات site_settings
CREATE POLICY "Anyone can view public settings" ON public.site_settings FOR SELECT USING (key NOT LIKE 'secret_%');
CREATE POLICY "Admins can manage settings" ON public.site_settings FOR ALL TO authenticated USING (is_admin_or_owner(auth.uid()));

-- سياسات analytics_events
CREATE POLICY "Authenticated users can insert analytics" ON public.analytics_events FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND (user_id IS NULL OR user_id = auth.uid()));
CREATE POLICY "Admins can view analytics" ON public.analytics_events FOR SELECT TO authenticated USING (is_admin_or_owner(auth.uid()));


-- ============================================================
-- الجزء 7: إنشاء Triggers
-- ============================================================

-- دالة إنشاء ملف المستخدم تلقائياً عند التسجيل
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (user_id, full_name, email, phone, gender)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        NEW.email,
        NEW.raw_user_meta_data->>'phone',
        NEW.raw_user_meta_data->>'gender'
    )
    ON CONFLICT (user_id) DO NOTHING;

    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'member')
    ON CONFLICT (user_id, role) DO NOTHING;

    RETURN NEW;
END;
$$;

-- دالة ترقية دور العميل تلقائياً
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
    SELECT role INTO current_role FROM public.user_roles WHERE user_id = NEW.user_id;
    
    IF current_role IN ('admin', 'owner') THEN
        RETURN NEW;
    END IF;
    
    SELECT COUNT(*) INTO order_count FROM public.orders WHERE user_id = NEW.user_id;
    
    IF order_count >= 10 THEN
        IF current_role IS NOT NULL THEN
            UPDATE public.user_roles SET role = 'vip_customer' WHERE user_id = NEW.user_id;
        ELSE
            INSERT INTO public.user_roles (user_id, role) VALUES (NEW.user_id, 'vip_customer') ON CONFLICT (user_id, role) DO NOTHING;
        END IF;
    ELSE
        IF current_role IS NULL OR current_role = 'member' THEN
            IF current_role IS NOT NULL THEN
                UPDATE public.user_roles SET role = 'customer' WHERE user_id = NEW.user_id;
            ELSE
                INSERT INTO public.user_roles (user_id, role) VALUES (NEW.user_id, 'customer') ON CONFLICT (user_id, role) DO NOTHING;
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Triggers لتحديث updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_categories_updated_at ON public.categories;
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_products_updated_at ON public.products;
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_site_settings_updated_at ON public.site_settings;
CREATE TRIGGER update_site_settings_updated_at BEFORE UPDATE ON public.site_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger لإنشاء ملف المستخدم تلقائياً
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger لترقية دور العميل
DROP TRIGGER IF EXISTS auto_assign_customer_role ON public.orders;
CREATE TRIGGER auto_assign_customer_role AFTER INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.assign_customer_role();


-- ============================================================
-- الجزء 8: تفعيل Realtime
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;


-- ============================================================
-- الجزء 9: إدراج البيانات الافتراضية
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

-- إدراج الإعدادات الافتراضية
INSERT INTO public.site_settings (key, value) VALUES
    ('maintenance_mode', '{"enabled": false, "message": "الموقع تحت الصيانة"}'::jsonb),
    ('site_theme', '{"primary_color": "195 100% 50%", "accent_color": "180 100% 45%"}'::jsonb),
    ('site_info', '{"name": "فروزن", "description": "متجر لبيع اليوزرات والاشتراكات"}'::jsonb),
    ('social_links', '{"twitter": "", "instagram": "", "discord": "", "telegram": ""}'::jsonb),
    ('contact_info', '{"email": "", "phone": "", "whatsapp": ""}'::jsonb)
ON CONFLICT (key) DO NOTHING;


-- ============================================================
--                    ✅ تم الانتهاء من الإعداد!
-- ============================================================
