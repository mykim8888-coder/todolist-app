-- Migration: 005 | depends on: 003
-- 기본 카테고리 3건 INSERT (user_id = NULL, is_default = true)
-- ON CONFLICT DO NOTHING으로 멱등성 보장

INSERT INTO categories (name, is_default) VALUES
    ('일반', true),
    ('업무', true),
    ('개인', true)
ON CONFLICT DO NOTHING;
