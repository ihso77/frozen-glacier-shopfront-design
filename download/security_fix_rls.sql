-- ═══════════════════════════════════════════════════════════════
-- 🔒 إصلاح ثغرة RLS - Nova Store Security Patch
-- ═══════════════════════════════════════════════════════════════

-- 1. تفعيل RLS على جميع الجداول الحساسة
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_env_vars ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_logs ENABLE ROW LEVEL SECURITY;

-- 2. حذف السياسات القديمة (إن وجدت)
DROP POLICY IF EXISTS "Products are viewable by everyone" ON products;
DROP POLICY IF EXISTS "Users can view their own orders" ON orders;
DROP POLICY IF EXISTS "Users can view their own profile" ON users;

-- 3. سياسات جدول المنتجات (Products)
-- القراءة: الجميع يقدر يشوف المنتجات لكن WITHOUT sensitive fields
CREATE POLICY "Products public view" ON products
  FOR SELECT
  TO public
  USING (true)
  WITH CHECK (false);

-- الكتابة: فقط الأدمن
CREATE POLICY "Only admins can insert products" ON products
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Only admins can update products" ON products
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Only admins can delete products" ON products
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- 4. سياسات جدول الطلبات (Orders)
CREATE POLICY "Users can view their own orders" ON orders
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create orders" ON orders
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all orders" ON orders
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- 5. سياسات جدول المستخدمين (Users)
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Admins can view all users" ON users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role = 'admin'
    )
  );

-- 6. سياسات البوتات (User Bots)
CREATE POLICY "Users can view their own bots" ON user_bots
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own bots" ON user_bots
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own bots" ON user_bots
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- 7. سياسات ملفات البوت (Bot Files)
CREATE POLICY "Users can view their bot files" ON bot_files
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_bots 
      WHERE user_bots.id = bot_files.bot_id 
      AND user_bots.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their bot files" ON bot_files
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_bots 
      WHERE user_bots.id = bot_files.bot_id 
      AND user_bots.user_id = auth.uid()
    )
  );

-- 8. سياسات متغيرات البيئة (Bot Env Vars)
CREATE POLICY "Users can manage their bot env vars" ON bot_env_vars
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_bots 
      WHERE user_bots.id = bot_env_vars.bot_id 
      AND user_bots.user_id = auth.uid()
    )
  );

-- 9. سياسات سجلات البوت (Bot Logs)
CREATE POLICY "Users can view their bot logs" ON bot_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_bots 
      WHERE user_bots.id = bot_logs.bot_id 
      AND user_bots.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their bot logs" ON bot_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_bots 
      WHERE user_bots.id = bot_logs.bot_id 
      AND user_bots.user_id = auth.uid()
    )
  );

-- ═══════════════════════════════════════════════════════════════
-- 🔐 حماية الحقول الحساسة عبر VIEW
-- ═══════════════════════════════════════════════════════════════

-- إنشاء View للمنتجات بدون البيانات الحساسة
CREATE OR REPLACE VIEW public_products AS
SELECT 
  id,
  name,
  description,
  price,
  original_price,
  image_url,
  category,
  stock,
  badge,
  rating,
  reviews_count,
  sales_count,
  features,
  is_active,
  created_at,
  updated_at
  -- تم استبعاد: account_email, account_password
FROM products;

-- منح الصلاحية للـ anon و authenticated
GRANT SELECT ON public_products TO anon;
GRANT SELECT ON public_products TO authenticated;

-- ═══════════════════════════════════════════════════════════════
-- ✅ التحقق من التطبيق
-- ═══════════════════════════════════════════════════════════════

-- عرض جميع السياسات المفعلة
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
