-- Update existing products with new fields
UPDATE products SET product_type = 'internal', supplier = 'REPOINT' WHERE id <= 6;

-- Generate referral codes for test user
UPDATE users SET referral_code = 'TEST2024' WHERE id = 1;

-- Insert product images (multiple images per product)
INSERT INTO product_images (product_id, image_url, display_order, is_primary) VALUES
  (1, 'https://via.placeholder.com/600x600/3B82F6/FFFFFF?text=Omega3+Main', 0, 1),
  (1, 'https://via.placeholder.com/600x600/3B82F6/FFFFFF?text=Omega3+Detail1', 1, 0),
  (1, 'https://via.placeholder.com/600x600/3B82F6/FFFFFF?text=Omega3+Detail2', 2, 0),
  (2, 'https://via.placeholder.com/600x600/8B5CF6/FFFFFF?text=VitaminD+Main', 0, 1),
  (2, 'https://via.placeholder.com/600x600/8B5CF6/FFFFFF?text=VitaminD+Detail', 1, 0),
  (3, 'https://via.placeholder.com/600x600/10B981/FFFFFF?text=Probiotics+Main', 0, 1);

-- Insert product options (사이즈, 수량 옵션)
INSERT INTO product_options (product_id, option_name, option_value, price_adjustment, stock) VALUES
  (1, '수량', '1개월분 (30캡슐)', 0, 50),
  (1, '수량', '3개월분 (90캡슐)', 50000, 30),
  (1, '수량', '6개월분 (180캡슐)', 90000, 20),
  (2, '수량', '1개월분', 0, 100),
  (2, '수량', '3개월분', 40000, 50),
  (3, '수량', '1개월분', 0, 80),
  (3, '수량', '2개월분', 30000, 40);

-- Insert sample reviews
INSERT INTO reviews (user_id, product_id, rating, title, content) VALUES
  (1, 1, 5, '정말 좋아요!', '오메가3 먹고 피부가 좋아졌어요. 강력 추천합니다!'),
  (1, 2, 4, '괜찮은 제품', '비타민D 효과는 좋은데 캡슐이 좀 커요'),
  (1, 3, 5, '장 건강에 도움됨', '유산균 먹고 소화가 잘 되네요');

-- Insert review images
INSERT INTO review_images (review_id, image_url) VALUES
  (1, 'https://via.placeholder.com/400x400/3B82F6/FFFFFF?text=Review+Photo1'),
  (1, 'https://via.placeholder.com/400x400/3B82F6/FFFFFF?text=Review+Photo2');

-- Insert additional internal products (자사 제품)
INSERT INTO products (name, description, price, points_rate, category, image_url, stock, product_type, supplier) VALUES
  ('REPOINT 멀티비타민', '하루 한 알로 필수 비타민 보충', 35000, 15, '건강기능식품', 'https://via.placeholder.com/300x300/F97316/FFFFFF?text=MultiVitamin', 200, 'internal', 'REPOINT'),
  ('REPOINT 면역력 부스터', '환절기 면역력 강화', 79000, 15, '건강기능식품', 'https://via.placeholder.com/300x300/0EA5E9/FFFFFF?text=Immune+Booster', 150, 'internal', 'REPOINT'),
  ('REPOINT 관절 건강 MSM', '관절과 연골 건강', 68000, 15, '건강기능식품', 'https://via.placeholder.com/300x300/84CC16/FFFFFF?text=MSM', 100, 'internal', 'REPOINT'),
  ('REPOINT 마그네슘', '수면과 근육 이완', 42000, 15, '건강기능식품', 'https://via.placeholder.com/300x300/A855F7/FFFFFF?text=Magnesium', 180, 'internal', 'REPOINT');

-- Insert external products (외부 제품 예시)
INSERT INTO products (name, description, price, points_rate, category, image_url, stock, product_type, supplier, external_url) VALUES
  ('아이허브 베스트 오메가3', '미국 직구 인기 오메가3', 125000, 5, '건강기능식품', 'https://via.placeholder.com/300x300/DC2626/FFFFFF?text=iHerb+Omega3', 50, 'external', 'iHerb', 'https://www.iherb.com'),
  ('아마존 프로틴 파우더', '미국 아마존 베스트셀러 단백질', 98000, 5, '건강기능식품', 'https://via.placeholder.com/300x300/059669/FFFFFF?text=Amazon+Protein', 30, 'external', 'Amazon', 'https://www.amazon.com');
