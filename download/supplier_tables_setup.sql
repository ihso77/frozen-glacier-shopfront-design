-- ============================================
-- جداول نظام الموردين
-- ============================================

-- 1. جدول منتجات الموردين (ربط المورد بالمنتج)
CREATE TABLE IF NOT EXISTS public.supplier_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    commission_percentage DECIMAL(5,2) NOT NULL DEFAULT 10 CHECK (commission_percentage >= 0 AND commission_percentage <= 100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (supplier_id, product_id)
);

-- 2. جدول أرباح الموردين
CREATE TABLE IF NOT EXISTS public.supplier_earnings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE SET NULL,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE SET NULL,
    amount DECIMAL(10,2) NOT NULL,
    commission_percentage DECIMAL(5,2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    paid_at TIMESTAMPTZ
);

-- 3. جدول طلبات السحب
CREATE TABLE IF NOT EXISTS public.supplier_withdrawals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
    payment_method TEXT,
    payment_details TEXT,
    admin_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at TIMESTAMPTZ,
    processed_by UUID REFERENCES auth.users(id)
);

-- تفعيل RLS
ALTER TABLE public.supplier_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_withdrawals ENABLE ROW LEVEL SECURITY;

-- سياسات supplier_products
CREATE POLICY "Suppliers can view their own products" ON public.supplier_products
    FOR SELECT USING (auth.uid() = supplier_id);

CREATE POLICY "Admins can manage supplier products" ON public.supplier_products
    FOR ALL USING (public.is_admin_or_owner(auth.uid()));

-- سياسات supplier_earnings
CREATE POLICY "Suppliers can view their own earnings" ON public.supplier_earnings
    FOR SELECT USING (auth.uid() = supplier_id);

CREATE POLICY "Admins can manage earnings" ON public.supplier_earnings
    FOR ALL USING (public.is_admin_or_owner(auth.uid()));

-- سياسات supplier_withdrawals
CREATE POLICY "Suppliers can view their withdrawals" ON public.supplier_withdrawals
    FOR SELECT USING (auth.uid() = supplier_id);

CREATE POLICY "Suppliers can create withdrawals" ON public.supplier_withdrawals
    FOR INSERT WITH CHECK (auth.uid() = supplier_id);

CREATE POLICY "Admins can manage withdrawals" ON public.supplier_withdrawals
    FOR ALL USING (public.is_admin_or_owner(auth.uid()));

-- إضافة الفهارس
CREATE INDEX IF NOT EXISTS idx_supplier_products_supplier ON public.supplier_products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_earnings_supplier ON public.supplier_earnings(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_withdrawals_supplier ON public.supplier_withdrawals(supplier_id);

-- تم تفعيل Realtime للجداول
ALTER PUBLICATION supabase_realtime ADD TABLE public.supplier_products;
ALTER PUBLICATION supabase_realtime ADD TABLE public.supplier_earnings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.supplier_withdrawals;
