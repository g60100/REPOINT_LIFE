-- Add admin role system
-- Migration: 0003_add_admin_role.sql

-- users 테이블에 role 컬럼 추가
ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user';

-- 기존 첫 번째 사용자를 관리자로 설정
UPDATE users SET role = 'admin' WHERE id = 1;

-- role 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
