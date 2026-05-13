# TodoListApp 제품 요구사항 정의서 (PRD)

> 버전: 0.1.0-draft | 작성일: 2026-05-13 | 참조: 도메인 정의서 v0.1.0-draft

---

## 1. 제품 개요

| 항목 | 내용 |
|------|------|
| 제품명 | TodoListApp |
| 목적 | 인증된 사용자가 개인 할일을 카테고리 단위로 체계적으로 관리할 수 있는 반응형 웹 애플리케이션 |
| 대상 사용자 | 20대~50대 직장인 |
| 플랫폼 | Web / Mobile Web (반응형 웹 UI) |
| 개발 형태 | 소규모 개인 프로젝트 |

---

## 2. 목표 및 성공 지표

### 2.1 제품 목표

| # | 목표 |
|---|------|
| G-01 | 인증된 사용자가 자신만의 할일 데이터를 안전하게 관리할 수 있는 환경 제공 |
| G-02 | 카테고리 기반 분류로 할일의 맥락적 관리 지원 |
| G-03 | 데스크톱·모바일 환경 모두에서 일관된 사용 경험 제공 |

### 2.2 성공 지표 (1차 릴리즈 기준)

| 지표 | 목표값 |
|------|--------|
| 핵심 유스케이스(UC-01~UC-12) 구현 완료율 | 100% |
| 동시 접속 처리 | 300명 이상 |
| 주요 API 응답 시간 | 95th percentile ≤ 500ms |
| 반응형 레이아웃 지원 | 모바일(360px) ~ 데스크톱(1440px) |

---

## 3. 사용자 및 환경

### 3.1 사용자 페르소나

| 구분 | 설명 |
|------|------|
| 연령대 | 20대~50대 |
| 직업 | 직장인 (업무 외 개인 일정 관리 필요) |
| 사용 환경 | 업무 중 PC 브라우저, 이동 중 스마트폰 브라우저 |
| 기술 수준 | 일반 웹 서비스 사용에 익숙한 수준 |

### 3.2 지원 플랫폼

- **Web**: 최신 Chrome, Edge, Safari, Firefox (최근 2 메이저 버전)
- **Mobile Web**: iOS Safari, Android Chrome
- **레이아웃**: 반응형 (Breakpoint: 360px / 768px / 1280px)

---

## 4. 기술 스택

### 4.1 구성

| 영역 | 기술 |
|------|------|
| 프론트엔드 | React 19, TypeScript, Zustand, TanStack Query |
| 백엔드 | Node.js, Express (REST API) |
| 데이터베이스 | PostgreSQL 17 |
| DB 클라이언트 | **pg** 라이브러리 (PostgreSQL 연동 시 반드시 사용) |
| 인증 | JWT (Access Token + Refresh Token) |
| 토큰 저장 | Access Token: 클라이언트 메모리(Zustand), Refresh Token: HttpOnly Cookie |

### 4.2 인증 확장 계획

- **1차**: JWT 기반 이메일·비밀번호 인증
- **2차 이후**: OAuth 2.0 소셜 로그인 (Google, Facebook 등) 확장 — 백엔드 인증 레이어는 소셜 인증 추가를 고려한 구조로 설계

### 4.3 아키텍처 원칙

- 프론트엔드-백엔드 완전 분리 (SPA + REST API)
- API 인증: Authorization 헤더의 Bearer JWT
- 상태 관리: 서버 상태는 TanStack Query, 클라이언트 전역 상태는 Zustand
- **토큰 보안**: Access Token은 메모리에만 보관(XSS 방어), Refresh Token은 HttpOnly + Secure + SameSite=Strict Cookie로 발급(스크립트 접근 불가)
- **Refresh Token 서버 관리**: 발급된 Refresh Token은 해싱(SHA-256) 후 DB(`refresh_tokens` 테이블)에 저장. 로그아웃·탈퇴·재발급 시 서버에서 즉시 무효화. Token Rotation 적용(재발급 시 기존 토큰 폐기)
- **OAuth 확장 대비**: `users` 테이블에 `auth_provider` / `provider_id` 컬럼을 초기 스키마에 포함하여 Phase 2 소셜 로그인 추가 시 파괴적 스키마 변경 방지
- **날짜·시간 기준**: 서버는 UTC로 저장하고 ISO 8601 형식으로 반환. 기간 만료(Overdue) 판단은 클라이언트 로컬 타임존 기준으로 수행

---

## 5. 비기능 요구사항

