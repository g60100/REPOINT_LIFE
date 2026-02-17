-- AI 구독 시스템
-- AI Subscription System

-- 구독 플랜
CREATE TABLE IF NOT EXISTS subscription_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  plan_name TEXT NOT NULL,
  plan_type TEXT NOT NULL, -- 'merchant', 'member', 'influencer'
  
  price REAL NOT NULL,
  billing_cycle TEXT NOT NULL, -- 'monthly', 'yearly'
  
  features TEXT, -- JSON 형태로 기능 목록
  
  ai_credits INTEGER DEFAULT 0, -- AI 생성 크레딧
  
  status TEXT DEFAULT 'active', -- 'active', 'inactive'
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 사용자 구독
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  user_id INTEGER NOT NULL,
  plan_id INTEGER NOT NULL,
  
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  
  status TEXT DEFAULT 'active', -- 'active', 'cancelled', 'expired'
  
  auto_renew INTEGER DEFAULT 1,
  
  remaining_credits INTEGER DEFAULT 0,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (plan_id) REFERENCES subscription_plans(id)
);

-- AI 생성 콘텐츠
CREATE TABLE IF NOT EXISTS ai_generated_content (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  user_id INTEGER NOT NULL,
  subscription_id INTEGER NOT NULL,
  
  content_type TEXT NOT NULL, -- 'video_ad', 'flyer', 'social_post', 'banner'
  
  prompt TEXT NOT NULL,
  
  generated_url TEXT,
  thumbnail_url TEXT,
  
  ai_model TEXT, -- 'dall-e-3', 'midjourney', 'runway', 'sora'
  
  credits_used INTEGER DEFAULT 1,
  
  status TEXT DEFAULT 'pending', -- 'pending', 'generating', 'completed', 'failed'
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (subscription_id) REFERENCES user_subscriptions(id)
);

-- SNS 자동 발송
CREATE TABLE IF NOT EXISTS sns_auto_posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  user_id INTEGER NOT NULL,
  content_id INTEGER NOT NULL,
  
  platform TEXT NOT NULL, -- 'instagram', 'facebook', 'twitter', 'tiktok', 'youtube'
  
  post_text TEXT,
  hashtags TEXT,
  
  scheduled_at DATETIME,
  posted_at DATETIME,
  
  status TEXT DEFAULT 'pending', -- 'pending', 'scheduled', 'posted', 'failed'
  
  post_url TEXT,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (content_id) REFERENCES ai_generated_content(id)
);

-- 구독 결제 내역
CREATE TABLE IF NOT EXISTS subscription_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  subscription_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  
  amount REAL NOT NULL,
  
  payment_method TEXT, -- 'card', 'bank', 'points'
  
  status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'refunded'
  
  paid_at DATETIME,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (subscription_id) REFERENCES user_subscriptions(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 초기 구독 플랜 데이터
INSERT INTO subscription_plans (plan_name, plan_type, price, billing_cycle, features, ai_credits) VALUES
-- 가맹점 플랜
('가맹점 베이직', 'merchant', 29000, 'monthly', '{"video_ads": 5, "flyers": 10, "social_posts": 20}', 35),
('가맹점 프로', 'merchant', 79000, 'monthly', '{"video_ads": 20, "flyers": 50, "social_posts": 100, "priority_support": true}', 170),
('가맹점 프리미엄', 'merchant', 149000, 'monthly', '{"video_ads": 50, "flyers": 100, "social_posts": 300, "priority_support": true, "custom_ai": true}', 450),

-- 정회원 플랜
('정회원 베이직', 'member', 9900, 'monthly', '{"cashback_boost": "1.5x", "exclusive_deals": true, "ai_posts": 10}', 10),
('정회원 프리미엄', 'member', 19900, 'monthly', '{"cashback_boost": "2x", "exclusive_deals": true, "ai_posts": 30, "priority_customer": true}', 30),

-- 인플루언서 플랜
('인플루언서 스타터', 'influencer', 49000, 'monthly', '{"video_ads": 10, "social_posts": 50, "analytics": true}', 60),
('인플루언서 프로', 'influencer', 99000, 'monthly', '{"video_ads": 30, "social_posts": 150, "analytics": true, "auto_schedule": true}', 180),
('인플루언서 엘리트', 'influencer', 199000, 'monthly', '{"video_ads": 100, "social_posts": 500, "analytics": true, "auto_schedule": true, "custom_ai": true}', 600);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_ai_content_user ON ai_generated_content(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_content_status ON ai_generated_content(status);
CREATE INDEX IF NOT EXISTS idx_sns_posts_user ON sns_auto_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_sns_posts_status ON sns_auto_posts(status);
