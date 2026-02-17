-- Migration: Multi-Level Organization System
-- 다단계 조직 및 수익 배분 시스템

-- 1. merchants 테이블 생성 (가맹점)
CREATE TABLE IF NOT EXISTS merchants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  business_name TEXT NOT NULL,
  category TEXT NOT NULL,
  address TEXT NOT NULL,
  latitude REAL,
  longitude REAL,
  phone TEXT,
  description TEXT,
  
  ai_registered BOOLEAN DEFAULT 1,
  ai_score REAL,
  sns_mentions INTEGER DEFAULT 0,
  
  subscription_tier TEXT,
  subscription_start DATE,
  subscription_end DATE,
  monthly_fee REAL DEFAULT 0,
  
  discount_rate REAL DEFAULT 0,
  has_coupon BOOLEAN DEFAULT 0,
  
  total_visits INTEGER DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  avg_rating REAL DEFAULT 0,
  
  dealer_id INTEGER,
  agency_id INTEGER,
  branch_id INTEGER,
  region_code TEXT,
  
  status TEXT DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (dealer_id) REFERENCES users(id),
  FOREIGN KEY (agency_id) REFERENCES users(id),
  FOREIGN KEY (branch_id) REFERENCES users(id)
);

-- 2. users 테이블 확장 (조직 구조)
-- role 컬럼은 0003 마이그레이션에서 이미 추가됨

ALTER TABLE users ADD COLUMN parent_id INTEGER;
ALTER TABLE users ADD COLUMN region_code TEXT;
ALTER TABLE users ADD COLUMN commission_rate REAL DEFAULT 0;
ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active';
ALTER TABLE users ADD COLUMN approved_by INTEGER;
ALTER TABLE users ADD COLUMN approved_at DATETIME;

-- 3. 지역 관리 테이블
CREATE TABLE IF NOT EXISTS regions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  level INTEGER NOT NULL,
  parent_code TEXT,
  manager_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (manager_id) REFERENCES users(id)
);

-- 4. 수익 배분 설정 테이블
CREATE TABLE IF NOT EXISTS commission_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT,
  region_code TEXT,
  hq_rate REAL DEFAULT 40,
  branch_rate REAL DEFAULT 20,
  agency_rate REAL DEFAULT 15,
  dealer_rate REAL DEFAULT 10,
  member_benefit_rate REAL DEFAULT 15,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 5. 수익 내역 테이블
CREATE TABLE IF NOT EXISTS revenue_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  merchant_id INTEGER NOT NULL,
  total_amount REAL NOT NULL,
  hq_amount REAL,
  branch_id INTEGER,
  branch_amount REAL,
  agency_id INTEGER,
  agency_amount REAL,
  dealer_id INTEGER,
  dealer_amount REAL,
  member_benefit_amount REAL,
  period_start DATE,
  period_end DATE,
  status TEXT DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (merchant_id) REFERENCES merchants(id),
  FOREIGN KEY (branch_id) REFERENCES users(id),
  FOREIGN KEY (agency_id) REFERENCES users(id),
  FOREIGN KEY (dealer_id) REFERENCES users(id)
);

-- 6. 기본 데이터 삽입

-- 기본 수익 배분 설정 (전체)
INSERT INTO commission_settings (
  category, region_code,
  hq_rate, branch_rate, agency_rate, dealer_rate, member_benefit_rate
) VALUES (
  NULL, NULL,
  40, 20, 15, 10, 15
);

-- 서울 지역
INSERT INTO regions (code, name, level, parent_code) VALUES
  ('seoul', '서울', 1, NULL),
  ('seoul-gangnam', '강남구', 2, 'seoul'),
  ('seoul-gangnam-yeoksam', '역삼동', 3, 'seoul-gangnam'),
  ('seoul-gangnam-nonhyeon', '논현동', 3, 'seoul-gangnam'),
  ('seoul-seocho', '서초구', 2, 'seoul'),
  ('seoul-songpa', '송파구', 2, 'seoul');

-- 부산 지역
INSERT INTO regions (code, name, level, parent_code) VALUES
  ('busan', '부산', 1, NULL),
  ('busan-haeundae', '해운대구', 2, 'busan'),
  ('busan-busanjin', '부산진구', 2, 'busan');

-- 대구 지역
INSERT INTO regions (code, name, level, parent_code) VALUES
  ('daegu', '대구', 1, NULL),
  ('daegu-jung', '중구', 2, 'daegu'),
  ('daegu-suseong', '수성구', 2, 'daegu');

-- 인천 지역
INSERT INTO regions (code, name, level, parent_code) VALUES
  ('incheon', '인천', 1, NULL),
  ('incheon-namdong', '남동구', 2, 'incheon'),
  ('incheon-yeonsu', '연수구', 2, 'incheon');