| ID | 항목 | 요구사항 |
|----|------|---------|
| NFR-01 | 성능 | 주요 API(목록 조회, 생성, 수정) 응답 시간 95th percentile ≤ 500ms |
| NFR-02 | 동시 접속 | 최대 300명 동시 접속 처리. pg Pool max 설정: 20~30, idleTimeoutMillis: 30000 |
| NFR-03 | 보안 | 비밀번호 bcrypt 해싱(salt rounds ≥ 12) 저장; 최소 8자·영문+숫자 조합 필수; 로그인·회원가입 엔드포인트 Rate Limiting 적용(예: 분당 10회); JWT 서명 검증; HTTPS 적용 |
| NFR-04 | 데이터 보존 | 회원 탈퇴 시 해당 사용자의 모든 데이터(할일, 카테고리, Refresh Token, 계정) 단일 DB 트랜잭션으로 원자적 삭제. 실패 시 전체 롤백 |
| NFR-05 | 반응형 | 360px~1440px 뷰포트 범위에서 레이아웃 깨짐 없이 동작 |
| NFR-06 | 접근 제어 | 인증되지 않은 요청에 대해 API 401 응답, 타 사용자 리소스 접근 시 403 응답 |
| NFR-07 | 날짜·시간 | 서버 DB에 UTC 저장, API 응답은 ISO 8601 + UTC offset 형식. Overdue 판단은 클라이언트 로컬 타임존 기준 |

---

## 6. 기능 요구사항

### 6.1 1차 릴리즈 범위 (MVP)

> 개발 일정 3일 기준. 도메인 정의서 UC-01~UC-12 전체 포함.

#### 인증 (Identity)

| UC | 기능 | 필수 입력 | 주요 규칙 |
|----|------|----------|---------|
| UC-01 | 회원가입 | 이메일, 비밀번호, 이름 | 이메일 중복 불가 (BR-01) |
| UC-02 | 로그인 | 이메일, 비밀번호 | JWT 발급 (Access + Refresh Token) |
| UC-11 | 로그아웃 | — | 클라이언트 토큰 폐기 + 서버 DB의 Refresh Token 즉시 무효화 |
| UC-12 | 회원 탈퇴 | 비밀번호 확인 | 단일 트랜잭션으로 Refresh Token → Todo → Category → User 순서 원자적 삭제 (NFR-04) |

#### 개인정보

| UC | 기능 | 수정 가능 필드 | 주요 규칙 |
|----|------|--------------|---------|
| UC-03 | 개인정보 수정 | 이름, 비밀번호 | 비밀번호 변경 시 현재 비밀번호 확인 필요 |

#### 카테고리 관리

| UC | 기능 | 주요 규칙 |
|----|------|---------|
| UC-09 | 카테고리 추가 | 동일 사용자 내 카테고리명 중복 불가, 기본 카테고리와 동명 불가 |
| UC-10 | 카테고리 삭제 | 기본 카테고리 삭제 불가 (BR-06); 삭제와 소속 할일 재배정을 단일 DB 트랜잭션으로 원자적 처리 — 실패 시 전체 롤백 (BR-07) |

#### 할일 관리

| UC | 기능 | 필수 입력 | 주요 규칙 |
|----|------|----------|---------|
| UC-04 | 할일 등록 | 제목, 카테고리 | 카테고리 필수, 기본 또는 본인 소유만 선택 가능 (BR-04); 종료예정일 ≥ 시작일 (BR-05) |
| UC-05 | 할일 수정 | — | 본인 소유 할일만 수정 가능 (BR-03) |
| UC-06 | 할일 완료 처리 | — | 완료 ↔ 미완료 토글 |
| UC-07 | 할일 삭제 | — | 삭제 전 확인 단계 포함 |
| UC-08 | 할일 목록 조회 | — | 필터: 카테고리 / 완료 여부 / 기간 만료 여부 (BR-08) |

### 6.2 2차 이후 릴리즈 (Out of Scope — Phase 1)

| 기능 | 사유 |
|------|------|
| 다크 모드 | UI 우선순위 낮음, Phase 2 확장 |
| 다국어(i18n) 지원 | Phase 2 확장 |
| 소셜 로그인 (Google, Facebook) | 인증 인프라 추가 필요, Phase 2 확장 |
| 할일 알림 / 푸시 | 외부 서비스 연동 필요 |
| 할일 공유 / 협업 | 현재 도메인 범위 외 |

---

## 7. 비즈니스 규칙 (도메인 정의서 참조)

| ID | 규칙 |
|----|------|
| BR-01 | 이메일 주소는 시스템 전체에서 고유해야 한다 |
| BR-02 | 인증되지 않은 사용자는 할일 및 카테고리에 접근할 수 없다 |
| BR-03 | 사용자는 자신이 소유한 할일과 카테고리만 조회·수정·삭제할 수 있다 |
| BR-04 | 할일 등록 시 카테고리는 필수이며, 기본 카테고리 또는 본인 소유 카테고리만 선택 가능하다 |
| BR-05 | 종료예정일은 시작일과 같거나 이후 날짜여야 한다 |
| BR-06 | 기본 카테고리는 사용자가 수정하거나 삭제할 수 없다 |
| BR-07 | 카테고리가 삭제될 경우, 해당 카테고리에 속한 할일은 기본 카테고리로 자동 재배정된다 |
| BR-08 | 할일 목록은 카테고리 / 기간 만료 여부 / 완료 여부 기준으로 필터링할 수 있다 |

---

## 8. 화면 구성 (페이지 목록)

