-- جدول لتخزين البوتات المشتراة
CREATE TABLE IF NOT EXISTS user_bots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  name TEXT NOT NULL,
  status TEXT DEFAULT 'stopped',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- جدول لتخزين ملفات البوت
CREATE TABLE IF NOT EXISTS bot_files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bot_id UUID NOT NULL REFERENCES user_bots(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  content TEXT,
  path TEXT DEFAULT '/',
  is_edited BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- جدول لتخزين متغيرات البيئة (التوكنات)
CREATE TABLE IF NOT EXISTS bot_env_vars (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bot_id UUID NOT NULL REFERENCES user_bots(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT,
  is_secret BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- جدول لتخزين اللوجات
CREATE TABLE IF NOT EXISTS bot_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bot_id UUID NOT NULL REFERENCES user_bots(id) ON DELETE CASCADE,
  log_type TEXT DEFAULT 'info',
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE user_bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_env_vars ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_logs ENABLE ROW LEVEL SECURITY;

-- Policies for user_bots
CREATE POLICY "Users can view their own bots" ON user_bots
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bots" ON user_bots
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bots" ON user_bots
  FOR UPDATE USING (auth.uid() = user_id);

-- Policies for bot_files
CREATE POLICY "Users can view their bot files" ON bot_files
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_bots WHERE id = bot_files.bot_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can insert their bot files" ON bot_files
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_bots WHERE id = bot_files.bot_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can update their bot files" ON bot_files
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM user_bots WHERE id = bot_files.bot_id AND user_id = auth.uid())
  );

-- Policies for bot_env_vars
CREATE POLICY "Users can manage their bot env vars" ON bot_env_vars
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_bots WHERE id = bot_env_vars.bot_id AND user_id = auth.uid())
  );

-- Policies for bot_logs
CREATE POLICY "Users can view their bot logs" ON bot_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_bots WHERE id = bot_logs.bot_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can insert their bot logs" ON bot_logs
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_bots WHERE id = bot_logs.bot_id AND user_id = auth.uid())
  );

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_bots_user_id ON user_bots(user_id);
CREATE INDEX IF NOT EXISTS idx_bot_files_bot_id ON bot_files(bot_id);
CREATE INDEX IF NOT EXISTS idx_bot_logs_bot_id ON bot_logs(bot_id);
