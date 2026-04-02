-- إصلاح البوتات الموجودة للمستخدمين الذين اشتروا بوت البرودكاست

-- 1. إنشاء البوت للمستخدمين الذين اشتروا منتج البوت
INSERT INTO user_bots (user_id, product_id, name, status)
SELECT 
  o.user_id,
  o.product_id,
  o.product_name,
  'stopped'
FROM orders o
JOIN products p ON p.id = o.product_id
WHERE p.account_password = 'FILE_DOWNLOAD'
AND p.account_email LIKE '%.zip'
AND NOT EXISTS (
  SELECT 1 FROM user_bots ub 
  WHERE ub.user_id = o.user_id AND ub.product_id = o.product_id
);

-- 2. إضافة متغيرات البيئة الافتراضية
INSERT INTO bot_env_vars (bot_id, key, value, is_secret)
SELECT ub.id, 'DISCORD_TOKEN', '', true
FROM user_bots ub
WHERE NOT EXISTS (
  SELECT 1 FROM bot_env_vars bev WHERE bev.bot_id = ub.id
);

INSERT INTO bot_env_vars (bot_id, key, value, is_secret)
SELECT ub.id, 'PREFIX', '!', false
FROM user_bots ub
WHERE NOT EXISTS (
  SELECT 1 FROM bot_env_vars bev WHERE bev.bot_id = ub.id AND bev.key = 'PREFIX'
);

INSERT INTO bot_env_vars (bot_id, key, value, is_secret)
SELECT ub.id, 'OWNER_ID', '', true
FROM user_bots ub
WHERE NOT EXISTS (
  SELECT 1 FROM bot_env_vars bev WHERE bev.bot_id = ub.id AND bev.key = 'OWNER_ID'
);

-- 3. إضافة سجل للبوتات الجديدة
INSERT INTO bot_logs (bot_id, log_type, message)
SELECT ub.id, 'info', '✅ تم إنشاء البوت! أضف التوكن في متغيرات البيئة ثم اضغط تحميل.'
FROM user_bots ub
WHERE NOT EXISTS (
  SELECT 1 FROM bot_logs bl WHERE bl.bot_id = ub.id
);

-- 4. التحقق من النتيجة
SELECT 
  ub.id as bot_id,
  ub.name as bot_name,
  ub.status,
  u.email as user_email,
  p.name as product_name
FROM user_bots ub
JOIN auth.users u ON u.id = ub.user_id
LEFT JOIN products p ON p.id = ub.product_id
ORDER BY ub.created_at DESC;
