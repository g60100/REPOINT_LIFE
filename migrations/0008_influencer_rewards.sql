-- 인플루언서 보상 시스템
-- Influencer Reward System

-- 인플루언서 테이블
CREATE TABLE IF NOT EXISTS influencers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  user_id INTEGER NOT NULL,
  
  influencer_name TEXT NOT NULL,
  platform TEXT NOT NULL, -- 'youtube', 'tiktok', 'instagram', 'blog'
  channel_url TEXT,
  
  follower_count INTEGER DEFAULT 0,
  
  referral_code TEXT UNIQUE NOT NULL,
  
  commission_rate REAL DEFAULT 0.05, -- 5% 기본
  
  status TEXT DEFAULT 'active', -- 'active', 'inactive', 'suspended'
  
  total_clicks INTEGER DEFAULT 0,
  total_conversions INTEGER DEFAULT 0,
  total_revenue REAL DEFAULT 0,
  total_commission REAL DEFAULT 0,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 인플루언서 클릭 추적
CREATE TABLE IF NOT EXISTS influencer_clicks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  influencer_id INTEGER NOT NULL,
  
  user_ip TEXT,
  user_agent TEXT,
  
  clicked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (influencer_id) REFERENCES influencers(id)
);

-- 인플루언서 전환 추적 (가입/구매)
CREATE TABLE IF NOT EXISTS influencer_conversions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  influencer_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  
  conversion_type TEXT NOT NULL, -- 'signup', 'purchase', 'subscription'
  
  amount REAL DEFAULT 0,
  commission REAL DEFAULT 0,
  
  converted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (influencer_id) REFERENCES influencers(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 인플루언서 정산
CREATE TABLE IF NOT EXISTS influencer_settlements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  influencer_id INTEGER NOT NULL,
  
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  total_clicks INTEGER DEFAULT 0,
  total_conversions INTEGER DEFAULT 0,
  total_revenue REAL DEFAULT 0,
  total_commission REAL DEFAULT 0,
  
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'paid'
  
  paid_at DATETIME,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (influencer_id) REFERENCES influencers(id)
);

-- 인플루언서 콘텐츠
CREATE TABLE IF NOT EXISTS influencer_content (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  influencer_id INTEGER NOT NULL,
  
  content_type TEXT NOT NULL, -- 'video', 'post', 'story', 'blog'
  content_url TEXT,
  
  platform TEXT NOT NULL,
  
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  
  payment_amount REAL DEFAULT 0,
  payment_status TEXT DEFAULT 'pending', -- 'pending', 'paid'
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (influencer_id) REFERENCES influencers(id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_influencers_code ON influencers(referral_code);
CREATE INDEX IF NOT EXISTS idx_influencer_clicks_influencer ON influencer_clicks(influencer_id);
CREATE INDEX IF NOT EXISTS idx_influencer_conversions_influencer ON influencer_conversions(influencer_id);
CREATE INDEX IF NOT EXISTS idx_influencer_settlements_influencer ON influencer_settlements(influencer_id);
CREATE INDEX IF NOT EXISTS idx_influencer_content_influencer ON influencer_content(influencer_id);
