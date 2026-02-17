-- AI 쇼핑 큐레이션 시스템
-- AI Shopping Curation System

-- 제휴 상품 테이블 (해외/국내 인기 상품)
CREATE TABLE IF NOT EXISTS affiliate_products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- 기본 정보
  title TEXT NOT NULL,
  description TEXT,
  price REAL NOT NULL,
  currency TEXT DEFAULT 'KRW',
  image_url TEXT,
  
  -- 제휴 정보
  affiliate_url TEXT NOT NULL,
  source_platform TEXT NOT NULL, -- 'amazon', 'aliexpress', 'coupang', 'naver', etc.
  source_country TEXT NOT NULL, -- 'US', 'CN', 'KR', etc.
  commission_rate REAL DEFAULT 0,
  
  -- AI 분석
  ai_score REAL DEFAULT 0,
  popularity_score REAL DEFAULT 0,
  trend_score REAL DEFAULT 0,
  
  -- 카테고리
  category TEXT,
  tags TEXT, -- JSON array
  
  -- 통계
  click_count INTEGER DEFAULT 0,
  purchase_count INTEGER DEFAULT 0,
  
  -- 상태
  status TEXT DEFAULT 'active', -- 'active', 'inactive', 'out_of_stock'
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 제휴 플랫폼 설정
CREATE TABLE IF NOT EXISTS affiliate_platforms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  platform_name TEXT UNIQUE NOT NULL,
  platform_country TEXT NOT NULL,
  platform_type TEXT NOT NULL, -- 'overseas', 'domestic'
  
  api_key TEXT,
  api_secret TEXT,
  affiliate_id TEXT,
  
  is_active BOOLEAN DEFAULT 1,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 제휴 클릭 추적
CREATE TABLE IF NOT EXISTS affiliate_clicks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  user_id INTEGER,
  affiliate_product_id INTEGER NOT NULL,
  
  clicked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (affiliate_product_id) REFERENCES affiliate_products(id)
);

-- 제휴 구매 추적
CREATE TABLE IF NOT EXISTS affiliate_purchases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  user_id INTEGER,
  affiliate_product_id INTEGER NOT NULL,
  
  purchase_amount REAL NOT NULL,
  commission_earned REAL DEFAULT 0,
  
  purchased_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (affiliate_product_id) REFERENCES affiliate_products(id)
);

-- 기본 제휴 플랫폼 데이터
INSERT INTO affiliate_platforms (platform_name, platform_country, platform_type) VALUES
  ('Amazon', 'US', 'overseas'),
  ('AliExpress', 'CN', 'overseas'),
  ('eBay', 'US', 'overseas'),
  ('Rakuten', 'JP', 'overseas'),
  ('Taobao', 'CN', 'overseas'),
  ('Coupang', 'KR', 'domestic'),
  ('Naver Shopping', 'KR', 'domestic'),
  ('11st', 'KR', 'domestic'),
  ('Gmarket', 'KR', 'domestic'),
  ('SSG', 'KR', 'domestic');

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_affiliate_products_platform ON affiliate_products(source_platform);
CREATE INDEX IF NOT EXISTS idx_affiliate_products_category ON affiliate_products(category);
CREATE INDEX IF NOT EXISTS idx_affiliate_products_ai_score ON affiliate_products(ai_score DESC);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_user ON affiliate_clicks(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_purchases_user ON affiliate_purchases(user_id);
