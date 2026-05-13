# TodoListApp 실행계획

> 버전: 1.0.0 | 작성일: 2026-05-13
> 참조 문서: PRD v0.2.0-draft (`docs/2-prd.md`) · 설계 원칙 (`docs/4-project-principles.md`) · ERD (`docs/6-erd.md`)

---

## 목차

1. [개요](#1-개요)
2. [데이터베이스 영역](#2-데이터베이스-영역-db)
3. [백엔드 영역](#3-백엔드-영역-be)
4. [프론트엔드 영역](#4-프론트엔드-영역-fe)
5. [전체 의존성 다이어그램](#5-전체-의존성-다이어그램)
6. [3일 개발 일정 매핑](#6-3일-개발-일정-매핑)

---

## 1. 개요

### 1.1 프로젝트 스택

| 영역 | 기술 |
|------|------|
| 프론트엔드 | React 19, TypeScript, Zustand, TanStack Query, Vite |
| 백엔드 | Node.js, Express, JWT (Access 15분 / Refresh 7일) |
| 데이터베이스 | PostgreSQL 17, **pg 라이브러리** (ORM 사용 금지) |
| 인증 보안 | bcrypt salt ≥ 12, Token Rotation, SHA-256 해싱, HttpOnly Cookie |

### 1.2 Task 통계

| 영역 | Task 수 | 예상 총 소요 시간 |
|------|---------|----------------|
| 데이터베이스 (DB) | 7개 | ~3.5시간 |
| 백엔드 (BE) | 11개 | ~23.5시간 |
| 프론트엔드 (FE) | 15개 | ~29.5시간 |
| **합계** | **33개** | **~56.5시간** |

### 1.3 완료 조건 범례

> 각 Task의 체크박스는 **구현 완료 검증** 기준입니다.
> 의존 Task가 모두 완료된 후에 착수해야 합니다.

---

## 2. 데이터베이스 영역 (DB)

> `database/` 및 `backend/src/db/` 하위 인프라 파일 담당.
> PostgreSQL 17 + pg 라이브러리 필수. ORM 사용 금지.

---

### DB-01 | 마이그레이션 SQL 파일 분리 작성

**의존**: 없음 | **예상 소요**: 30분

`database/schema.sql`(단일 파일 DDL)을 `backend/src/db/migrations/` 아래 5개의 개별 마이그레이션 파일로 분리한다. 번호 순서대로 실행 시 최종 스키마가 완성되어야 한다.

- `001_create_users.sql`: pgcrypto 확장, `set_updated_at()` 트리거 함수, users 테이블, 트리거, 인덱스
- `002_create_refresh_tokens.sql`: refresh_tokens 테이블 + 인덱스
- `003_create_categories.sql`: categories 테이블, `(user_id, name) WHERE user_id IS NOT NULL` 부분 고유 인덱스
- `004_create_todos.sql`: todos 테이블, `chk_due_date_gte_start_date` CHECK(BR-05), 트리거, 복합 인덱스
- `005_seed_default_categories.sql`: 기본 카테고리 3건 INSERT (`user_id = NULL`, `is_default = true`). `ON CONFLICT DO NOTHING`으로 멱등성 보장

각 파일 상단에 `-- Migration: NNN | depends on: NNN` 주석으로 의존성 명시.

**완료 조건**
- [ ] `backend/src/db/migrations/`에 5개 파일 모두 존재하고 파일명이 요구사항 형식과 일치한다
- [ ] 001→005 순서로 빈 DB에 실행 시 오류 없이 완료되며 테이블 4개·인덱스 8개·트리거 2개가 생성된다
- [ ] `005_seed_default_categories.sql`을 2회 이상 반복 실행해도 데이터 중복이 발생하지 않는다
- [ ] schema.sql 기준 모든 FK·CHECK·UNIQUE 부분 인덱스가 분리 파일에 동일하게 포함된다

---

### DB-02 | pg Pool 싱글톤 구현

**의존**: 없음 | **예상 소요**: 20분

`backend/src/db/pool.ts` 파일을 작성하여 애플리케이션 전역에서 단일 Pool 인스턴스를 공유한다.

- `export const pool`: max: 20, idleTimeoutMillis: 30000, connectionTimeoutMillis: 5000
- `pool.on('error', ...)`: 유휴 커넥션 오류 로깅 (프로세스 종료 없음)
- `export async function closePool()`: `pool.end()` 래핑 — Graceful Shutdown 및 테스트 teardown 용도

**완료 조건**
- [ ] `export const pool`과 `export async function closePool()` 모두 export된다
- [ ] Pool 설정 4개 항목(connectionString, max, idleTimeoutMillis, connectionTimeoutMillis)이 요구사항 값과 정확히 일치한다
- [ ] `pool.on('error', ...)` 핸들러가 등록되어 오류 발생 시 프로세스가 비정상 종료되지 않는다
- [ ] `closePool()` 호출 시 `pool.end()`가 실행되어 모든 커넥션이 정상 해제된다

---

### DB-03 | 환경변수 유효성 검증 설정 구현

**의존**: DB-02 | **예상 소요**: 30분

`backend/src/config/env.ts` 작성. 애플리케이션 시작 시 필수 환경변수 존재 여부·형식을 검증하고 실패 시 즉시 `process.exit(1)`.

- `DATABASE_URL`: 존재 여부 + `postgresql://` 또는 `postgres://` 프로토콜 형식 확인
- `NODE_ENV`: `development | test | production` 중 하나인지 확인
- `PORT`: 존재 시 숫자형 문자열 확인, 없으면 기본값 3000 사용
- `backend/.env.example`: DB 관련 환경변수 키 목록 포함 (실제 값 없음)

**완료 조건**
- [ ] `DATABASE_URL`이 누락된 상태에서 실행 시 변수명을 포함한 오류 메시지와 함께 프로세스가 종료된다
- [ ] `DATABASE_URL`에 허용 프로토콜 외 값이 입력되면 형식 오류로 프로세스가 종료된다
- [ ] 검증 통과 시 반환되는 config 객체의 모든 필드에 TypeScript 타입이 명시되어 `any`가 없다
- [ ] `backend/.env.example` 파일에 DB 관련 환경변수 키가 모두 포함되어 있다

---

### DB-04 | 개발·테스트 환경변수 파일 구성

**의존**: DB-03 | **예상 소요**: 20분

통합 테스트는 반드시 개발 DB와 분리된 전용 테스트 DB를 사용한다 (설계 원칙 §4.2).

- `backend/.env.development`: DB명 `todolist_dev`
- `backend/.env.test`: DB명 `todolist_test`, `NODE_ENV=test`
- `backend/.gitignore`: `.env.development`, `.env.test`, `.env.production` 포함
- `database/create_databases.sql`: `todolist_dev`, `todolist_test` 두 DB 생성 구문

**완료 조건**
- [ ] `.env.development`와 `.env.test`가 각각 다른 DB명(`todolist_dev` vs `todolist_test`)을 사용한다
- [ ] `backend/.gitignore`에 `.env.development`, `.env.test`, `.env.production`이 명시되어 있다
- [ ] `database/create_databases.sql` 실행 시 두 DB가 생성된다
- [ ] `.env.example`에 실제 자격정보가 없고 플레이스홀더로만 작성되어 있다

---

### DB-05 | DB 유틸리티 함수 구현

**의존**: DB-01, DB-02 | **예상 소요**: 45분

`backend/src/db/utils.ts` 파일 작성.

- `checkDatabaseConnection(): Promise<boolean>`: `SELECT 1` 실행, 성공 시 true / 실패 시 false (예외 없음). `finally`에서 반드시 `release()`
- `getDatabaseStatus()`: 지연시간(ms), poolTotal/poolIdle/poolWaiting 반환
- `runMigrations(): Promise<void>`: `migrations/` 디렉토리 SQL 파일을 파일명 오름차순으로 순서대로 실행. `schema_migrations` 테이블로 재실행 방지 (멱등성 보장)

**완료 조건**
- [ ] `checkDatabaseConnection()`이 DB 응답 불가 시 예외 없이 `false`를 반환한다
- [ ] `getDatabaseStatus()`의 반환 객체가 5개 필드(connected, latencyMs, poolTotal, poolIdle, poolWaiting)를 모두 포함한다
- [ ] `runMigrations()` 2회 실행 시 이미 적용된 마이그레이션을 건너뛰어 중복 오류가 발생하지 않는다
- [ ] 모든 함수에서 Pool 커넥션이 `finally` 블록 내 `release()`로 반환된다

---

### DB-06 | 서버 시작 시 DB 연결 검증 통합

**의존**: DB-03, DB-05 | **예상 소요**: 25분

`backend/src/server.ts`에 DB 연결 검증·마이그레이션 실행·Graceful Shutdown을 통합한다.

- `listen()` 이전 순서: ① 환경변수 검증 → ② `checkDatabaseConnection()` 실패 시 `process.exit(1)` → ③ `NODE_ENV`가 `development|test`인 경우 `runMigrations()` 실행
- `process.on('SIGTERM'|'SIGINT', ...)`: `closePool()` 호출 후 `process.exit(0)` (Graceful Shutdown)

**완료 조건**
- [ ] 잘못된 `DATABASE_URL`로 서버 시작 시 연결 실패 메시지와 함께 exit code 1로 종료된다
- [ ] 정상 시작 시 포트·`NODE_ENV`·DB 연결 성공 메시지가 로그에 출력된다
- [ ] SIGTERM 수신 시 `closePool()`이 호출되고 프로세스가 정상 종료된다
- [ ] `NODE_ENV=production`에서는 `runMigrations()`가 실행되지 않는다

---

### DB-07 | 통합 테스트용 DB 헬퍼 구현

**의존**: DB-01, DB-02, DB-05 | **예상 소요**: 45분

`backend/tests/helpers/dbSetup.ts` 작성. Mock DB 사용 금지 — `.env.test`의 `todolist_test` DB 대상.

- `initTestDatabase()`: 마이그레이션 미적용 시 `runMigrations()` 호출. `beforeAll`에서 1회 사용
- `clearAllTables()`: FK 순서 고려한 삭제(`todos → categories(user 소유) → refresh_tokens → users`). 기본 카테고리(`user_id IS NULL`)는 삭제하지 않음. `beforeEach`/`afterEach` 사용
- `seedTestUser(overrides?)`: users 테이블에 직접 INSERT 후 UUID 반환
- `getTestPool()`: `todolist_test` DB 참조 여부 런타임 검증 (개발 DB 오염 방지)
- `closeTestPool()`: `afterAll`에서 Pool 종료

**완료 조건**
- [ ] `initTestDatabase()` 호출 시 `todolist_test` DB에 테이블 4개·기본 카테고리 3건이 준비된다
- [ ] `clearAllTables()` 호출 후 사용자 데이터 행이 0개이고 기본 카테고리 3건은 유지된다
- [ ] `seedTestUser()`가 반환한 `userId`로 users 테이블 조회가 가능하다
- [ ] `getTestPool()`이 `todolist_dev` DB를 가리키는 URL로 호출되면 오류를 던진다
- [ ] 모든 DB 쿼리에서 커넥션이 `finally` 블록 내 `release()`로 반환된다

---

## 3. 백엔드 영역 (BE)

> `backend/` 디렉토리. Router → Controller → Service → Repository 4계층 아키텍처.
> 트랜잭션 제어는 Service 계층. Repository는 pg 직접 사용, ORM 금지.

---

### BE-01 | 프로젝트 초기 설정

**의존**: 없음 | **예상 소요**: 1시간

`backend/` 디렉토리 전체 초기 설정.

- `package.json`: express, pg, bcrypt, jsonwebtoken, cookie-parser, cors, express-rate-limit, zod, dotenv / jest, ts-jest, supertest, @types/* devDependencies. scripts: `dev`, `build`, `start`, `test`, `migrate`
- `tsconfig.json`: target ES2022, module CommonJS, `strict: true`, outDir dist/, rootDir src/
- `.eslintrc.json`: @typescript-eslint/recommended, no-floating-promises, no-explicit-any
- `.prettierrc`: singleQuote true, trailingComma all, printWidth 100
- `jest.config.ts`: ts-jest preset, unit/integration 프로젝트 분리, coverageThreshold 80%
- `.env.example`: DATABASE_URL, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, PORT, NODE_ENV, BCRYPT_SALT_ROUNDS 항목 명시

**완료 조건**
- [ ] `npm install` 성공, `npm audit` 취약점 없음
- [ ] `npx tsc --noEmit` 오류 0건
- [ ] ESLint, Prettier 실행 시 경고·오류 없음
- [ ] `jest --listTests`로 unit/integration 프로젝트가 분리 인식됨

---

### BE-02 | DB Pool 연동 및 마이그레이션 설정

**의존**: BE-01, DB-01, DB-02, DB-05 | **예상 소요**: 1시간

DB 인프라(DB-01~DB-07)가 구현된 후, 백엔드 프로젝트에서 이를 연동한다.

- Pool 설정값(max: 20, idleTimeoutMillis: 30000)이 env.ts에서 주입되며 하드코딩 없음
- `withTransaction(callback)` 헬퍼: BEGIN/COMMIT/ROLLBACK 자동 처리 (콜백 예외 시 ROLLBACK 보장)
- `npm run migrate` 스크립트로 마이그레이션 실행 가능하도록 package.json 연동

**완료 조건**
- [ ] `npm run migrate` 실행 시 PostgreSQL에 4개 테이블·인덱스가 정상 생성된다
- [ ] `withTransaction` 헬퍼가 콜백 예외 발생 시 ROLLBACK을 보장한다
- [ ] Pool 설정값이 env.ts에서 주입되며 코드에 하드코딩이 없다
- [ ] 마이그레이션 재실행 시 이미 적용된 파일은 건너뛴다

---

### BE-03 | 공통 유틸리티 및 타입 정의

**의존**: BE-01 | **예상 소요**: 1.5시간

서비스 전반에서 재사용되는 유틸리티와 타입 구현.

- `src/utils/jwt.ts`: `signAccessToken` (15분), `signRefreshToken` (7일), `verifyAccessToken`, `verifyRefreshToken`
- `src/utils/hash.ts`: bcrypt `hashPassword` / `comparePassword` (salt rounds env 주입)
- `src/utils/tokenHash.ts`: Refresh Token SHA-256 단방향 해싱 (`crypto` 내장 모듈)
- `src/utils/errors.ts`: `AppError(base)` → `UnauthorizedError(401)`, `ForbiddenError(403)`, `NotFoundError(404)`, `ConflictError(409)`, `ValidationError(422)`
- `src/types/`: `auth.types.ts`, `todo.types.ts`, `category.types.ts`, `user.types.ts`, `express.d.ts` (req.user 타입 확장)

**완료 조건**
- [ ] `verifyAccessToken`이 만료·변조 토큰에 대해 `UnauthorizedError`를 throw한다
- [ ] `hashPassword` → `comparePassword` 왕복 검증이 정상 동작한다
- [ ] `hashToken`이 동일 입력에 대해 항상 동일한 SHA-256 hex 문자열을 반환한다
- [ ] 모든 커스텀 에러가 `AppError instanceof` 체크를 통과한다
- [ ] TypeScript 컴파일 시 `req.user` 접근에 타입 오류가 없다

---

### BE-04 | 공통 미들웨어 구현

**의존**: BE-02, BE-03 | **예상 소요**: 2시간

- `authenticate.ts`: Authorization 헤더 Bearer 토큰 → `verifyAccessToken` → `req.user` 세팅. 토큰 없음/만료 시 `UnauthorizedError`
- `validate.ts`: `validate(schema: ZodSchema)` 팩토리 — req.body zod 파싱 실패 시 `ValidationError(422)`
- `rateLimiter.ts`: `express-rate-limit` 기반, windowMs: 60000, max: 10. `/api/auth/login`·`/api/auth/signup`에만 적용
- `errorHandler.ts`: `AppError` → `{ error: { code, message } }` JSON 응답. 기타 오류 → 500. production에서 스택트레이스 미노출
- `src/app.ts`: cors (CORS_ORIGIN env), json 파서, cookie-parser, 라우터 마운트, errorHandler 등록

**완료 조건**
- [ ] 유효하지 않은 JWT로 보호 엔드포인트 접근 시 401 JSON 응답이 반환된다
- [ ] zod 스키마 위반 요청 시 422 응답과 필드별 오류 상세가 반환된다
- [ ] `/api/auth/login`에 분당 11회 요청 시 11번째에 429 응답이 반환된다
- [ ] 처리되지 않은 예외 발생 시 500 응답을 반환하고 스택트레이스가 응답 바디에 포함되지 않는다(production)

---

### BE-05 | User·RefreshToken Repository 구현

**의존**: BE-02, BE-03 | **예상 소요**: 1.5시간

- `user.repository.ts`: `createUser`, `findByEmail`, `findById`, `updateUser`(동적 SET, updated_at 갱신), `deleteUser(PoolClient)` (트랜잭션 참여)
- `refreshToken.repository.ts`: `createToken`, `findByTokenHash`, `deleteByTokenHash` (Token Rotation 시 기존 삭제), `deleteByUserId(PoolClient)` (회원탈퇴 트랜잭션용), `deleteExpiredTokens` (배치용)

**완료 조건**
- [ ] `createUser` 후 `findByEmail`로 동일 레코드를 조회할 수 있다
- [ ] `findByEmail`이 존재하지 않는 이메일에 대해 null을 반환한다
- [ ] `updateUser`가 전달된 필드만 UPDATE하고 나머지 컬럼을 보존한다
- [ ] `deleteUser`가 PoolClient를 받아 외부 트랜잭션에 참여한다(auto-commit 없음)

---

### BE-06 | Auth 수직 슬라이스 (Repository → Service → Controller → Route)

**의존**: BE-04, BE-05 | **예상 소요**: 2.5시간

인증 도메인 전체 구현.

- `auth.service.ts`:
  - `signup`: 이메일 중복 체크(BR-01), bcrypt 해시, 사용자 생성, 토큰 발급, refresh_token_hash DB 저장
  - `login`: 이메일 조회·비밀번호 검증, 토큰 발급, Token Rotation
  - `logout`: token_hash로 DB 삭제
  - `refresh`: token_hash 조회·만료 검증·`verifyRefreshToken`, 기존 삭제 + 신규 발급 (Token Rotation)
- `auth.controller.ts`: 쿠키 정책 — `HttpOnly + Secure + SameSite=Strict`, maxAge 7일
- `auth.route.ts`: POST /signup, /login (authRateLimiter 적용), /logout, /refresh
- Zod 스키마: signup(email, password min:8 영문+숫자, name), login(email, password)

**완료 조건**
- [ ] 동일 이메일로 두 번 signup 시 409 ConflictError가 반환된다
- [ ] login 성공 시 응답 바디에 accessToken, Set-Cookie에 refreshToken(HttpOnly)이 포함된다
- [ ] refresh 호출 시 기존 refreshToken DB 레코드가 삭제되고 신규 레코드가 생성된다(Token Rotation)
- [ ] 만료된 refreshToken으로 /refresh 호출 시 401이 반환된다
- [ ] /login·/signup에 분당 10회 초과 요청 시 429가 반환된다

---

### BE-07 | User 수직 슬라이스 (Service → Controller → Route)

**의존**: BE-04, BE-05 | **예상 소요**: 2시간

- `user.service.ts`:
  - `getMe`: password_hash 제외 반환
  - `updateMe`: 이름 수정 / 비밀번호 변경(현재 비밀번호 검증 후 신규 해시 저장)
  - `deleteMe`: `withTransaction`으로 순서 원자적 삭제 — ① refresh_tokens → ② todos → ③ categories → ④ users (NFR-04)
- `user.controller.ts`: authenticate 미들웨어 통과 후 req.user.sub 활용
- `user.route.ts`: 전체 라우트에 authenticate 적용. GET/PATCH/DELETE /api/users/me

**완료 조건**
- [ ] GET /api/users/me 응답에 password_hash 필드가 포함되지 않는다
- [ ] 비밀번호 변경 시 currentPassword 불일치하면 401이 반환된다
- [ ] DELETE /api/users/me 실행 시 단일 트랜잭션으로 4개 테이블 데이터가 모두 삭제된다
- [ ] 트랜잭션 중 오류 발생 시 ROLLBACK되어 부분 삭제가 없다
- [ ] authenticate 미들웨어 없이 접근 시 401이 반환된다

---

### BE-08 | Category 수직 슬라이스 (Repository → Service → Controller → Route)

**의존**: BE-04, BE-05 | **예상 소요**: 2시간

- `category.repository.ts`: `findAllByUserId`(기본 카테고리 포함), `findById`, `create`, `findDefaultByUserId`, `deleteById(PoolClient)`, `deleteByUserId(PoolClient)`, `reassignTodos(PoolClient, fromId, toId, userId)`
- `category.service.ts`:
  - `getCategories`: userId 필터 조회
  - `createCategory`: 이름 중복 체크(BR-01 유사)
  - `deleteCategory`: 소유권 확인(BR-03), 기본 카테고리 삭제 방지(BR-06), `withTransaction`으로 ① 소속 할일 기본 카테고리 재배정 → ② 카테고리 삭제(BR-07)
- `category.route.ts`: 전체 authenticate 적용. GET/POST/DELETE /api/categories

**완료 조건**
- [ ] GET /api/categories 응답에 is_default: true인 '일반' 카테고리가 항상 포함된다
- [ ] 기본 카테고리 id로 DELETE 요청 시 403이 반환된다(BR-06)
- [ ] 카테고리 삭제 시 소속 할일의 category_id가 단일 트랜잭션으로 기본 카테고리 id로 변경된다(BR-07)
- [ ] 타 사용자 카테고리 삭제 시도 시 403이 반환된다(BR-03)
- [ ] 동일 사용자 내 카테고리 이름 중복 생성 시 409가 반환된다

---

### BE-09 | Todo 수직 슬라이스 (Repository → Service → Controller → Route)

**의존**: BE-04, BE-08 | **예상 소요**: 2.5시간

- `todo.repository.ts`: `findAll(userId, filter: TodoFilter)`(동적 WHERE — category_id, is_completed, expired), `findById`, `create`, `update`(동적 SET), `deleteById`, `deleteByUserId(PoolClient)`, `reassignCategory(PoolClient, fromId, toId, userId)`
- `todo.service.ts`:
  - `getTodos`: 필터 적용 조회(BR-08)
  - `createTodo`: 카테고리 소유권/존재 검증(BR-04), 날짜 유효성(BR-05)
  - `updateTodo`: 소유권 확인(BR-03), 날짜 유효성(BR-05)
  - `deleteTodo`: 소유권 확인(BR-03)
- `todo.route.ts`: 전체 authenticate 적용. GET/POST/PATCH/DELETE /api/todos
- Zod 쿼리 파라미터: `category_id`(optional UUID), `is_completed`(optional boolean), `expired`(optional boolean)

**완료 조건**
- [ ] GET /api/todos?is_completed=false&expired=true 요청 시 기간 만료된 미완료 할일만 반환된다(BR-08)
- [ ] 타 사용자 소유 category_id로 할일 생성 시 403·404가 반환된다(BR-04)
- [ ] due_date < start_date인 요청 시 422가 반환된다(BR-05)
- [ ] 타 사용자 할일 수정·삭제 시도 시 403이 반환된다(BR-03)

---

### BE-10 | Service 단위 테스트

**의존**: BE-06, BE-07, BE-08, BE-09 | **예상 소요**: 3시간

Repository를 Jest mock으로 격리하여 Service 비즈니스 로직만 검증. 실제 DB 연결 없음.

- `tests/unit/auth.service.test.ts`: 이메일 중복 ConflictError, bcrypt 호출, Token Rotation 동작
- `tests/unit/category.service.test.ts`: 기본 카테고리 삭제 ForbiddenError(BR-06), 소유권 없음 ForbiddenError(BR-03), withTransaction 내 재배정+삭제 순서(BR-07)
- `tests/unit/todo.service.test.ts`: 카테고리 미소유 ForbiddenError(BR-04), 날짜 역전 ValidationError(BR-05), 소유권 확인(BR-03)

**완료 조건**
- [ ] `npm test -- --testPathPattern=unit` 전체 통과
- [ ] 각 Service 파일 라인 커버리지 ≥ 85%
- [ ] Repository 실제 구현에 의존하지 않음(jest.mock 격리 확인)
- [ ] 비즈니스 규칙 BR-01~BR-08 관련 분기가 최소 1개 이상 테스트 케이스로 커버된다
- [ ] 테스트 실행 시간 30초 이내(DB 연결 없음)

---

### BE-11 | API 통합 테스트 (실제 PostgreSQL)

**의존**: BE-10, DB-07 | **예상 소요**: 4시간

supertest + 실제 Express 앱 + 테스트 전용 PostgreSQL. **Mock DB 절대 금지.**

- `tests/integration/setup.ts`: 테스트 DB 연결 설정, 각 테스트 전 TRUNCATE(CASCADE), 완료 후 pool.end()
- `tests/integration/auth.test.ts`: signup(201, 중복 409, 유효성 422), login(200, 잘못된 비밀번호 401), refresh(쿠키 갱신), logout
- `tests/integration/user.test.ts`: getMe(password_hash 미포함), updateMe(비밀번호 불일치 401), deleteMe(204, 이후 login 불가)
- `tests/integration/category.test.ts`: 기본 카테고리 포함 조회, 중복명 409, 기본 카테고리 삭제 거부, 소속 할일 재배정 DB 직접 확인(BR-07), 타 사용자 403
- `tests/integration/todo.test.ts`: 필터 정확성(category_id, is_completed, expired), 잘못된 category_id 403, 날짜 역전 422, 타 사용자 403

**완료 조건**
- [ ] `npm test -- --testPathPattern=integration` 전체 통과(실제 PostgreSQL 연결 필수)
- [ ] 각 테스트 간 데이터 격리 확인(TRUNCATE 또는 트랜잭션 롤백)
- [ ] 전체 API 엔드포인트 14개 모두 최소 1개 이상 통합 테스트 케이스가 존재한다
- [ ] BR-03(403), BR-06(기본 카테고리), BR-07(재배정) 시나리오가 DB 레코드 직접 조회로 검증된다
- [ ] unit+integration 합산 전체 커버리지 ≥ 80%

---

## 4. 프론트엔드 영역 (FE)

> `frontend/` 디렉토리. Page → Feature Component → UI Component 단방향 의존.
> TanStack Query(서버 상태) + Zustand(클라이언트 상태). Access Token 메모리 전용 저장.

---

### FE-01 | 프로젝트 초기 설정

**의존**: 없음 | **예상 소요**: 1시간

`frontend/` 디렉토리 Vite + React 19 + TypeScript 스캐폴딩.

- `vite.config.ts`: 개발 서버 포트 5173, 프록시(`/api` → `http://localhost:3000`), path alias(`@/` → `src/`)
- `tsconfig.json`: `strict: true`, `noImplicitAny`, `strictNullChecks`, `exactOptionalPropertyTypes`, `target: ES2022`
- `.eslintrc.cjs`: @typescript-eslint/recommended, eslint-plugin-react-hooks, eslint-plugin-jsx-a11y
- `package.json`: react@19, react-dom@19, @tanstack/react-query@5, zustand@4, axios, react-router-dom@6, react-hook-form@7, zod, dayjs / Playwright, Vitest, @testing-library/react, msw (devDependencies)

**완료 조건**
- [ ] `npm run dev` 실행 시 브라우저에서 Vite 기본 화면이 정상 렌더링된다
- [ ] `npm run type-check`(tsc --noEmit) 오류 없이 통과한다
- [ ] `@/` path alias로 모듈 import 시 TypeScript 타입 추론이 정상 동작한다
- [ ] `npm run lint` 실행 시 ESLint 오류 0건이다

---

### FE-02 | 공통 TypeScript 타입 정의

**의존**: FE-01 | **예상 소요**: 30분

`src/types/` 하위 도메인별 타입 파일 작성. 백엔드 API 응답 형식과 1:1 대응.

- `auth.types.ts`: `LoginRequest`, `LoginResponse`, `SignupRequest`, `RefreshResponse`
- `user.types.ts`: `User`, `UpdateProfileRequest`, `DeleteAccountRequest`
- `category.types.ts`: `Category`(id, userId, name, isDefault, createdAt), `CreateCategoryRequest`
- `todo.types.ts`: `Todo`(id, userId, categoryId, title, description?, startDate?, dueDate?, isCompleted, createdAt, updatedAt), `CreateTodoRequest`, `UpdateTodoRequest`, `TodoFilter`
- `api.types.ts`: `ApiResponse<T>`, `ApiError`

**완료 조건**
- [ ] 모든 타입 파일에서 `any` 사용 없이 strict 타입 정의가 완료된다
- [ ] `Todo.dueDate`가 `string | null`(ISO 8601 UTC)으로 정의되어 dayjs 변환에 활용할 수 있다
- [ ] `Category.isDefault`가 `boolean`으로 정의되어 삭제 버튼 비활성화 로직에 활용할 수 있다
- [ ] `tsc --noEmit` 오류 없이 통과한다

---

### FE-03 | API 클라이언트 및 자동 토큰 갱신 인터셉터

**의존**: FE-01, FE-02 | **예상 소요**: 2시간

`src/api/client.ts`에 axios 인스턴스 생성 및 인증 인터셉터 구현.

- `withCredentials: true` (Refresh Token HttpOnly Cookie 자동 전송)
- **요청 인터셉터**: Zustand `auth.store`에서 `accessToken` 읽어 `Authorization: Bearer` 헤더 주입
- **응답 인터셉터(401 핸들링)**:
  1. 401 수신 → `POST /api/auth/refresh` 호출
  2. 갱신 성공 → Zustand store에 새 accessToken 저장 → 원본 요청 재시도(최대 1회)
  3. 갱신 실패 → store 초기화 → `/login` 리다이렉트
  4. 동시 다발 401: `isRefreshing` 플래그 + 대기열 패턴으로 refresh 중복 호출 방지
- `src/api/`: `auth.api.ts`, `todo.api.ts`, `category.api.ts`, `user.api.ts`

**완료 조건**
- [ ] 인증된 요청에 `Authorization` 헤더가 자동 주입된다(vitest 단위 테스트로 확인)
- [ ] Access Token 만료 시 자동으로 refresh 후 원본 요청을 재시도한다(MSW mock 활용)
- [ ] 동시 3개 요청이 401 응답을 받아도 refresh API가 1회만 호출된다
- [ ] Refresh Token 만료 시 Zustand store 초기화 및 `/login` 리다이렉트가 동작한다

---

### FE-04 | Zustand 스토어 구성

**의존**: FE-01, FE-02 | **예상 소요**: 1시간

- `src/stores/auth.store.ts`: `accessToken: string | null`, `user: User | null`, `isAuthenticated`. 액션: `setAuth`, `clearAuth`, `setAccessToken`. **localStorage/sessionStorage 절대 사용 금지 — 메모리 전용**
- `src/stores/ui.store.ts`: `toastQueue`, `isModalOpen`, `modalContent`. 액션: `showToast`(3000ms 후 자동 소멸), `dismissToast`, `openModal`, `closeModal`

**완료 조건**
- [ ] `auth.store`의 `accessToken`이 메모리에만 존재하고 브라우저 스토리지에 persist되지 않음을 테스트로 확인한다
- [ ] `clearAuth()` 호출 시 `accessToken`·`user` 모두 null로 초기화된다
- [ ] `showToast` 호출 후 3000ms 이내에 해당 Toast가 `toastQueue`에서 제거된다(vitest fake timers)

---

### FE-05 | 공통 UI 컴포넌트 라이브러리

**의존**: FE-01, FE-04 | **예상 소요**: 3시간

`src/components/` 하위 재사용 가능한 기반 컴포넌트. WCAG 2.1 AA 접근성 기준 준수.

- `Button.tsx`: variant(primary/secondary/danger/ghost), loading state(Spinner 내장), `aria-disabled`
- `Input.tsx`: label 연결, error message, `aria-invalid`, `aria-describedby`, forwardRef
- `Modal.tsx`: Portal 기반, ESC 닫기, 배경 클릭 닫기, `role="dialog"`, 포커스 트랩
- `Badge.tsx`: variant(default/success/warning/danger)
- `Spinner.tsx`: `role="status"`, `aria-label="로딩 중"`
- `Toast.tsx` + `ToastContainer.tsx`: `ui.store`의 `toastQueue` 구독, 슬라이드인 애니메이션
- `Layout.tsx`: Header(로고, 네비게이션, 로그아웃 버튼), max-width 1280px, 반응형 컨테이너

**완료 조건**
- [ ] `Modal`에서 ESC 키 누르면 닫히고, 열렸을 때 포커스가 모달 내부로 이동한다
- [ ] `Input`에 `error` prop 전달 시 `aria-invalid="true"` 및 error 메시지가 DOM에 렌더링된다
- [ ] `Toast`가 `ui.store`의 `toastQueue` 변경에 반응하여 자동 렌더링·소멸된다
- [ ] `Button` loading 상태에서 `disabled` 처리되어 중복 클릭이 방지된다
- [ ] 360px 뷰포트에서 `Layout`의 네비게이션이 가로 스크롤 없이 정상 표시된다

---

### FE-06 | 라우팅 구성 및 인증 가드

**의존**: FE-04, FE-05 | **예상 소요**: 1.5시간

- `src/App.tsx`: BrowserRouter + Routes 구성
  - `PrivateRoute`: `isAuthenticated`가 false이면 `/login` redirect. 원래 경로를 state에 보존
  - `PublicRoute`: `isAuthenticated`가 true이면 `/` redirect
- `src/hooks/useAuthInitializer.ts`: 앱 마운트 시 1회 `GET /api/users/me` 호출 → 성공 시 user 저장, 실패(401) 시 `/login` 이동. 로딩 중 전체 화면 Spinner 표시 (페이지 새로고침 시 토큰 복구)

**라우팅 매핑**

| 경로 | 컴포넌트 | 가드 |
|------|---------|------|
| `/login` | LoginPage | PublicRoute |
| `/signup` | SignupPage | PublicRoute |
| `/` | TodoListPage | PrivateRoute |
| `/todos/new` | TodoFormPage | PrivateRoute |
| `/todos/:id/edit` | TodoFormPage | PrivateRoute |
| `/categories` | CategoryPage | PrivateRoute |
| `/profile` | ProfilePage | PrivateRoute |
| `*` | `<Navigate to="/" />` | — |

**완료 조건**
- [ ] 비인증 상태에서 `/` 접근 시 `/login`으로 redirect된다
- [ ] 인증 상태에서 `/login` 접근 시 `/`로 redirect된다
- [ ] 페이지 새로고침 후 `useAuthInitializer`가 `/api/users/me`를 호출하여 인증 상태가 복구된다
- [ ] 초기화 완료 전 전체 화면 Spinner가 표시된다

---

### FE-07 | 인증 기능 구현 (UC-01, UC-02, UC-11)

**의존**: FE-03, FE-04, FE-05, FE-06 | **예상 소요**: 2시간

- `src/hooks/useLogin.ts`: `useMutation`, 성공 시 `auth.store.setAuth` → `/` navigate, 실패 시 Toast(error)
- `src/hooks/useLogout.ts`: `POST /api/auth/logout` → `auth.store.clearAuth()` → `/login`. 실패해도 클라이언트 상태 초기화
- `src/features/auth/LoginForm.tsx`: react-hook-form + zod, 이메일·비밀번호 유효성, 제출 중 Button loading
- `src/features/auth/SignupForm.tsx`: 비밀번호 min:8·영문+숫자 조합, 비밀번호 확인 일치(`superRefine`), 성공 시 Toast 후 `/login` navigate

**완료 조건**
- [ ] 잘못된 이메일 형식 입력 시 즉시(onBlur) 인라인 에러 메시지가 표시된다
- [ ] 로그인 성공 시 `auth.store`에 `accessToken`이 저장되고 `/`로 이동한다
- [ ] 이메일 중복 409 응답 시 "이미 사용 중인 이메일입니다" Toast가 표시된다
- [ ] 로그아웃 후 `accessToken`이 null로 초기화되고 `/login`으로 이동한다

---

### FE-08 | TanStack Query 공통 설정

**의존**: FE-01, FE-02, FE-04, FE-05 | **예상 소요**: 1시간

- `src/main.tsx`: `QueryClient` 인스턴스 생성, `QueryClientProvider` 래핑
- QueryClient 기본 옵션: `staleTime: 60000`(1분), `retry: 1`, `refetchOnWindowFocus: false`
- `src/api/queryKeys.ts`: Query Key 팩토리 패턴
  ```ts
  export const todoKeys = {
    all: ['todos'] as const,
    list: (filter: TodoFilter) => ['todos', 'list', filter] as const,
  }
  export const categoryKeys = {
    list: () => ['categories', 'list'] as const,
  }
  ```

**완료 조건**
- [ ] `QueryClientProvider`가 App 전체를 감싸고 있다
- [ ] Query key 팩토리를 통해 invalidation 시 관련 쿼리만 정확히 무효화된다
- [ ] `staleTime` 설정으로 1분 이내 재마운트 시 네트워크 요청이 발생하지 않는다

---

### FE-09 | 카테고리 기능 구현 (UC-09, UC-10)

**의존**: FE-03, FE-05, FE-06, FE-07, FE-08 | **예상 소요**: 2시간

- `src/hooks/useCategories.ts`: `useQuery(categoryKeys.list(), getCategories)`
- `src/hooks/useCreateCategory.ts`: `useMutation`, 성공 시 `invalidateQueries(categoryKeys.all)`, 중복명 409 → Toast
- `src/hooks/useDeleteCategory.ts`: `useMutation`, 성공 시 `categoryKeys.all`·`todoKeys.all` 동시 무효화(재배정 반영)
- `src/features/category/CategoryList.tsx`: `isDefault === true` 항목 삭제 버튼 `disabled` + tooltip
- `src/features/category/CategoryForm.tsx`: 기본 카테고리와 동명 불가(클라이언트 사전 검사)

**완료 조건**
- [ ] 기본 카테고리(`isDefault: true`)의 삭제 버튼이 disabled 상태로 렌더링된다
- [ ] 카테고리 삭제 시 확인 Modal이 표시되고 취소 시 삭제가 실행되지 않는다
- [ ] 카테고리 추가 성공 후 목록이 즉시 갱신된다(invalidateQueries 동작 확인)
- [ ] 카테고리 삭제 후 할일 목록 쿼리도 무효화되어 재조회된다

---

### FE-10 | 할일 목록·필터·완료토글·삭제 (UC-06, UC-07, UC-08)

**의존**: FE-03, FE-05, FE-06, FE-07, FE-08, FE-09 | **예상 소요**: 3시간

- `src/utils/dateUtils.ts`: `isOverdue(dueDate: string | null): boolean` — `dayjs(dueDate).isBefore(dayjs(), 'day')`. dueDate가 null이면 false. **클라이언트 로컬 타임존 기준(NFR-07)**
- `src/hooks/useTodos.ts`: `useQuery(todoKeys.list(filter), () => getTodos(filter))`
- `src/hooks/useDeleteTodo.ts`: `useMutation(deleteTodo)`, 성공 시 `todoKeys.all` 무효화
- `src/hooks/useUpdateTodo.ts`(완료토글): `useMutation` + **Optimistic Update**
  - `onMutate`: 캐시에서 `isCompleted` 즉시 토글
  - `onError`: 이전 캐시(`context.previousTodos`)로 롤백
  - `onSettled`: `queryClient.invalidateQueries`
- `src/features/todo/TodoFilter.tsx`: 카테고리 select, 완료 여부·기간만료 checkbox. **URL 쿼리스트링 동기화**(`useSearchParams`) — 새로고침 시 필터 유지
- `src/features/todo/TodoItem.tsx`: 완료 체크박스, 기간만료 Badge, 카테고리 Badge, 수정·삭제 버튼
- `src/features/todo/TodoList.tsx`: 로딩 Spinner, 빈 목록 안내 메시지

**완료 조건**
- [ ] 완료 체크박스 클릭 시 서버 응답 전에 UI가 즉시 반영되고, 실패 시 롤백된다(Optimistic Update)
- [ ] `isOverdue()` 함수가 클라이언트 로컬 타임존 기준으로 기간만료를 올바르게 판단한다(dayjs unit test)
- [ ] 카테고리 필터 변경 시 URL 쿼리스트링이 업데이트되고 목록이 재조회된다
- [ ] 삭제 확인 Modal에서 취소 시 삭제가 실행되지 않는다
- [ ] 완료 여부·카테고리·기간만료 3가지 필터를 동시에 적용하면 조건에 맞는 항목만 표시된다

---

### FE-11 | 할일 등록·수정 폼 (UC-04, UC-05)

**의존**: FE-08, FE-09, FE-10 | **예상 소요**: 2.5시간

`/todos/new`와 `/todos/:id/edit`을 단일 컴포넌트(`TodoFormPage`)로 처리. `useParams`로 모드 분기.

- `src/hooks/useCreateTodo.ts`: `useMutation(createTodo)`, 성공 시 `todoKeys.all` 무효화 + `/` navigate
- `src/features/todo/TodoForm.tsx`
  - 수정 모드: 기존 할일 `useQuery` 조회 후 `defaultValues` 주입
  - react-hook-form + zod: `title`(필수, max 200), `categoryId`(필수, BR-04), `description`(max 1000), `startDate`·`dueDate`(선택, `dueDate >= startDate` 교차 검증 BR-05)
  - 날짜 입력: `<input type="date">`, 값을 ISO 8601로 변환하여 API 전송

**완료 조건**
- [ ] `dueDate`가 `startDate`보다 이전 날짜이면 "종료예정일은 시작일 이후여야 합니다" 에러가 표시된다
- [ ] `categoryId` 미선택 시 폼 제출이 불가하고 에러 메시지가 표시된다(BR-04)
- [ ] 수정 모드에서 기존 데이터가 폼에 사전 입력된다
- [ ] 등록·수정 성공 후 할일 목록 쿼리가 무효화되고 `/`로 이동한다

---

### FE-12 | 개인정보 수정·회원 탈퇴 (UC-03, UC-12)

**의존**: FE-03, FE-04, FE-05, FE-06, FE-07, FE-08 | **예상 소요**: 2시간

- `src/hooks/useProfile.ts`: `useQuery(['users', 'me'], getMe)`
- `src/features/profile/ProfileForm.tsx`: 이름 수정, 성공 시 `auth.store` user.name 갱신 + Toast
- `src/features/profile/PasswordForm.tsx`: 현재 비밀번호·새 비밀번호·확인. 불일치 시 에러 Toast
- `src/features/profile/DeleteAccountSection.tsx`(UC-12):
  - **2단계 플로우**: 1단계 비밀번호 확인 Modal → 2단계 최종 확인 다이얼로그
  - 성공 시 `auth.store.clearAuth()` → `/login` navigate
  - `variant="danger"` Button 사용

**완료 조건**
- [ ] 이름 수정 성공 시 Header에 표시된 사용자 이름이 즉시 반영된다(Zustand store 갱신)
- [ ] 회원 탈퇴 플로우가 2단계(비밀번호 확인 → 최종 확인)로 진행된다
- [ ] 비밀번호 확인 Modal에서 취소 시 탈퇴 프로세스가 중단된다
- [ ] 탈퇴 성공 후 `accessToken`이 초기화되고 `/login`으로 이동한다

---

### FE-13 | 반응형 UI 조정

**의존**: FE-05, FE-09, FE-10, FE-11, FE-12 | **예상 소요**: 2시간

360px / 768px / 1280px 브레이크포인트 기준 전체 페이지 반응형 점검·수정.

- 360px: 햄버거 메뉴 또는 하단 탭 바, 콘텐츠 full-width (padding 16px), TodoItem 세로 스택
- 768px: 상단 네비게이션, 콘텐츠 max-width 720px
- 1280px: 고정 사이드바, 콘텐츠 max-width 960px
- Modal: 360px에서 화면 너비 90%, 상하 margin auto
- 인터랙티브 요소 최소 터치 타겟 44×44px

**완료 조건**
- [ ] 360px 뷰포트에서 모든 페이지에 가로 스크롤바가 발생하지 않는다
- [ ] 768px 뷰포트에서 레이아웃 전환(모바일→태블릿)이 자연스럽게 동작한다
- [ ] 1280px 뷰포트에서 콘텐츠가 max-width를 초과하지 않고 중앙 정렬된다
- [ ] 인터랙티브 요소의 최소 터치 타겟이 44×44px 이상이다

---

### FE-14 | 컴포넌트 단위 테스트

**의존**: FE-07, FE-09, FE-10, FE-11, FE-12 | **예상 소요**: 3시간

Vitest + React Testing Library. MSW로 API 모킹.

- `tests/components/TodoItem.test.tsx`: Optimistic Update·롤백, 기간만료 Badge, 삭제 확인 Modal
- `tests/components/LoginForm.test.tsx`: 유효성 오류, 성공 시 store 토큰 저장, 401 Toast
- `tests/components/CategoryList.test.tsx`: 기본 카테고리 삭제 버튼 disabled, 삭제 확인 Modal
- `tests/hooks/useAuthInitializer.test.ts`: 초기화 시 `/api/users/me` 호출, 실패 시 `/login` navigate
- `tests/utils/dateUtils.test.ts`: `isOverdue` 경계값 테스트(오늘, 어제, 내일, null)

**완료 조건**
- [ ] `npm run test` 실행 시 전체 테스트가 통과한다
- [ ] 컴포넌트 테스트 커버리지 ≥ 85%
- [ ] `isOverdue` 경계값(오늘 날짜 포함) 테스트 케이스가 모두 통과한다
- [ ] MSW 핸들러가 `tests/mocks/handlers.ts`에 API별로 정리되어 재사용 가능하다
- [ ] Optimistic Update 롤백 시나리오가 테스트로 검증된다

---

### FE-15 | E2E 테스트 (Playwright)

**의존**: FE-13, FE-14 | **예상 소요**: 3시간

`tests/e2e/`. 백엔드 서버가 실행 중인 환경에서 실제 API와 통합 테스트.

- `playwright.config.ts`: `baseURL: 'http://localhost:5173'`, `use.trace: 'on-first-retry'`
- `tests/e2e/auth.spec.ts`: 회원가입→로그인→로그아웃 전체 플로우, 잘못된 자격증명 에러, 로그아웃 후 redirect
- `tests/e2e/todo.spec.ts`: 할일 등록·완료토글·필터·삭제, `dueDate < startDate` 에러 확인
- `tests/e2e/category.spec.ts`: 카테고리 추가→할일 등록 폼 선택, 기본 카테고리 삭제 버튼 disabled, 카테고리 삭제→할일 재배정 확인
- `tests/e2e/helpers/auth.ts`: `loginAs(page, email, password)` 재사용 헬퍼

**완료 조건**
- [ ] `npx playwright test` 실행 시 전체 E2E 테스트가 통과한다
- [ ] `auth.spec.ts` 회원가입→로그인→로그아웃 플로우가 10초 이내에 완료된다
- [ ] 카테고리 삭제 후 할일 목록 재조회 시 해당 할일의 카테고리가 기본 카테고리로 변경됨을 확인한다
- [ ] 테스트 실패 시 `test-results/`에 스크린샷·트레이스 파일이 저장된다

---

## 5. 전체 의존성 다이어그램

```
[데이터베이스]
DB-01 (마이그레이션 파일 분리) ──────────────────────────────┐
DB-02 (Pool 싱글톤)           ─────────────────────────────┤
  └─→ DB-03 (환경변수 검증)                                  │
        └─→ DB-04 (환경 파일)                                │
DB-01 + DB-02 ─→ DB-05 (DB 유틸리티)                        │
  └─→ DB-06 (서버 시작 연결 검증) ← DB-03 선행              │
DB-01 + DB-02 + DB-05 ─→ DB-07 (테스트 DB 헬퍼)            │
                                                            │
[백엔드]                                                     │
BE-01 (초기 설정) ←─────────────────────────────────────────┤
  ├─→ BE-02 (Pool 연동·마이그레이션) ← DB-01,02,05 선행    │
  └─→ BE-03 (유틸·타입)                                     │
        BE-02 + BE-03 ─→ BE-04 (공통 미들웨어)              │
        BE-02 + BE-03 ─→ BE-05 (User·RefreshToken Repo)    │
          BE-04 + BE-05 ─→ BE-06 (Auth 슬라이스)            │
          BE-04 + BE-05 ─→ BE-07 (User 슬라이스)            │
          BE-04 + BE-05 ─→ BE-08 (Category 슬라이스)        │
          BE-04 + BE-08 ─→ BE-09 (Todo 슬라이스)            │
          BE-06~09 ─→ BE-10 (단위 테스트)                   │
          BE-10 + DB-07 ─→ BE-11 (통합 테스트)              │
                                                            │
[프론트엔드]                                                  │
FE-01 (초기 설정) ←──────────────────────────────────────────┘
  └─→ FE-02 (타입 정의)
        ├─→ FE-03 (API 클라이언트)
        └─→ FE-04 (Zustand 스토어)
              └─→ FE-05 (공통 UI 컴포넌트)
                    └─→ FE-06 (라우팅·인증 가드)
                          └─→ FE-07 (로그인·회원가입)
                    FE-01+02+04+05 ─→ FE-08 (TanStack Query)
                    FE-03+05+06+07+08 ─→ FE-09 (카테고리)
                    FE-03+05+06+07+08+09 ─→ FE-10 (할일 목록)
                    FE-08+09+10 ─→ FE-11 (할일 등록·수정)
                    FE-03+04+05+06+07+08 ─→ FE-12 (개인정보)
                    FE-05+09+10+11+12 ─→ FE-13 (반응형)
                    FE-07+09+10+11+12 ─→ FE-14 (단위 테스트)
                    FE-13+14 ─→ FE-15 (E2E 테스트)
```

---

## 6. 3일 개발 일정 매핑

> PRD §11 개발 일정 기준. 통합 테스트(BE-11, FE-15)는 Day 3 완료 후 별도 세션에서 수행.

### Day 1 — DB 인프라 + 백엔드 인증·사용자 API

| 순서 | Task | 영역 |
|------|------|------|
| 1 | DB-01, DB-02 (병렬) | DB |
| 2 | DB-03, DB-04, DB-05 | DB |
| 3 | DB-06, DB-07 (병렬) | DB |
| 4 | BE-01, BE-02, BE-03 | BE |
| 5 | BE-04, BE-05 (병렬) | BE |
| 6 | BE-06, BE-07 (병렬) | BE |

### Day 2 — 백엔드 카테고리·할일 API + 프론트엔드 인증

| 순서 | Task | 영역 |
|------|------|------|
| 1 | BE-08, BE-09 (병렬) | BE |
| 2 | BE-10 | BE |
| 3 | FE-01, FE-02 (병렬) | FE |
| 4 | FE-03, FE-04 (병렬) | FE |
| 5 | FE-05, FE-08 (병렬) | FE |
| 6 | FE-06, FE-07 (병렬) | FE |

### Day 3 — 프론트엔드 핵심 기능 + 반응형 UI

| 순서 | Task | 영역 |
|------|------|------|
| 1 | FE-09 | FE |
| 2 | FE-10 | FE |
| 3 | FE-11 | FE |
| 4 | FE-12 | FE |
| 5 | FE-13 | FE |
| 6 | FE-14 | FE |

### Day 3 이후 별도 세션 — 통합 테스트

| Task | 영역 | 비고 |
|------|------|------|
| BE-11 | BE | 실제 PostgreSQL 필수, Mock DB 금지 |
| FE-15 | FE | 백엔드 서버 실행 중 환경 필요 |

---

## 변경 이력

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|---------|
| 1.0.0 | 2026-05-13 | MinYoung | 최초 작성 — DB·백엔드·프론트엔드 3개 서브에이전트 병렬 분석 결과 통합. Task 33개, 완료 조건·의존성 전수 정의 |