| 페이지 | 경로 | 접근 권한 | 주요 기능 |
|--------|------|----------|---------|
| 회원가입 | `/signup` | 비인증 | UC-01 |
| 로그인 | `/login` | 비인증 | UC-02 |
| 할일 목록 | `/` | 인증 필요 | UC-08, UC-06, UC-07, UC-04 진입 |
| 할일 등록/수정 | `/todos/new`, `/todos/:id/edit` | 인증 필요 | UC-04, UC-05 |
| 카테고리 관리 | `/categories` | 인증 필요 | UC-09, UC-10 |
| 개인정보 수정 | `/profile` | 인증 필요 | UC-03, UC-12 |

---

## 9. API 설계 방향 (REST)

| 도메인 | 엔드포인트 패턴 | 비고 |
|--------|---------------|------|
| 인증 | `POST /api/auth/signup` `POST /api/auth/login` `POST /api/auth/logout` `POST /api/auth/refresh` | Refresh Token으로 Access Token 재발급 |
| 사용자 | `GET /api/users/me` `PATCH /api/users/me` `DELETE /api/users/me` | 본인만 접근 가능 |
| 카테고리 | `GET /api/categories` `POST /api/categories` `DELETE /api/categories/:id` | 기본 카테고리 포함 목록 반환 |
| 할일 | `GET /api/todos` `POST /api/todos` `PATCH /api/todos/:id` `DELETE /api/todos/:id` | 쿼리 파라미터로 필터 적용 |

---

## 10. 데이터 모델 요약

```
User
├── id (PK, UUID)
├── email (UNIQUE, nullable — OAuth 전용 계정은 이메일 없을 수 있음)
├── password_hash (nullable — OAuth 사용자는 NULL)
├── name
├── auth_provider   : 'local' | 'google' | 'facebook'  (기본값: 'local')
├── provider_id     : OAuth 제공자의 사용자 ID (local은 NULL)
├── created_at
└── updated_at

RefreshToken
├── id (PK, UUID)
├── user_id (FK → User, ON DELETE CASCADE)
├── token_hash      : SHA-256 해싱 저장
├── expires_at
└── created_at

Category
├── id (PK, UUID)
├── user_id (FK → User, NULL = 기본 카테고리)
├── name
├── is_default (boolean)
└── created_at

Todo
├── id (PK, UUID)
├── user_id (FK → User)
├── category_id (FK → Category)
├── title
├── description
├── start_date      : DATE, UTC 기준 저장
├── due_date        : DATE, UTC 기준 저장
├── is_completed (boolean)
├── created_at
└── updated_at
```

**기본 카테고리**: 시스템 초기 데이터로 삽입 (`user_id = NULL`, `is_default = true`). 신규 사용자 가입 시 별도 생성 불필요.

**RefreshToken 정책**: 재발급(`POST /api/auth/refresh`) 시 기존 토큰 삭제 후 신규 토큰 발급(Token Rotation). 만료된 토큰으로 재발급 시도 시 해당 사용자의 모든 Refresh Token 일괄 폐기.

---

## 11. 개발 일정 (3일)

| 일차 | 작업 범위 |
|------|---------|
| Day 1 | DB 스키마 설계 및 마이그레이션 (RefreshToken 테이블 포함), 인증 API (회원가입·로그인·로그아웃·토큰 재발급), 사용자 API (조회·수정·탈퇴) |
| Day 2 | 카테고리 API (목록·추가·삭제, 트랜잭션 처리), 할일 CRUD API (필터 조회 포함), 프론트엔드 인증 흐름 (로그인·회원가입) |
| Day 3 | 프론트엔드 할일 목록·등록·수정·삭제·카테고리 관리·개인정보 수정 화면, 반응형 UI 조정 |

> **통합 테스트**: 3일 일정의 과부하를 방지하기 위해 Day 3 완료 후 별도 세션에서 수행. 핵심 UC(인증·할일 CRUD·카테고리 삭제 트랜잭션)를 우선 검증한다.

---

## 12. 향후 확장 계획 (Phase 2)

| 항목 | 내용 |
|------|------|
| 소셜 로그인 | OAuth 2.0 (Google, Facebook) — 백엔드 인증 레이어 확장 |
| 다크 모드 | CSS 변수 기반 테마 전환 |
| 다국어 지원 | i18n 라이브러리 적용 (한국어·영어 우선) |

---

*이 문서는 도메인 정의서(v0.1.0-draft)를 기반으로 작성된 초안이며, 개발 착수 전 최종 검토를 거쳐 확정된다.*

---

## 변경 이력

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|---------|
| 0.1.0-draft | 2026-05-13 | MinYoung | 최초 작성 (도메인 정의서 기반 PRD 초안) |
| 0.2.0-draft | 2026-05-13 | MinYoung | 위험도 평가 반영: 토큰 보안 정책(RISK-01,02,13), 트랜잭션 원자성(RISK-03,04), OAuth 확장 대비 스키마(RISK-06), Timezone 정책(RISK-05), 일정 조정(RISK-07) |
