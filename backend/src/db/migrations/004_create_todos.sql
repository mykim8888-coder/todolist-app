-- Migration: 004 | depends on: 001, 003
-- todos 테이블, chk_due_date_gte_start_date CHECK(BR-05), 트리거, 복합 인덱스

CREATE TABLE todos (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID         NOT NULL
                 REFERENCES users (id) ON DELETE CASCADE,
    category_id  UUID         NOT NULL
                 REFERENCES categories (id) ON DELETE RESTRICT,
    title        VARCHAR(255) NOT NULL,
    description  TEXT,
    start_date   DATE,
    due_date     DATE,
    is_completed BOOLEAN      NOT NULL DEFAULT false,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),

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

CREATE INDEX idx_todos_user_filter
    ON todos (user_id, is_completed, due_date);
