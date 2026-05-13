-- =============================================================================
-- TodoListApp Database Schema
-- 참조: docs/6-erd.md | PRD v0.2.0-draft
-- PostgreSQL 17
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 확장 모듈
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()


-- ---------------------------------------------------------------------------
-- updated_at 자동 갱신 트리거 함수
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- =============================================================================
-- 1. users
-- =============================================================================
CREATE TABLE users (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    email         VARCHAR(255) UNIQUE,                          -- nullable: OAuth 전용 계정
    password_hash VARCHAR(255),                                 -- nullable: OAuth 사용자는 NULL
    name          VARCHAR(100) NOT NULL,
    auth_provider VARCHAR(20)  NOT NULL DEFAULT 'local'
                  CHECK (auth_provider IN ('local', 'google', 'facebook')),
    provider_id   VARCHAR(255),                                 -- nullable: local 인증은 NULL
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- local 계정은 email 필수 (BR-01)
CREATE UNIQUE INDEX idx_users_email_local
    ON users (email)
    WHERE email IS NOT NULL;

-- OAuth 계정 조회용
CREATE INDEX idx_users_provider
    ON users (auth_provider, provider_id)
    WHERE provider_id IS NOT NULL;


-- =============================================================================
-- 2. refresh_tokens
-- =============================================================================
CREATE TABLE refresh_tokens (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL
                REFERENCES users (id) ON DELETE CASCADE,       -- 탈퇴 시 자동 삭제 (NFR-04)
    token_hash  VARCHAR(64) NOT NULL,                          -- SHA-256 hex (64자)
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_refresh_tokens_user_id
    ON refresh_tokens (user_id);

CREATE INDEX idx_refresh_tokens_hash
    ON refresh_tokens (token_hash);


-- =============================================================================
-- 3. categories
-- =============================================================================
CREATE TABLE categories (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID                                             -- nullable: NULL = 기본 카테고리
               REFERENCES users (id) ON DELETE CASCADE,
    name       VARCHAR(100) NOT NULL,
    is_default BOOLEAN      NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- 동일 사용자 내 카테고리명 중복 불가 (UC-09, BR)
-- 기본 카테고리(user_id IS NULL)는 제외하여 시스템 카테고리 복수 허용
CREATE UNIQUE INDEX idx_categories_user_name
    ON categories (user_id, name)
    WHERE user_id IS NOT NULL;

CREATE INDEX idx_categories_user_id
    ON categories (user_id);


-- =============================================================================
-- 4. todos
-- =============================================================================
CREATE TABLE todos (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID        NOT NULL
                 REFERENCES users (id) ON DELETE CASCADE,
    category_id  UUID        NOT NULL
                 REFERENCES categories (id) ON DELETE RESTRICT, -- BR-07: 앱 레이어에서 재배정 후 삭제
    title        VARCHAR(255) NOT NULL,
    description  TEXT,                                           -- nullable
    start_date   DATE,                                           -- nullable
    due_date     DATE,                                           -- nullable
    is_completed BOOLEAN      NOT NULL DEFAULT false,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),

    -- BR-05: 종료예정일 >= 시작일 (둘 다 입력된 경우에만 검사)
    CONSTRAINT chk_due_date_gte_start_date
        CHECK (due_date IS NULL OR start_date IS NULL OR due_date >= start_date)
);

CREATE TRIGGER trg_todos_updated_at
    BEFORE UPDATE ON todos
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_todos_user_id
    ON todos (user_id);

CREATE INDEX idx_todos_category_id
    ON todos (category_id);

-- UC-08 필터 조회 성능: 완료 여부 + 종료예정일
CREATE INDEX idx_todos_user_filter
    ON todos (user_id, is_completed, due_date);


-- =============================================================================
-- 5. 초기 데이터: 기본 카테고리 (Seed)
-- user_id = NULL, is_default = true
-- BR-07 재배정 대상: '일반' 카테고리
-- =============================================================================
INSERT INTO categories (name, is_default) VALUES
    ('일반',   true),
    ('업무',   true),
    ('개인',   true);
