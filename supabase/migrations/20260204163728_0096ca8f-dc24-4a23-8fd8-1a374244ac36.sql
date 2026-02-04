-- Create role enum type
CREATE TYPE public.app_role AS ENUM ('owner', 'admin', 'member');

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    phone TEXT,
    gender TEXT CHECK (gender IN ('male', 'female')),
    email TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'member',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE (user_id, role)
);

-- Create categories table
CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create products table
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10, 3) NOT NULL,
    original_price DECIMAL(10, 3),
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    image_url TEXT,
    badge TEXT,
    is_new BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    stock INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create site_settings table
CREATE TABLE public.site_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    value JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create analytics events table for tracking
CREATE TABLE public.analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    event_data JSONB DEFAULT '{}',
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
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

-- Function to check if user is admin or owner
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

-- Function to check if user is owner
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

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON public.profiles
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- User roles policies (only owner can manage roles)
CREATE POLICY "Users can view all roles" ON public.user_roles
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Only owner can insert roles" ON public.user_roles
    FOR INSERT TO authenticated
    WITH CHECK (public.is_owner(auth.uid()));

CREATE POLICY "Only owner can update roles" ON public.user_roles
    FOR UPDATE TO authenticated
    USING (public.is_owner(auth.uid()));

CREATE POLICY "Only owner can delete roles" ON public.user_roles
    FOR DELETE TO authenticated
    USING (public.is_owner(auth.uid()));

-- Categories policies (public read, admin/owner write)
CREATE POLICY "Anyone can view active categories" ON public.categories
    FOR SELECT
    USING (is_active = true);

CREATE POLICY "Admins can manage categories" ON public.categories
    FOR ALL TO authenticated
    USING (public.is_admin_or_owner(auth.uid()));

-- Products policies (public read, admin/owner write)
CREATE POLICY "Anyone can view active products" ON public.products
    FOR SELECT
    USING (is_active = true);

CREATE POLICY "Admins can manage products" ON public.products
    FOR ALL TO authenticated
    USING (public.is_admin_or_owner(auth.uid()));

-- Site settings policies (public read for non-sensitive, admin/owner write)
CREATE POLICY "Anyone can view public settings" ON public.site_settings
    FOR SELECT
    USING (key NOT LIKE 'secret_%');

CREATE POLICY "Admins can manage settings" ON public.site_settings
    FOR ALL TO authenticated
    USING (public.is_admin_or_owner(auth.uid()));

-- Analytics events policies
CREATE POLICY "Anyone can insert analytics" ON public.analytics_events
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Admins can view analytics" ON public.analytics_events
    FOR SELECT TO authenticated
    USING (public.is_admin_or_owner(auth.uid()));

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_categories_updated_at
    BEFORE UPDATE ON public.categories
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_site_settings_updated_at
    BEFORE UPDATE ON public.site_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default categories for digital products
INSERT INTO public.categories (name, description, icon, display_order) VALUES
    ('اشتراكات مسلسلات', 'اشتراكات المنصات والمسلسلات', 'tv', 1),
    ('خدمات عامة', 'خدمات متنوعة ومتعددة', 'package', 2),
    ('اشتراكات دسكورد', 'اشتراكات سيرفرات الدسكورد', 'message-circle', 3),
    ('خدمات دسكورد', 'خدمات دسكورد المتنوعة', 'users', 4),
    ('خدمات الألعاب', 'خدمات وحسابات الألعاب', 'gamepad-2', 5);

-- Insert default site settings
INSERT INTO public.site_settings (key, value) VALUES
    ('maintenance_mode', '{"enabled": false, "message": "الموقع تحت الصيانة"}'::jsonb),
    ('site_theme', '{"primary_color": "195 100% 50%", "accent_color": "180 100% 45%"}'::jsonb),
    ('site_info', '{"name": "فروزن", "description": "متجر لبيع اليوزرات والاشتراكات"}'::jsonb);