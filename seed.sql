-- Insert sample products
INSERT INTO products (name, description, price, points_rate, category, image_url) VALUES
  ('프리미엄 오메가3', '고품질 오메가3 EPA+DHA 함유', 89000, 10, '건강기능식품', 'https://via.placeholder.com/300x300/3B82F6/FFFFFF?text=Omega3'),
  ('비타민 D 고함량', '면역력 강화를 위한 비타민 D', 45000, 10, '건강기능식품', 'https://via.placeholder.com/300x300/8B5CF6/FFFFFF?text=VitaminD'),
  ('프로바이오틱스 30캡슐', '장 건강을 위한 유산균', 67000, 10, '건강기능식품', 'https://via.placeholder.com/300x300/10B981/FFFFFF?text=Probiotics'),
  ('콜라겐 펩타이드', '피부 탄력을 위한 저분자 콜라겐', 98000, 10, '건강기능식품', 'https://via.placeholder.com/300x300/F59E0B/FFFFFF?text=Collagen'),
  ('루테인 지아잔틴', '눈 건강을 위한 루테인', 55000, 10, '건강기능식품', 'https://via.placeholder.com/300x300/EF4444/FFFFFF?text=Lutein'),
  ('밀크씨슬 실리마린', '간 건강을 위한 밀크씨슬', 72000, 10, '건강기능식품', 'https://via.placeholder.com/300x300/06B6D4/FFFFFF?text=MilkThistle');

-- Insert sample stores
INSERT INTO stores (name, tier, rating, reviews_count, address, distance, discount_rate, points_rate, image_url) VALUES
  ('스타벅스 강남점', 'Diamond', 4.9, 1234, '서울시 강남구 테헤란로 123', '0.5km', 10, 5, 'https://via.placeholder.com/300x200'),
  ('투썸플레이스 역삼점', 'Platinum', 4.7, 856, '서울시 강남구 역삼로 456', '1.2km', 8, 4, 'https://via.placeholder.com/300x200'),
  ('본죽&비빔밥 선릉점', 'Gold', 4.6, 543, '서울시 강남구 선릉로 789', '0.8km', 12, 6, 'https://via.placeholder.com/300x200'),
  ('이디야커피 삼성점', 'Silver', 4.5, 321, '서울시 강남구 삼성로 234', '1.5km', 5, 3, 'https://via.placeholder.com/300x200'),
  ('파리바게뜨 대치점', 'Gold', 4.7, 678, '서울시 강남구 대치동 567', '0.9km', 8, 4, 'https://via.placeholder.com/300x200');

-- Insert test user
INSERT INTO users (email, password, name, phone, points) VALUES
  ('test@repoint.life', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '테스트유저', '010-1234-5678', 4500);

-- Insert points history for test user
INSERT INTO points_history (user_id, amount, type, description) VALUES
  (1, 1000, 'signup', '회원가입 축하 포인트'),
  (1, 3500, 'purchase', '상품 구매 적립'),
  (1, -1000, 'use', '온라인 쇼핑 사용'),
  (1, 1000, 'referral', '친구 초대 보너스');
