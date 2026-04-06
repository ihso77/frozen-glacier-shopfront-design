-- ============================================
-- Hosting Service Tables - Nova Store
-- ============================================

-- 1. جدول اشتراكات الاستضافة
CREATE TABLE IF NOT EXISTS hosting_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    bot_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'stopped', 'expired', 'suspended')),
    storage_used BIGINT DEFAULT 0,
    storage_limit BIGINT DEFAULT 104857600, -- 100MB default
    expires_at TIMESTAMPTZ NOT NULL,
    railway_deployment_id VARCHAR(255),
    railway_url VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. جدول ملفات البوت
CREATE TABLE IF NOT EXISTS bot_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID REFERENCES hosting_subscriptions(id) ON DELETE CASCADE NOT NULL,
    filename VARCHAR(500) NOT NULL,
    content TEXT,
    path VARCHAR(500) DEFAULT '/',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. جدول سجلات البوت
CREATE TABLE IF NOT EXISTS bot_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID REFERENCES hosting_subscriptions(id) ON DELETE CASCADE NOT NULL,
    log_message TEXT,
    log_type VARCHAR(20) DEFAULT 'info' CHECK (log_type IN ('info', 'error', 'warn', 'success')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- RLS Policies
-- ============================================

-- تعطيل RLS للتجربة
ALTER TABLE hosting_subscriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE bot_files DISABLE ROW LEVEL SECURITY;
ALTER TABLE bot_logs DISABLE ROW LEVEL SECURITY;

-- أو تفعيل RLS مع سياسات (للإنتاج)
-- ALTER TABLE hosting_subscriptions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE bot_files ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE bot_logs ENABLE ROW LEVEL SECURITY;

-- سياسات الوصول للمستخدمين
-- CREATE POLICY "hosting_subscriptions_own" ON hosting_subscriptions
--   FOR ALL USING (auth.uid() = user_id);

-- CREATE POLICY "bot_files_access" ON bot_files
--   FOR ALL USING (
--     EXISTS (SELECT 1 FROM hosting_subscriptions WHERE id = bot_files.subscription_id AND user_id = auth.uid())
--   );

-- CREATE POLICY "bot_logs_access" ON bot_logs
--   FOR SELECT USING (
--     EXISTS (SELECT 1 FROM hosting_subscriptions WHERE id = bot_logs.subscription_id AND user_id = auth.uid())
--   );

-- ============================================
-- Indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_hosting_subscriptions_user ON hosting_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_hosting_subscriptions_status ON hosting_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_bot_files_subscription ON bot_files(subscription_id);
CREATE INDEX IF NOT EXISTS idx_bot_logs_subscription ON bot_logs(subscription_id);

-- ============================================
-- Triggers for updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_hosting_subscriptions_updated_at
    BEFORE UPDATE ON hosting_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bot_files_updated_at
    BEFORE UPDATE ON bot_files
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- تعطيل RLS على الجداول الأخرى
-- ============================================

ALTER TABLE IF EXISTS products DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS site_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS product_credentials DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS coupons DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_bots DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS bot_env_vars DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS support_tickets DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ticket_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS reviews DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS wishlists DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS suppliers DISABLE ROW LEVEL SECURITY;
