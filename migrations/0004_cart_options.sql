-- Add product options support to cart
-- Migration: 0004_cart_options.sql

-- cart 테이블에 product_option_id 추가
ALTER TABLE cart ADD COLUMN product_option_id INTEGER;

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_cart_option_id ON cart(product_option_id);
