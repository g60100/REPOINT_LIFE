-- 리뷰 시스템 확장
-- Review System Enhancement

-- 상품 리뷰 테이블 (이미 존재하지만 확장)
-- reviews 테이블은 0002_extended_features.sql에 이미 정의됨

-- 리뷰 이미지
CREATE TABLE IF NOT EXISTS review_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  review_id INTEGER NOT NULL,
  
  image_url TEXT NOT NULL,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE
);

-- 리뷰 좋아요
CREATE TABLE IF NOT EXISTS review_likes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  review_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  
  UNIQUE(review_id, user_id)
);

-- 리뷰 신고
CREATE TABLE IF NOT EXISTS review_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  review_id INTEGER NOT NULL,
  reporter_id INTEGER NOT NULL,
  
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE,
  FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 포인트 만료 정책
CREATE TABLE IF NOT EXISTS point_expirations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  user_id INTEGER NOT NULL,
  
  points INTEGER NOT NULL,
  
  earned_at DATETIME NOT NULL,
  expires_at DATETIME NOT NULL,
  
  status TEXT DEFAULT 'active', -- 'active', 'used', 'expired'
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 정산 스케줄
CREATE TABLE IF NOT EXISTS settlement_schedules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  schedule_type TEXT NOT NULL, -- 'daily', 'weekly', 'monthly'
  
  target_role TEXT NOT NULL, -- 'merchant', 'dealer', 'agency', 'branch', 'influencer'
  
  last_run_at DATETIME,
  next_run_at DATETIME NOT NULL,
  
  status TEXT DEFAULT 'active', -- 'active', 'paused'
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 정산 내역
CREATE TABLE IF NOT EXISTS settlements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  user_id INTEGER NOT NULL,
  
  settlement_type TEXT NOT NULL, -- 'revenue', 'commission', 'influencer'
  
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  amount REAL NOT NULL,
  
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'paid', 'rejected'
  
  approved_at DATETIME,
  paid_at DATETIME,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_review_images_review ON review_images(review_id);
CREATE INDEX IF NOT EXISTS idx_review_likes_review ON review_likes(review_id);
CREATE INDEX IF NOT EXISTS idx_review_likes_user ON review_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_review_reports_review ON review_reports(review_id);
CREATE INDEX IF NOT EXISTS idx_point_expirations_user ON point_expirations(user_id);
CREATE INDEX IF NOT EXISTS idx_point_expirations_expires ON point_expirations(expires_at);
CREATE INDEX IF NOT EXISTS idx_settlements_user ON settlements(user_id);
CREATE INDEX IF NOT EXISTS idx_settlements_status ON settlements(status);
