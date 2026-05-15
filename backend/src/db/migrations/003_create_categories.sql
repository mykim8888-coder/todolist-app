-- Migration: 003 | depends on: 001
-- categories 테이블, (user_id, name) WHERE user_id IS NOT NULL 부분 고유 인덱스

CREATE TABLE categories (
    id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID
               REFERENCES users (id) ON DELETE CASCADE,
    name       VARCHAR(100) NOT NULL,
    is_default BOOLEAN      NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_categories_user_name
    ON categories (user_id, name)
    WHERE user_id IS NOT NULL;

CREATE INDEX idx_categories_user_id
    ON categories (user_id);
