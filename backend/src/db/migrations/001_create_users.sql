-- Migration: 001 | depends on: (none)
-- pgcrypto 확장, set_updated_at() 트리거 함수, users 테이블, 트리거, 인덱스

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE users (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    email         VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255),
    name          VARCHAR(100) NOT NULL,
    auth_provider VARCHAR(20)  NOT NULL DEFAULT 'local'
                  CHECK (auth_provider IN ('local', 'google', 'facebook')),
    provider_id   VARCHAR(255),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE UNIQUE INDEX idx_users_email_local
    ON users (email)
    WHERE email IS NOT NULL;

CREATE INDEX idx_users_provider
    ON users (auth_provider, provider_id)
    WHERE provider_id IS NOT NULL;
