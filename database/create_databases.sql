-- TodoListApp 개발·테스트 DB 생성
-- 실행: psql -U postgres -f database/create_databases.sql

SELECT 'CREATE DATABASE todolist_dev'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'todolist_dev')\gexec

SELECT 'CREATE DATABASE todolist_test'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'todolist_test')\gexec
