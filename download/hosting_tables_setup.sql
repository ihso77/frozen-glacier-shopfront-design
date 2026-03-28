-- =============================================
-- Nova Store - Hosting Service Tables Setup
-- =============================================
-- Run this SQL in Supabase SQL Editor
-- =============================================

-- Hosting Subscriptions Table
CREATE TABLE IF NOT EXISTS hosting_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    bot_name VARCHAR(255) NOT NULL DEFAULT 'my-bot',
    status VARCHAR(50) NOT NULL DEFAULT 'stopped' CHECK (status IN ('active', 'stopped', 'suspended')),
    storage_used BIGINT NOT NULL DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bot Files Table
CREATE TABLE IF NOT EXISTS bot_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES hosting_subscriptions(id) ON DELETE CASCADE,
    filename VARCHAR(500) NOT NULL,
    content TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(subscription_id, filename)
);

-- Bot Logs Table
CREATE TABLE IF NOT EXISTS bot_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES hosting_subscriptions(id) ON DELETE CASCADE,
    log_message TEXT NOT NULL,
    log_type VARCHAR(20) NOT NULL DEFAULT 'info' CHECK (log_type IN ('info', 'error', 'warn', 'success', 'debug')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_hosting_subscriptions_user_id ON hosting_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_hosting_subscriptions_status ON hosting_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_bot_files_subscription_id ON bot_files(subscription_id);
CREATE INDEX IF NOT EXISTS idx_bot_logs_subscription_id ON bot_logs(subscription_id);
CREATE INDEX IF NOT EXISTS idx_bot_logs_created_at ON bot_logs(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE hosting_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON hosting_subscriptions;
DROP POLICY IF EXISTS "Users can insert their own subscriptions" ON hosting_subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscriptions" ON hosting_subscriptions;
DROP POLICY IF EXISTS "Users can manage their own subscriptions" ON hosting_subscriptions;
DROP POLICY IF EXISTS "Admins can manage all subscriptions" ON hosting_subscriptions;

DROP POLICY IF EXISTS "Users can view their own bot files" ON bot_files;
DROP POLICY IF EXISTS "Users can insert their own bot files" ON bot_files;
DROP POLICY IF EXISTS "Users can update their own bot files" ON bot_files;
DROP POLICY IF EXISTS "Users can delete their own bot files" ON bot_files;
DROP POLICY IF EXISTS "Users can manage their own bot files" ON bot_files;

DROP POLICY IF EXISTS "Users can view their own bot logs" ON bot_logs;
DROP POLICY IF EXISTS "Users can insert their own bot logs" ON bot_logs;
DROP POLICY IF EXISTS "Users can manage their own bot logs" ON bot_logs;

-- RLS Policies for hosting_subscriptions
CREATE POLICY "Users can view their own subscriptions" ON hosting_subscriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscriptions" ON hosting_subscriptions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscriptions" ON hosting_subscriptions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all subscriptions" ON hosting_subscriptions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'owner')
        )
    );

-- RLS Policies for bot_files
CREATE POLICY "Users can view their own bot files" ON bot_files
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM hosting_subscriptions 
            WHERE id = subscription_id 
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own bot files" ON bot_files
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM hosting_subscriptions 
            WHERE id = subscription_id 
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own bot files" ON bot_files
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM hosting_subscriptions 
            WHERE id = subscription_id 
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own bot files" ON bot_files
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM hosting_subscriptions 
            WHERE id = subscription_id 
            AND user_id = auth.uid()
        )
    );

-- RLS Policies for bot_logs
CREATE POLICY "Users can view their own bot logs" ON bot_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM hosting_subscriptions 
            WHERE id = subscription_id 
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own bot logs" ON bot_logs
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM hosting_subscriptions 
            WHERE id = subscription_id 
            AND user_id = auth.uid()
        )
    );

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at (drop if exists first)
DROP TRIGGER IF EXISTS update_hosting_subscriptions_updated_at ON hosting_subscriptions;
DROP TRIGGER IF EXISTS update_bot_files_updated_at ON bot_files;

CREATE TRIGGER update_hosting_subscriptions_updated_at
    BEFORE UPDATE ON hosting_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bot_files_updated_at
    BEFORE UPDATE ON bot_files
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON hosting_subscriptions TO authenticated;
GRANT ALL ON bot_files TO authenticated;
GRANT ALL ON bot_logs TO authenticated;

-- =============================================
-- Verification Query (run this separately)
-- =============================================
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- AND table_name IN ('hosting_subscriptions', 'bot_files', 'bot_logs');
