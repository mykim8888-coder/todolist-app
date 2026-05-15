# TodoListApp 프로젝트 구조 설계 원칙

> 버전: 0.1.0-draft
> 작성일: 2026-05-13
> 참조 문서:
> - 도메인 정의서 v0.1.0-draft (`docs/1-domain-definition.md`)
> - 제품 요구사항 정의서 v0.2.0-draft (`docs/2-prd.md`)
> - 사용자 시나리오 v0.1.0-draft (`docs/3-user-scenario.md`)

---

## 목차

1. [최상위 공통 원칙](#1-최상위-공통-원칙)
2. [의존성·레이어 원칙](#2-의존성레이어-원칙)
3. [코드·네이밍 원칙](#3-코드네이밍-원칙)
4. [테스트·품질 원칙](#4-테스트품질-원칙)
5. [설정·보안·운영 원칙](#5-설정보안운영-원칙)
6. [디렉토리 구조](#6-디렉토리-구조)

---

## 1. 최상위 공통 원칙

### 1.1 아키텍처 스타일

TodoListApp은 **레이어드 아키텍처(Layered Architecture)** 를 기반으로 설계된다. 백엔드와 프론트엔드 모두 각 레이어가 명확히 분리된 단방향 의존성 구조를 따른다.

- **관심사 분리(Separation of Concerns)**: 하나의 파일 또는 모듈은 하나의 책임만 가진다. 비즈니스 로직은 HTTP 처리나 DB 쿼리 코드와 섞이지 않는다.
- **프론트엔드-백엔드 완전 분리**: SPA(React 19)와 REST API(Node.js + Express)는 독립된 프로세스로 동작하며, HTTP를 통해서만 통신한다. 백엔드는 HTML을 렌더링하지 않고, 프론트엔드는 DB에 직접 접근하지 않는다.
- **단방향 의존성**: 상위 레이어는 하위 레이어에만 의존한다. 하위 레이어가 상위 레이어를 역참조하는 것은 금지된다.
- **명시적 인터페이스**: 레이어 간 데이터 교환은 명시적으로 정의된 구조(프론트엔드는 TypeScript interface, 백엔드는 JSDoc 또는 네이밍 규약)를 통해 이루어진다.

### 1.2 Bounded Context 경계 준수

도메인 정의서에서 정의한 두 Bounded Context의 경계를 코드 구조에 반영한다.

| Bounded Context | 책임 범위 | 핵심 엔티티 | 코드 위치 |
|-----------------|----------|------------|---------|
| Identity Context | 회원가입, 로그인, 로그아웃, 토큰 재발급, 개인정보 수정, 회원 탈퇴 | User, RefreshToken | `auth/`, `users/` 모듈 |
| Todo Management Context | 할일 CRUD, 카테고리 관리, 필터 조회 | Todo, Category | `todos/`, `categories/` 모듈 |

- **컨텍스트 간 직접 참조 금지**: Identity Context 내부 구현(예: 비밀번호 해싱 로직)을 Todo Management Context 코드에서 직접 참조해서는 안 된다.
- **컨텍스트 통합 지점**: 두 컨텍스트는 JWT 인증 미들웨어(`authenticate` middleware)를 경계로 연결된다. Todo Management Context는 미들웨어가 검증하고 `req.user`에 주입한 `userId`만 신뢰한다. Refresh Token 검증 로직은 Identity Context에서만 수행된다.
- **User 엔티티 참조 방식**: Todo Management Context는 `user_id(UUID)` 를 외래 키로만 사용한다. User의 상세 속성(이름, 이메일 등)이 필요한 경우 Identity Context의 API 응답을 통해 받아야 하며, DB를 직접 조인하는 방식은 허용하되 Repository 계층 내에서만 사용한다.

### 1.3 단방향 의존성 방향

```
[백엔드]
Router → Controller → Service → Repository → DB(pg Pool)
                                            ↑
                                     (하위 레이어만 참조)

[프론트엔드]
Page → Feature Component → UI Component
         ↓                    ↓
   TanStack Query          Zustand Store
   (서버 상태)             (클라이언트 상태)
```

- 상위 레이어에서 하위 레이어로의 의존만 허용한다.
- Repository는 Controller를, Controller는 Router를 절대 import하지 않는다.
- UI Component는 TanStack Query나 Zustand를 직접 사용하지 않는다. 상태 접근은 Feature Component에서 처리하고 props로 전달한다.

---

## 2. 의존성·레이어 원칙

### 2.1 백엔드 레이어 정의

백엔드는 Router → Controller → Service → Repository(pg) 의 4계층 구조를 따른다.

#### Router 계층
- **책임**: HTTP 메서드와 경로(path)를 정의하고, 미들웨어 체인(인증, Rate Limiting, 유효성 검증)을 조립한다.
- **허용**: `express.Router`, 미들웨어 함수 연결, Controller 함수 참조.
- **금지**: 비즈니스 로직 작성, DB 직접 접근, Service/Repository 직접 import.
- **예시**:
  ```js
  // src/routes/todos.route.js
  router.get('/', authenticate, todoController.getList);
  router.post('/', authenticate, validate(createTodoSchema), todoController.create);
  ```

#### Controller 계층
- **책임**: HTTP 요청을 파싱하여 Service에 전달하고, Service의 반환값을 HTTP 응답으로 변환한다. `req`, `res`, `next` 객체를 직접 다루는 유일한 계층이다.
- **허용**: `req` 파싱(params, query, body, `req.user`), Service 호출, 응답 직렬화, 에러를 `next(err)`로 전달.
- **금지**: 비즈니스 로직 작성(BR 판단), DB 쿼리 직접 실행, Repository 직접 import.
- **예시**:
  ```js
  // src/controllers/todo.controller.js
  async function getList(req, res, next) {
    try {
      const todos = await todoService.getList(req.user.sub, req.query);
      res.json({ success: true, data: todos });
    } catch (err) {
      next(err);
    }
  }
  ```

#### Service 계층
- **책임**: 핵심 비즈니스 로직(BR-01~BR-08) 구현, 도메인 규칙 검증, 트랜잭션 경계 관리. HTTP 및 DB 세부사항에 무관한 순수 로직을 담는다.
- **허용**: Repository 호출, 트랜잭션 제어(`pg` Pool의 `client.query` 직접 사용 허용), 비즈니스 예외 발생.
- **금지**: `req`/`res` 객체 접근, 직접적인 SQL 쿼리 문자열 조합(Repository에 위임), HTTP 상태 코드 직접 사용.
- **트랜잭션 원칙**: 카테고리 삭제(할일 재배정 포함, BR-07)와 회원 탈퇴(NFR-04)처럼 원자성이 요구되는 작업은 Service에서 `BEGIN` / `COMMIT` / `ROLLBACK` 을 직접 제어한다.
  ```js
  // src/services/category.service.js
  async function deleteCategory(categoryId, userId) {
    await withTransaction(async (client) => {
      await categoryRepo.reassignTodos(client, categoryId, defaultCategoryId, userId);
      await categoryRepo.deleteById(client, categoryId);
    });
  }
  ```

#### Repository 계층
- **책임**: DB와의 모든 통신을 담당한다. SQL 쿼리를 작성하고 `pg` Pool/Client를 통해 실행하며 결과를 도메인 객체(또는 DTO)로 변환하여 반환한다.
- **허용**: `pg` Pool/Client 사용, SQL 쿼리 작성, 결과 매핑.
- **금지**: 비즈니스 로직 작성, HTTP 관련 코드, Service/Controller import.
- **pg 사용 원칙**: ORM(Sequelize, TypeORM 등)은 사용하지 않는다. 반드시 `pg` 라이브러리를 직접 사용하여 SQL을 명시적으로 작성한다. 이를 통해 쿼리 의도가 코드에 투명하게 드러나야 한다.

#### 미들웨어

레이어 외부에 위치하는 횡단 관심사(cross-cutting concerns)를 처리한다.

| 미들웨어 | 파일 위치 | 역할 |
|---------|----------|------|
| `authenticate` | `src/middleware/authenticate.js` | JWT Access Token 검증, `req.user` 주입 |
| `validate` | `src/middleware/validate.js` | 요청 본문/파라미터 스키마 검증 |
| `rateLimiter` | `src/middleware/rateLimiter.js` | 엔드포인트별 Rate Limiting |
| `errorHandler` | `src/middleware/errorHandler.js` | 전역 에러 핸들러, 구조화된 에러 응답 생성 |

### 2.2 프론트엔드 레이어 정의

#### Page 컴포넌트
- **책임**: 라우팅 경로(`/`, `/login`, `/todos/new` 등)에 대응하는 최상위 뷰 컴포넌트. Feature Component를 조합하여 레이아웃을 구성한다.
- **허용**: Feature Component 조합, 페이지 수준 레이아웃 결정.
- **금지**: API 직접 호출, Zustand Store 직접 접근, UI 세부 구현(버튼, 입력 필드 등).

#### Feature Component
- **책임**: 특정 기능 단위(할일 등록 폼, 카테고리 목록 등)의 상태와 로직을 담당한다. TanStack Query와 Zustand를 사용하는 유일한 컴포넌트 계층이다.
- **허용**: TanStack Query hooks(`useQuery`, `useMutation`) 호출, Zustand store 구독, UI Component에 props 전달, 이벤트 핸들러 정의.
- **금지**: 직접적인 `fetch`/`axios` 호출(API 클라이언트 모듈에 위임), 전역 스타일 변경.

#### UI Component (공통 컴포넌트)
- **책임**: 재사용 가능한 시각적 요소(Button, Input, Modal, Badge 등). 순수하게 props를 받아 렌더링하는 Presentational Component다.
- **허용**: props 기반 렌더링, 내부 UI 상태(예: 드롭다운 열림/닫힘).
- **금지**: TanStack Query 직접 사용, Zustand store 직접 접근, 비즈니스 로직 포함.

#### TanStack Query (서버 상태)
- **책임**: 서버에서 가져오는 데이터(Todo 목록, Category 목록, User 정보)의 캐싱, 동기화, 재요청 처리.
- **원칙**: 모든 서버 데이터는 TanStack Query로 관리한다. Query Key는 도메인 객체와 필터를 포함하는 계층적 배열로 정의한다. (예: `['todos', { categoryId, isCompleted }]`)
- **Optimistic Update**: `PATCH /api/todos/:id` (완료 토글, SCN-10)에는 낙관적 업데이트를 적용하여 즉각적인 UI 반응을 제공한다.

#### Zustand (클라이언트 상태)
- **책임**: 서버 데이터가 아닌 클라이언트 전용 전역 상태 관리.
  - `authStore`: Access Token (메모리 저장, XSS 방어), 로그인 상태.
  - `uiStore`: 모달 열림/닫힘, 필터 선택 값 등 UI 상태.
- **원칙**: Access Token은 절대로 `localStorage`나 `sessionStorage`에 저장하지 않는다. 반드시 Zustand 메모리 내에만 보관한다 (PRD 4.3).

### 2.3 금지된 의존 방향

| 위반 패턴 | 위반 이유 |
|----------|---------|
| Repository → Service | 하위 레이어가 상위를 참조하는 역방향 의존 |
| Controller → Repository | Service 계층을 건너뛴 직접 접근으로 비즈니스 로직 우회 가능 |
| UI Component → TanStack Query/Zustand | 재사용성 파괴, 테스트 어려움 |
| Page → API 클라이언트 직접 호출 | Feature 계층을 건너뛴 의존 |
| 프론트엔드 → DB 직접 접근 | 아키텍처 원칙 위반 (SPA + REST API 분리 원칙) |

---

## 3. 코드·네이밍 원칙

### 3.1 Ubiquitous Language 준수

도메인 정의서(섹션 3.1)에 정의된 용어를 코드 식별자로 그대로 사용한다. 임의로 줄이거나 다른 용어로 대체하는 것을 금지한다.

| 도메인 용어 | 영문 식별자 | 잘못된 예 |
|-----------|-----------|---------|
| 할일 | `todo`, `Todo` | `task`, `item`, `work` |
| 카테고리 | `category`, `Category` | `tag`, `label`, `group` |
| 완료 여부 | `isCompleted`, `is_completed` | `isDone`, `done`, `checked` |
| 기간 만료 | `isOverdue` | `isExpired`, `isPast` |
| 종료예정일 | `dueDate`, `due_date` | `deadline`, `endDate` |
| 시작일 | `startDate`, `start_date` | `beginDate`, `from` |
| 기본 카테고리 | `defaultCategory`, `isDefault`, `is_default` | `general`, `uncategorized` |
| 개인정보 | `profile` (API/UI 맥락에서) | `info`, `account`, `settings` |

### 3.2 백엔드 네이밍 규칙

| 대상 | 규칙 | 예시 |
|------|------|------|
| 파일명 | `kebab-case.{layer}.js` | `todo.controller.js`, `category.service.js` |
| 함수명 | `camelCase`, 동사+명사 | `createTodo`, `getList`, `deleteCategory` |
| 변수/상수명 | `camelCase` | `userId`, `categoryId`, `accessToken` |
| 환경변수 | `SCREAMING_SNAKE_CASE` | `DATABASE_URL`, `JWT_ACCESS_SECRET` |
| 에러 클래스 | `{Domain}Error` | `NotFoundError`, `ForbiddenError` |

### 3.3 프론트엔드 네이밍 규칙

| 대상 | 규칙 | 예시 |
|------|------|------|
| 컴포넌트 파일명 | `PascalCase.tsx` | `TodoList.tsx`, `CategoryForm.tsx` |
| 컴포넌트 함수명 | `PascalCase` | `TodoList`, `CategoryDeleteModal` |
| 훅 파일명 | `camelCase.ts`, `use` 접두사 | `useTodos.ts`, `useCategories.ts` |
| 훅 함수명 | `camelCase`, `use` 접두사 | `useTodos`, `useCreateTodo` |
| 일반 유틸 파일명 | `camelCase.ts` | `dateUtils.ts`, `tokenUtils.ts` |
| 타입/인터페이스 파일명 | `camelCase.types.ts` | `todo.types.ts`, `auth.types.ts` |
| 타입/인터페이스 식별자 | `PascalCase` | `Todo`, `Category`, `User` |
| Zustand store 파일명 | `camelCase.store.ts` | `auth.store.ts`, `ui.store.ts` |
| API 클라이언트 파일명 | `camelCase.api.ts` | `todo.api.ts`, `auth.api.ts` |
| 상수 | `SCREAMING_SNAKE_CASE` | `MAX_CATEGORY_NAME_LENGTH` |
| CSS 클래스 | `kebab-case` (Tailwind 유틸 우선) | `todo-item`, `category-badge` |

### 3.4 API 엔드포인트 네이밍 규칙

PRD 9절에 정의된 REST API 설계 방향을 따른다.

- **접두사**: 모든 API는 `/api` 접두사를 사용한다.
- **명사형 복수**: 리소스는 복수형 명사로 표현한다. (`todos`, `categories`, `users`)
- **소문자 kebab-case**: 경로 세그먼트는 소문자와 하이픈을 사용한다.
- **HTTP 메서드로 동사 표현**: 경로에 `create`, `update`, `delete` 등의 동사를 포함하지 않는다.
- **중첩 최소화**: 리소스 중첩은 1단계를 원칙으로 한다.

| 도메인 | 메서드 | 경로 | 설명 |
|--------|--------|------|------|
| 인증 | POST | `/api/auth/signup` | 회원가입 |
| 인증 | POST | `/api/auth/login` | 로그인 |
| 인증 | POST | `/api/auth/logout` | 로그아웃 |
| 인증 | POST | `/api/auth/refresh` | Access Token 재발급 |
| 사용자 | GET | `/api/users/me` | 내 정보 조회 |
| 사용자 | PATCH | `/api/users/me` | 내 정보 수정 |
| 사용자 | DELETE | `/api/users/me` | 회원 탈퇴 |
| 카테고리 | GET | `/api/categories` | 카테고리 목록 조회 |
| 카테고리 | POST | `/api/categories` | 카테고리 생성 |
| 카테고리 | DELETE | `/api/categories/:id` | 카테고리 삭제 |
| 할일 | GET | `/api/todos` | 할일 목록 조회 (쿼리 필터) |
| 할일 | POST | `/api/todos` | 할일 생성 |
| 할일 | PATCH | `/api/todos/:id` | 할일 수정 |
| 할일 | DELETE | `/api/todos/:id` | 할일 삭제 |

**쿼리 파라미터 네이밍**: `camelCase` 사용.
- 예: `GET /api/todos?categoryId={uuid}&isCompleted=false&overdue=true`

### 3.5 DB 컬럼명 규칙

- 모든 DB 컬럼명은 `snake_case`를 사용한다.
- Boolean 컬럼은 `is_` 접두사를 사용한다. (`is_completed`, `is_default`)
- 외래 키는 `{참조 테이블 단수형}_id` 패턴을 사용한다. (`user_id`, `category_id`)
- 타임스탬프 컬럼은 `_at` 접미사를 사용한다. (`created_at`, `updated_at`, `expires_at`)
- Primary Key는 `id` (UUID 타입)를 사용한다.
- 날짜 데이터는 `DATE` 타입으로 UTC 기준 저장하며, 타임스탬프는 `TIMESTAMPTZ`를 사용한다.

---

## 4. 테스트·품질 원칙

### 4.1 테스트 전략

| 테스트 종류 | 대상 | 도구 | 경계 정의 |
|-----------|------|------|---------|
| 단위 테스트 | Service 계층 비즈니스 로직 | Jest | 외부 의존성(DB, HTTP)은 mock. 순수 비즈니스 규칙(BR)만 검증 |
| 통합 테스트 (백엔드) | Repository 계층 + 실제 DB | Jest + 실제 PostgreSQL | 실제 DB 연결 사용, 테스트 후 롤백 또는 teardown |
| API 통합 테스트 | Router → Controller → Service → DB 전 계층 | Jest + Supertest | 실제 DB 연결, 인증 미들웨어 포함 전체 스택 검증 |
| 컴포넌트 테스트 | React 컴포넌트 | Vitest + React Testing Library | TanStack Query/Zustand는 테스트용 wrapper로 격리 |
| E2E 테스트 | 핵심 사용자 흐름 | Playwright | 브라우저 + 실제 API 서버 |

### 4.2 백엔드 통합 테스트 원칙

- **Mock DB 사용 금지**: 백엔드 통합 테스트에서 DB를 mock하는 것을 원칙적으로 금지한다. `pg` 라이브러리를 통한 실제 PostgreSQL 연결을 사용하여 실제 환경과 동일한 조건에서 검증한다. Mock DB 사용 시 SQL 구문 오류, 제약 조건 위반, 트랜잭션 동작 차이 등을 검출하지 못한다.
- **테스트 전용 DB**: 통합 테스트는 `.env.test` 에 정의된 별도의 테스트 PostgreSQL DB를 사용한다. 개발 DB나 프로덕션 DB와 절대 공유하지 않는다.
- **테스트 격리**: 각 테스트 케이스 전후로 DB 상태를 초기화한다. `beforeEach`에서 시드 데이터를 삽입하고, `afterEach`에서 teardown한다. 트랜잭션 롤백 방식을 우선 검토한다.
- **트랜잭션 테스트 필수 항목**:
  - 카테고리 삭제 시 할일 재배정과 카테고리 삭제가 단일 트랜잭션으로 처리되는지 검증 (BR-07, SCN-15).
  - 회원 탈퇴 시 `refresh_tokens → todos → categories → users` 순서로 원자적 삭제가 이루어지는지 검증 (NFR-04, SCN-18).
  - DB 오류 주입 시 전체 롤백이 정상 동작하는지 검증.

**우선 검증 대상 (MVP 기준)**:
- UC-02: 로그인 — Access Token 발급, Refresh Token DB 저장
- UC-04: 할일 등록 — 비즈니스 규칙(BR-04, BR-05) 서버 검증
- UC-10: 카테고리 삭제 — 트랜잭션 원자성 (BR-07)
- UC-12: 회원 탈퇴 — 전체 데이터 원자적 삭제 (NFR-04)

### 4.3 프론트엔드 테스트 원칙

- **컴포넌트 단위 테스트**: React Testing Library를 사용하여 Feature Component의 렌더링, 사용자 인터랙션(클릭, 입력), 비동기 상태 표시를 검증한다.
- **서버 상태 격리**: TanStack Query가 관여하는 컴포넌트 테스트에서는 `QueryClientProvider` 테스트 wrapper를 사용하여 API 호출을 MSW(Mock Service Worker)로 인터셉트한다.
- **E2E 핵심 흐름**: Playwright로 다음 핵심 사용자 흐름을 검증한다.
  - SCN-01 (회원가입) → SCN-03 (로그인) → SCN-07 (할일 등록) → SCN-17 (로그아웃)
  - SCN-15 (카테고리 삭제 및 할일 재배정)
- **접근성**: 주요 인터랙티브 요소에 `aria-label`, `role` 속성을 부여하고, Testing Library의 `getByRole`/`getByLabelText` 쿼리를 우선 사용한다.

### 4.4 코드 품질 도구

| 도구 | 대상 | 설정 파일 | 핵심 규칙 |
|------|------|----------|---------|
| TypeScript (strict mode) | 프론트엔드 | `tsconfig.json` | `strict: true`, `noImplicitAny: true`, `strictNullChecks: true` |
| ESLint | 프론트엔드 (TS) | `.eslintrc.cjs` | `@typescript-eslint/recommended` |
| ESLint | 백엔드 (JS) | `.eslintrc.json` | `eslint:recommended`, `no-unused-vars` |
| Prettier | 프론트엔드 + 백엔드 | `.prettierrc` | 싱글 쿼트, 세미콜론 필수, 탭 너비 2 |
| Husky + lint-staged | Git pre-commit | `.husky/` | 커밋 전 ESLint + Prettier 자동 검사 |

---

## 5. 설정·보안·운영 원칙

### 5.1 환경변수 관리

- 환경별로 `.env` 파일을 분리한다: `.env.development`, `.env.test`, `.env.production`.
- `.env` 파일은 **절대 Git에 커밋하지 않는다**. `.gitignore`에 반드시 포함되어야 한다.
- 저장소에는 `.env.example` 파일만 커밋하며, 실제 값은 빈 값 또는 플레이스홀더로 작성한다.
- 애플리케이션 시작 시 필수 환경변수 존재 여부를 검증하고, 누락된 경우 즉시 프로세스를 종료한다.

**필수 환경변수 목록**:

| 변수명 | 설명 | 예시 |
|--------|------|------|
| `DATABASE_URL` | PostgreSQL 연결 문자열 | `postgresql://user:pass@localhost:5432/todolist` |
| `JWT_ACCESS_SECRET` | Access Token 서명 키 (최소 32자 이상 랜덤 문자열) | — |
| `JWT_REFRESH_SECRET` | Refresh Token 서명 키 (최소 32자 이상 랜덤 문자열) | — |
| `JWT_ACCESS_EXPIRES_IN` | Access Token 만료 시간 | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh Token 만료 시간 | `7d` |
| `BCRYPT_SALT_ROUNDS` | bcrypt salt rounds | `12` |
| `CORS_ORIGIN` | 허용 CORS origin | `https://app.example.com` |
| `PORT` | 서버 포트 | `3000` |
| `NODE_ENV` | 실행 환경 | `development` \| `test` \| `production` |

### 5.2 JWT 보안 원칙

PRD 4.3 및 NFR-03을 기반으로 아래 원칙을 적용한다.

- **Access Token**:
  - 저장 위치: 클라이언트 메모리(Zustand store)에만 저장. `localStorage`, `sessionStorage` 저장 금지 (XSS 공격 방어).
  - 만료 시간: 짧게 설정 (권장 15분).
  - 전달 방식: 모든 인증 API 요청의 `Authorization: Bearer {token}` 헤더.

- **Refresh Token**:
  - 저장 위치: `HttpOnly + Secure + SameSite=Strict` 쿠키로 발급 (JavaScript 접근 불가, XSS/CSRF 이중 방어).
  - 서버 저장: 발급 즉시 `SHA-256` 해싱 후 `refresh_tokens` 테이블에 저장.
  - 만료 시간: 7일 권장.
  - **Token Rotation**: `POST /api/auth/refresh` 호출 시 기존 Refresh Token을 DB에서 즉시 삭제하고 새 토큰을 발급한다. 재사용 감지 시 해당 사용자의 모든 Refresh Token을 일괄 폐기한다.

- **토큰 무효화 시점**:
  - 로그아웃 (UC-11): 서버 DB의 해당 Refresh Token 즉시 삭제.
  - 비밀번호 변경 (UC-03): 해당 사용자의 모든 Refresh Token 일괄 폐기 후 재로그인 유도.
  - 회원 탈퇴 (UC-12): 트랜잭션 내에서 모든 Refresh Token 삭제 (NFR-04).

- **서명 키 관리**: `JWT_ACCESS_SECRET`과 `JWT_REFRESH_SECRET`은 서로 다른 값을 사용해야 한다. 키는 최소 32바이트 이상의 암호학적으로 안전한 랜덤 문자열이어야 한다.

### 5.3 pg 커넥션 풀 설정 원칙

PRD NFR-02(최대 300명 동시 접속)를 기반으로 아래 원칙을 적용한다.

```js
// src/db/pool.js
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,                   // 최대 커넥션 수 (NFR-02: 20~30 권장)
  idleTimeoutMillis: 30000,  // 유휴 커넥션 해제 시간 (NFR-02: 30초)
  connectionTimeoutMillis: 5000, // 커넥션 획득 대기 시간 초과
});
```

- `max` 값은 PostgreSQL 서버의 `max_connections` 설정을 초과하지 않도록 조정한다.
- Pool 인스턴스는 애플리케이션 전역에서 단일 인스턴스로 사용한다 (싱글톤 패턴).
- 모든 Repository 함수는 Pool에서 커넥션을 획득하고 반드시 `finally` 블록에서 `client.release()`를 호출한다.
- 트랜잭션에서 사용한 `client`는 `COMMIT` 또는 `ROLLBACK` 이후 즉시 `release()`한다.

### 5.4 Rate Limiting 원칙

PRD NFR-03을 기반으로 로그인 및 회원가입 엔드포인트에 Rate Limiting을 적용한다.

- **대상 엔드포인트**: `POST /api/auth/login`, `POST /api/auth/signup`
- **제한 기준**: IP 주소당 분당 10회 초과 시 `429 Too Many Requests` 응답.
- **초과 응답 형식**: 표준 에러 응답 형식을 따르며 `Retry-After` 헤더를 포함한다.
- **구현 방식**: `express-rate-limit` 라이브러리를 Router 레벨 미들웨어로 적용.

```js
// src/middleware/rateLimiter.js
const rateLimit = require('express-rate-limit');

const authRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1분
  max: 10,             // 최대 10회
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.' },
});
```

### 5.5 bcrypt 설정 원칙

- `salt rounds`는 최소 `12` 이상으로 설정한다 (NFR-03, SCN-01).
- 값은 환경변수 `BCRYPT_SALT_ROUNDS`에서 읽어 주입한다. 코드에 하드코딩하지 않는다.
- 비밀번호 검증 시에는 `bcrypt.compare()`를 사용하며, 타이밍 공격 방지를 위해 해시 비교 시간을 균일하게 유지한다.
- 비밀번호 정책: 최소 8자, 영문 + 숫자 조합 필수 (NFR-03). 서버에서도 반드시 검증한다.

### 5.6 HTTPS 및 CORS 설정 원칙

- **HTTPS**: 프로덕션 환경에서는 HTTPS를 필수로 적용한다. Refresh Token 쿠키의 `Secure` 속성이 HTTPS에서만 전달되기 때문이다.
- **CORS**: `cors` 미들웨어를 사용하여 허용 출처를 환경변수 `CORS_ORIGIN`으로 제한한다. 와일드카드(`*`) 허용은 금지한다.

```js
// src/app.js
const cors = require('cors');

app.use(cors({
  origin: process.env.CORS_ORIGIN,
  credentials: true,   // HttpOnly 쿠키 전달을 위해 필수
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
}));
```

- **Helmet**: `helmet` 미들웨어를 적용하여 보안 관련 HTTP 헤더(`X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security` 등)를 자동 설정한다.

### 5.7 에러 응답 표준 형식

모든 API 에러 응답은 아래 형식을 따른다.

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "종료예정일은 시작일과 같거나 이후 날짜여야 합니다.",
    "details": [
      { "field": "due_date", "message": "must be >= start_date" }
    ]
  }
}
```

- HTTP 상태 코드와 `error.code`를 함께 사용하여 클라이언트가 에러 종류를 식별할 수 있도록 한다.
- 401 (비인증), 403 (권한 없음), 404 (리소스 없음), 409 (중복), 422 (유효성 오류), 429 (Rate Limiting 초과) 상태 코드를 일관되게 사용한다.

---

## 6. 디렉토리 구조

### 6.1 백엔드 디렉토리 구조

```
backend/
├── src/
│   ├── app.js                          # Express 앱 초기화, 미들웨어 등록
│   ├── server.js                       # HTTP 서버 시작 진입점, 환경변수 검증
│   │
│   ├── config/
│   │   └── env.js                      # 환경변수 로드 및 유효성 검증 (필수값 누락 시 프로세스 종료)
│   │
│   ├── db/
│   │   ├── pool.js                     # pg Pool 싱글톤 인스턴스 생성 및 export
│   │   ├── transaction.js              # withTransaction 헬퍼 (BEGIN/COMMIT/ROLLBACK)
│   │   ├── utils.js                    # DB 연결 확인, 마이그레이션 실행 유틸
│   │   └── migrations/                 # DB 마이그레이션 SQL 파일 (버전 관리)
│   │       ├── 001_create_users.sql
│   │       ├── 002_create_refresh_tokens.sql
│   │       ├── 003_create_categories.sql
│   │       ├── 004_create_todos.sql
│   │       └── 005_seed_default_categories.sql  # 기본 카테고리 시드 데이터
│   │
│   ├── middleware/
│   │   ├── authenticate.js             # JWT Access Token 검증, req.user 주입
│   │   ├── validate.js                 # 요청 본문/파라미터 스키마 검증 (Zod 사용)
│   │   ├── rateLimiter.js              # 인증 엔드포인트 Rate Limiting 설정
│   │   └── errorHandler.js             # 전역 에러 핸들러, 표준 에러 응답 생성
│   │
│   ├── routes/
│   │   ├── auth.route.js               # POST /api/auth/* 경로 정의 및 미들웨어 조립
│   │   ├── user.route.js               # GET|PATCH|DELETE /api/users/me 경로 정의
│   │   ├── todo.route.js               # GET|POST|PATCH|DELETE /api/todos/* 경로 정의
│   │   └── category.route.js           # GET|POST|DELETE /api/categories/* 경로 정의
│   │
│   ├── controllers/
│   │   ├── auth.controller.js          # 회원가입, 로그인, 로그아웃, 토큰 재발급 요청 처리
│   │   ├── user.controller.js          # 내 정보 조회·수정, 회원 탈퇴 요청 처리
│   │   ├── todo.controller.js          # 할일 CRUD 요청 처리
│   │   └── category.controller.js      # 카테고리 목록 조회, 생성, 삭제 요청 처리
│   │
│   ├── services/
│   │   ├── auth.service.js             # 회원가입/로그인 비즈니스 로직, JWT 발급, Refresh Token 관리
│   │   ├── user.service.js             # 개인정보 수정, 비밀번호 변경, 회원 탈퇴 트랜잭션 처리
│   │   ├── todo.service.js             # 할일 CRUD 비즈니스 로직, BR-03~BR-05 검증
│   │   └── category.service.js         # 카테고리 생성·삭제 비즈니스 로직, BR-06~BR-07 트랜잭션 처리
│   │
│   ├── repositories/
│   │   ├── user.repository.js          # users 테이블 쿼리 (이메일 중복 확인, 조회, 수정, 삭제)
│   │   ├── refreshToken.repository.js  # refresh_tokens 테이블 쿼리 (저장, 검증, 삭제)
│   │   ├── todo.repository.js          # todos 테이블 쿼리 (필터 조회, 생성, 수정, 삭제)
│   │   └── category.repository.js      # categories 테이블 쿼리 (목록 조회, 생성, 삭제, 할일 재배정)
│   │
│   ├── scripts/
│   │   └── migrate.js                  # 마이그레이션 단독 실행 스크립트
│   │
│   └── utils/
│       ├── jwt.js                      # JWT 발급, 검증 유틸 함수
│       ├── hash.js                     # bcrypt 해싱, 비교 유틸 함수
│       ├── tokenHash.js                # Refresh Token SHA-256 해싱 유틸
│       └── errors.js                   # 커스텀 에러 클래스 정의 (NotFoundError, ForbiddenError 등)
│
├── tests/
│   ├── unit/                           # 단위 테스트 — Service 비즈니스 로직 (DB mock)
│   │   ├── auth.service.test.js
│   │   ├── todo.service.test.js
│   │   └── category.service.test.js
│   ├── integration/                    # 통합 테스트 — 실제 PostgreSQL 연결 (mock DB 사용 금지)
│   │   ├── auth.test.js                # 인증 API 전 계층 통합 검증 (Supertest)
│   │   ├── todo.test.js                # 할일 CRUD API 통합 검증
│   │   ├── category.test.js            # 카테고리 삭제 트랜잭션 통합 검증
│   │   └── user.test.js                # 회원 탈퇴 원자적 삭제 트랜잭션 검증
│   └── helpers/
│       ├── dbSetup.js                  # 테스트 DB 초기화, 시드 데이터 삽입 유틸
│       └── authHelper.js               # 테스트용 JWT 발급, 인증 헤더 생성 유틸
│
├── .env.example                        # 환경변수 목록 (실제 값 없음, Git 커밋 허용)
├── .env.development                    # 개발 환경 변수 (Git 커밋 금지)
├── .env.test                           # 테스트 환경 변수, 테스트 DB URL (Git 커밋 금지)
├── .gitignore
├── .eslintrc.json
├── .prettierrc
├── jest.config.js
└── package.json
```

### 6.2 프론트엔드 디렉토리 구조

```
frontend/
├── src/
│   ├── main.tsx                        # React 앱 진입점, QueryClientProvider, Router 설정
│   ├── App.tsx                         # 최상위 라우팅 구성, 인증 여부에 따른 접근 제어
│   │
│   ├── pages/                          # 라우팅 경로에 대응하는 Page 컴포넌트
│   │   ├── LoginPage.tsx               # /login — 로그인 화면
│   │   ├── SignupPage.tsx              # /signup — 회원가입 화면
│   │   ├── TodoListPage.tsx            # / — 할일 목록 메인 화면 (인증 필요)
│   │   ├── TodoFormPage.tsx            # /todos/new, /todos/:id/edit — 할일 등록/수정 화면
│   │   ├── CategoryPage.tsx            # /categories — 카테고리 관리 화면
│   │   └── ProfilePage.tsx             # /profile — 개인정보 수정, 회원 탈퇴 화면
│   │
│   ├── features/                       # 기능 단위 Feature Component (상태 로직 포함)
│   │   ├── auth/
│   │   │   ├── LoginForm.tsx           # 로그인 폼, useLogin mutation 사용
│   │   │   └── SignupForm.tsx          # 회원가입 폼, useSignup mutation 사용
│   │   ├── todo/
│   │   │   ├── TodoList.tsx            # 할일 목록, useTodos 쿼리 사용, 필터 적용
│   │   │   ├── TodoItem.tsx            # 할일 단일 항목, 완료 토글/삭제 Optimistic Update
│   │   │   ├── TodoForm.tsx            # 할일 등록/수정 폼, useCreateTodo/useUpdateTodo 사용
│   │   │   └── TodoFilter.tsx          # 카테고리/완료 여부/기간 만료 필터 UI 및 상태 관리
│   │   ├── category/
│   │   │   ├── CategoryList.tsx        # 카테고리 목록, useCategories 쿼리, 삭제 핸들러
│   │   │   └── CategoryForm.tsx        # 카테고리 추가 폼, useCreateCategory mutation
│   │   └── profile/
│   │       ├── ProfileForm.tsx         # 이름 수정 폼, useUpdateProfile mutation
│   │       ├── PasswordForm.tsx        # 비밀번호 변경 폼, 현재 비밀번호 검증 포함
│   │       └── DeleteAccountSection.tsx # 회원 탈퇴 섹션, 비밀번호 확인 + 최종 확인 다이얼로그
│   │
│   ├── components/                     # 재사용 가능한 순수 UI 컴포넌트 (props 기반)
│   │   ├── Button.tsx                  # 버튼 컴포넌트 (variant: primary|secondary|danger)
│   │   ├── Input.tsx                   # 텍스트 입력 필드 (에러 메시지 표시 포함)
│   │   ├── Modal.tsx                   # 모달 다이얼로그 (확인, 취소 액션)
│   │   ├── Badge.tsx                   # 상태 배지 (완료, 기간 초과 등 표시)
│   │   ├── Spinner.tsx                 # 로딩 스피너
│   │   ├── Toast.tsx                   # 개별 토스트 알림 메시지 컴포넌트
│   │   ├── ToastContainer.tsx          # ui.store의 toastQueue 구독, Toast 목록 렌더링
│   │   └── Layout.tsx                  # 공통 레이아웃 (헤더 네비게이션 포함)
│   │
│   ├── hooks/                          # TanStack Query 기반 커스텀 훅
│   │   ├── useAuthInitializer.ts       # 앱 마운트 시 /api/users/me 호출, 인증 상태 복구
│   │   ├── useTodos.ts                 # useQuery: 할일 목록 조회 (필터 파라미터 포함)
│   │   ├── useCreateTodo.ts            # useMutation: 할일 생성
│   │   ├── useUpdateTodo.ts            # useMutation: 할일 수정 (Optimistic Update 적용)
│   │   ├── useDeleteTodo.ts            # useMutation: 할일 삭제
│   │   ├── useCategories.ts            # useQuery: 카테고리 목록 조회
│   │   ├── useCreateCategory.ts        # useMutation: 카테고리 생성
│   │   ├── useDeleteCategory.ts        # useMutation: 카테고리 삭제 (확인 후 실행)
│   │   ├── useLogin.ts                 # useMutation: 로그인, Access Token Zustand 저장
│   │   ├── useLogout.ts                # useMutation: 로그아웃, 토큰 초기화
│   │   ├── useProfile.ts               # useQuery: 내 정보 조회
│   │   ├── useUpdateProfile.ts         # useMutation: 이름 수정
│   │   ├── useUpdatePassword.ts        # useMutation: 비밀번호 변경
│   │   └── useDeleteAccount.ts         # useMutation: 회원 탈퇴 (2단계 플로우)
│   │
│   ├── stores/                         # Zustand 전역 상태 스토어
│   │   ├── auth.store.ts               # accessToken (메모리), isAuthenticated, setToken, clearToken
│   │   └── ui.store.ts                 # 모달 열림/닫힘 상태, 전역 UI 상태
│   │
│   ├── api/                            # API 클라이언트 모듈 (fetch/axios 래퍼)
│   │   ├── client.ts                   # axios 인스턴스 생성, 인터셉터 설정 (자동 토큰 갱신)
│   │   ├── auth.api.ts                 # /api/auth/* 엔드포인트 호출 함수
│   │   ├── todo.api.ts                 # /api/todos/* 엔드포인트 호출 함수
│   │   ├── category.api.ts             # /api/categories/* 엔드포인트 호출 함수
│   │   ├── user.api.ts                 # /api/users/me 엔드포인트 호출 함수
│   │   ├── mappers.ts                  # API 응답(snake_case) → 프론트엔드 타입(camelCase) 변환
│   │   └── queryKeys.ts                # TanStack Query 키 팩토리 (todoKeys, categoryKeys 등)
│   │
│   ├── types/                          # 공유 TypeScript 타입 정의
│   │   ├── todo.types.ts               # Todo, CreateTodoRequest, UpdateTodoRequest, TodoFilter
│   │   ├── category.types.ts           # Category, CreateCategoryRequest
│   │   ├── auth.types.ts               # LoginRequest, SignupRequest, AuthResponse
│   │   └── user.types.ts               # User, UpdateUserRequest
│   │
│   └── utils/
│       └── dateUtils.ts                # Overdue 판단 로직 (클라이언트 로컬 타임존 기준, NFR-07)
│
├── src/test/                           # Vitest + React Testing Library 단위·컴포넌트 테스트
│   ├── setup.ts                        # Vitest 전역 설정 (MSW, jsdom 초기화)
│   ├── mocks/
│   │   ├── handlers.ts                 # MSW API 핸들러 (전 엔드포인트 모킹)
│   │   └── server.ts                   # MSW 서버 인스턴스
│   ├── components/                     # 공통 UI 컴포넌트 테스트
│   │   ├── Button.test.tsx
│   │   ├── Input.test.tsx
│   │   ├── Modal.test.tsx
│   │   ├── Badge.test.tsx
│   │   ├── Spinner.test.tsx
│   │   ├── Layout.test.tsx
│   │   └── ToastContainer.test.tsx
│   ├── features/                       # Feature 컴포넌트 테스트
│   │   ├── auth/LoginForm.test.tsx
│   │   ├── auth/SignupForm.test.tsx
│   │   ├── todo/TodoItem.test.tsx
│   │   ├── todo/TodoList.test.tsx
│   │   ├── todo/TodoForm.test.tsx
│   │   ├── todo/TodoFilter.test.tsx
│   │   ├── category/CategoryList.test.tsx
│   │   ├── category/CategoryForm.test.tsx
│   │   ├── profile/ProfileForm.test.tsx
│   │   ├── profile/PasswordForm.test.tsx
│   │   └── profile/DeleteAccountSection.test.tsx
│   ├── hooks/                          # 커스텀 훅 테스트
│   │   ├── useAuthInitializer.test.tsx
│   │   ├── useTodos.test.tsx
│   │   └── ...
│   ├── routing/                        # PrivateRoute / PublicRoute 테스트
│   ├── stores/                         # Zustand store 테스트
│   └── utils/
│       └── dateUtils.test.ts           # isOverdue 경계값 테스트
│
├── tests/
│   └── e2e/                            # E2E 테스트 (Playwright)
│       ├── global.setup.ts             # 테스트 전 사용자 사전 생성 (Rate Limit 대응)
│       ├── auth.spec.ts                # SCN-01, SCN-03, SCN-17 전체 흐름 검증
│       ├── todo.spec.ts                # SCN-07 (할일 등록), SCN-10 (완료 토글) 검증
│       ├── category.spec.ts            # SCN-15 (카테고리 삭제 및 할일 재배정) 검증
│       ├── helpers/auth.ts             # loginAs, signupAndLogin 재사용 헬퍼
│       └── .auth/                      # 테스트 사용자 storageState (Git 제외)
│
├── public/
│   └── favicon.ico
├── index.html
├── .env.example                        # 환경변수 목록 (VITE_API_BASE_URL 등)
├── .env.development                    # 개발 환경 변수 (Git 커밋 금지)
├── .gitignore
├── .eslintrc.cjs
├── .prettierrc
├── vite.config.ts                      # Vite 빌드 설정, 경로 별칭(@/) 설정
├── vitest.config.ts                    # Vitest 테스트 설정
├── playwright.config.ts                # Playwright E2E 설정
├── tsconfig.json                       # strict: true 설정
└── package.json
```

---

## 변경 이력

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|---------|
| 0.1.0-draft | 2026-05-13 | MinYoung | 최초 작성 (도메인 정의서 v0.1.0-draft, PRD v0.2.0-draft, 사용자 시나리오 v0.1.0-draft 기반) |
| 0.2.0 | 2026-05-15 | MinYoung | §6.2 프론트엔드 디렉토리 구조를 실제 구현에 맞게 업데이트 — 추가 hooks(useAuthInitializer, useUpdateProfile, useUpdatePassword, useDeleteAccount), components(ToastContainer), api(mappers.ts, queryKeys.ts), 테스트 구조(src/test/ + tests/e2e/) 반영, 존재하지 않는 tokenUtils.ts·validationUtils.ts 삭제 |
