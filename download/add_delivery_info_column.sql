-- ==========================================
-- إضافة عمود معلومات التسليم للمنتجات والطلبات
-- ==========================================

-- إضافة عمود delivery_info لجدول المنتجات
-- يخزن معلومات الحساب (البريد، كلمة المرور، ملاحظات)
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS delivery_info JSONB DEFAULT NULL;

-- إضافة عمود delivery_info لجدول الطلبات
-- يخزن نسخة من معلومات التسليم وقت الشراء
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS delivery_info JSONB DEFAULT NULL;

-- إنشاء فهرس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_products_delivery_info 
ON public.products USING GIN (delivery_info) 
WHERE delivery_info IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_delivery_info 
ON public.orders USING GIN (delivery_info) 
WHERE delivery_info IS NOT NULL;

-- تعليقات للتوثيق
COMMENT ON COLUMN public.products.delivery_info IS 'معلومات التسليم للمنتج (بريد، كلمة مرور، ملاحظات) - JSON: {email, password, notes}';
COMMENT ON COLUMN public.orders.delivery_info IS 'نسخة من معلومات التسليم وقت الشراء - JSON: {email, password, notes}';
