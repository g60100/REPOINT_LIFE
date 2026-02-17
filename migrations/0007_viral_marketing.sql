-- 바이럴 마케팅 및 친구 초대 시스템
-- Viral Marketing & Referral System

-- 친구 초대 테이블
CREATE TABLE IF NOT EXISTS referrals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  referrer_id INTEGER NOT NULL,
  referee_id INTEGER NOT NULL,
  
  referral_code TEXT UNIQUE NOT NULL,
  
  status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'rewarded'
  
  reward_points INTEGER DEFAULT 5000,
  rewarded_at DATETIME,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (referrer_id) REFERENCES users(id),
  FOREIGN KEY (referee_id) REFERENCES users(id)
);

-- 가입 이벤트 테이블
CREATE TABLE IF NOT EXISTS signup_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  user_id INTEGER NOT NULL,
  
  event_type TEXT NOT NULL, -- 'signup_bonus', 'first_purchase', 'friend_referral'
  
  points_awarded INTEGER DEFAULT 0,
  cashback_amount REAL DEFAULT 0,
  
  awarded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 출석 체크 테이블
CREATE TABLE IF NOT EXISTS daily_checkins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  user_id INTEGER NOT NULL,
  
  checkin_date DATE NOT NULL,
  
  points_awarded INTEGER DEFAULT 100,
  
  streak_days INTEGER DEFAULT 1,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id),
  
  UNIQUE(user_id, checkin_date)
);

-- 가맹점 자동 발굴 큐
CREATE TABLE IF NOT EXISTS store_discovery_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  store_name TEXT NOT NULL,
  business_number TEXT,
  
  address TEXT,
  phone TEXT,
  category TEXT,
  
  source TEXT, -- 'naver', 'kakao', 'baemin', 'yogiyo'
  source_url TEXT,
  
  ai_score REAL DEFAULT 0,
  priority INTEGER DEFAULT 0,
  
  status TEXT DEFAULT 'pending', -- 'pending', 'invited', 'registered', 'rejected'
  
  invitation_sent_at DATETIME,
  registered_at DATETIME,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 대량 발송 로그
CREATE TABLE IF NOT EXISTS bulk_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  campaign_name TEXT NOT NULL,
  
  message_type TEXT NOT NULL, -- 'email', 'sms', 'kakao'
  
  target_count INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  fail_count INTEGER DEFAULT 0,
  
  template TEXT,
  
  status TEXT DEFAULT 'pending', -- 'pending', 'sending', 'completed', 'failed'
  
  started_at DATETIME,
  completed_at DATETIME,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 바이럴 콘텐츠 추적
CREATE TABLE IF NOT EXISTS viral_content (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  platform TEXT NOT NULL, -- 'tiktok', 'youtube', 'instagram', 'facebook'
  
  content_type TEXT NOT NULL, -- 'video', 'image', 'post'
  content_url TEXT,
  
  influencer_name TEXT,
  
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  
  conversion_count INTEGER DEFAULT 0,
  
  budget REAL DEFAULT 0,
  roi REAL DEFAULT 0,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referee ON referrals(referee_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_checkins_user ON daily_checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_checkins_date ON daily_checkins(checkin_date);
CREATE INDEX IF NOT EXISTS idx_store_queue_status ON store_discovery_queue(status);
CREATE INDEX IF NOT EXISTS idx_store_queue_priority ON store_discovery_queue(priority DESC);
