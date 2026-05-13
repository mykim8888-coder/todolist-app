# TodoListApp 기술 아키텍처 다이어그램

> 버전: 0.1.0-draft | 작성일: 2026-05-13
>
> 참조 문서:
> - 제품 요구사항 정의서 v0.2.0-draft (`docs/2-prd.md`)
> - 프로젝트 구조 설계 원칙 v0.1.0-draft (`docs/4-project-principles.md`)

---

## 목차

1. [전체 시스템 구성 (C4 Container)](#1-전체-시스템-구성-c4-container-수준)
2. [백엔드 레이어 구조](#2-백엔드-레이어-구조)
3. [인증 흐름 (JWT)](#3-인증-흐름-jwt)

---

## 1. 전체 시스템 구성 (C4 Container 수준)

**설명**: TodoListApp의 최상위 시스템 구조. 사용자, 프론트엔드, 백엔드, 데이터베이스 4개 구성요소 간의 통신 흐름을 표현합니다.

```mermaid
flowchart TD
    User["👤 User<br/>Browser / Mobile Browser"]
    Frontend["💻 Frontend<br/>React 19 SPA<br/>(TypeScript)"]
    Backend["⚙️ Backend<br/>Express REST API<br/>(Node.js)"]
    Database["🗄️ Database<br/>PostgreSQL 17"]
    
    User -->|HTTPS| Frontend
    Frontend -->|REST/JSON<br/>Bearer JWT| Backend
    Backend -->|SQL/pg<br/>Connection Pool| Database
    Database -->|Result Set| Backend
    
    style User fill:#e1f5ff,stroke:#01579b,stroke-width:2px
    style Frontend fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    style Backend fill:#e8f5e9,stroke:#1b5e20,stroke-width:2px
    style Database fill:#fff3e0,stroke:#e65100,stroke-width:2px
```

### 구성요소 설명

| 구성요소 | 역할 | 주요 기술 |
|---------|------|---------|
| **User** | 직장인 대상 웹 애플리케이션 사용자 | Chrome, Safari, Firefox (최신 2 메이저 버전) |
| **Frontend** | 인증된 사용자를 위한 반응형 웹 UI | React 19, TypeScript, Zustand, TanStack Query |
| **Backend** | 비즈니스 로직 및 데이터 접근 제어 | Express.js, JWT 인증, 트랜잭션 처리 |
| **Database** | 사용자, 할일, 카테고리, 토큰 데이터 저장 | PostgreSQL 17, pg 라이브러리 (ORM 미사용) |

---

## 2. 백엔드 레이어 구조

**설명**: Express 백엔드의 4계층 구조와 Bounded Context 분리를 표현합니다.

```mermaid
flowchart TD
    Client["Client<br/>(HTTP 요청)"]
    
    subgraph RouterLayer["🔀 Router 계층<br/>경로·메서드 정의"]
        AuthRouter["auth.route.ts<br/>POST /api/auth/*"]
        UserRouter["users.route.ts<br/>GET|PATCH|DELETE /api/users/me"]
        TodoRouter["todos.route.ts<br/>GET|POST|PATCH|DELETE /api/todos/*"]
        CategoryRouter["categories.route.ts<br/>GET|POST|DELETE /api/categories/*"]
    end
    
    subgraph ControllerLayer["📨 Controller 계층<br/>요청·응답 변환"]
        AuthController["auth.controller.ts<br/>signup, login, logout, refresh"]
        UserController["user.controller.ts<br/>getMe, updateMe, deleteMe"]
        TodoController["todo.controller.ts<br/>getList, create, update, delete"]
        CategoryController["category.controller.ts<br/>getList, create, delete"]
    end
    
    subgraph ServiceLayer["⚡ Service 계층<br/>비즈니스 로직·검증"]
        subgraph IdentityContext["Identity Context<br/>(인증·사용자)"]
            AuthService["auth.service.ts<br/>JWT 발급, 토큰 검증"]
            UserService["user.service.ts<br/>개인정보 관리, 회원탈퇴"]
        end
        subgraph TodoContext["Todo Management Context<br/>(할일·카테고리)"]
            TodoService["todo.service.ts<br/>할일 CRUD, 필터 조회"]
            CategoryService["category.service.ts<br/>카테고리 관리, 트랜잭션"]
        end
    end
    
    subgraph RepositoryLayer["💾 Repository 계층<br/>DB 쿼리 실행"]
        UserRepo["user.repository.ts<br/>users 테이블"]
        TokenRepo["refreshToken.repository.ts<br/>refresh_tokens 테이블"]
        TodoRepo["todo.repository.ts<br/>todos 테이블"]
        CategoryRepo["category.repository.ts<br/>categories 테이블"]
    end
    
    Database["PostgreSQL 17<br/>(pg Pool)"]
    
    Client --> AuthRouter
    Client --> UserRouter
    Client --> TodoRouter
    Client --> CategoryRouter
    
    AuthRouter --> AuthController
    UserRouter --> UserController
    TodoRouter --> TodoController
    CategoryRouter --> CategoryController
    
    AuthController --> AuthService
    UserController --> UserService
    TodoController --> TodoService
    CategoryController --> CategoryService
    
    AuthService --> UserRepo
    AuthService --> TokenRepo
    UserService --> UserRepo
    UserService --> TokenRepo
    TodoService --> TodoRepo
    TodoService --> CategoryRepo
    CategoryService --> CategoryRepo
    CategoryService --> TodoRepo
    
    UserRepo --> Database
    TokenRepo --> Database
    TodoRepo --> Database
    CategoryRepo --> Database
    
    style RouterLayer fill:#e3f2fd,stroke:#0d47a1,stroke-width:2px
    style ControllerLayer fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    style ServiceLayer fill:#e8f5e9,stroke:#1b5e20,stroke-width:2px
    style IdentityContext fill:#fff9c4,stroke:#f57f17,stroke-width:1px
    style TodoContext fill:#ffccbc,stroke:#bf360c,stroke-width:1px
    style RepositoryLayer fill:#fce4ec,stroke:#880e4f,stroke-width:2px
    style Database fill:#fff3e0,stroke:#e65100,stroke-width:2px
```

### 레이어별 책임 및 통신

| 계층 | 책임 | 핵심 규칙 |
|------|------|---------|
| **Router** | HTTP 메서드·경로 정의, 미들웨어 체인 | 인증 미들웨어, Rate Limiting, 스키마 검증 |
| **Controller** | HTTP 요청 파싱, Service 호출, 응답 직렬화 | `req`, `res`, `next` 객체만 다룸 |
| **Service** | 비즈니스 로직, 도메인 규칙 검증, 트랜잭션 관리 | BR-01~BR-08 구현, 원자성 보장 |
| **Repository** | DB 쿼리 작성 및 실행, 결과 매핑 | `pg` 라이브러리 직접 사용, ORM 미사용; Pool 설정: `max: 20~30`, `idleTimeoutMillis: 30000` |

### Bounded Context 경계

- **Identity Context**: 회원가입, 로그인, 토큰 관리, 개인정보 수정, 회원탈퇴
- **Todo Management Context**: 할일 CRUD, 카테고리 관리, 필터 조회
- 두 컨텍스트는 JWT 인증 미들웨어를 경계로 연결 (userId만 신뢰)

---

## 3. 인증 흐름 (JWT)

**설명**: JWT 기반 인증의 3가지 주요 시나리오: 로그인, 인증 요청, 토큰 재발급.

```mermaid
sequenceDiagram
    participant Client as Client<br/>(Browser)
    participant API as API Server<br/>(Express)
    participant DB as Database<br/>(PostgreSQL)
    
    Note over Client,DB: 시나리오 1: 로그인 (POST /api/auth/login)
    
    Client->>API: POST /api/auth/login<br/>{email, password}
    API->>DB: 이메일으로 User 조회
    DB-->>API: User(password_hash 포함)
    
    alt 비밀번호 검증 성공
        API->>API: Access Token 생성<br/>(15분 유효)
        API->>API: Refresh Token 생성<br/>(7일 유효)
        API->>API: Refresh Token SHA-256 해싱
        API->>DB: refresh_tokens 테이블 저장<br/>(user_id, token_hash)
        DB-->>API: 저장 완료
        API-->>Client: 200 OK<br/>Access Token (메모리)<br/>+ Refresh Token<br/>(HttpOnly Cookie)
    else 비밀번호 검증 실패
        API-->>Client: 401 Unauthorized<br/>{error: "INVALID_CREDENTIALS"}
    end
    
    Note over Client,DB: 시나리오 2: 인증 요청 (GET /api/todos)
    
    Client->>API: GET /api/todos<br/>Authorization: Bearer {accessToken}
    API->>API: Access Token 검증<br/>(서명, 만료 시간)
    alt Token 유효
        API->>DB: userId 기반 할일 목록 조회
        DB-->>API: Todo[]
        API-->>Client: 200 OK<br/>{data: [...]}
    else Token 만료 or 무효
        API-->>Client: 401 Unauthorized<br/>{error: "TOKEN_EXPIRED"}
    end
    
    Note over Client,DB: 시나리오 3: 토큰 재발급 (POST /api/auth/refresh)
    
    Client->>API: POST /api/auth/refresh<br/>(Refresh Token은 Cookie로 자동 전송)
    API->>API: Refresh Token 추출 (Cookie)
    API->>API: Refresh Token SHA-256 해싱
    API->>DB: refresh_tokens 테이블 조회<br/>(user_id, token_hash 일치 검증)
    
    alt Token 유효 & 만료 안됨
        DB-->>API: RefreshToken 레코드
        API->>DB: 기존 Refresh Token 삭제<br/>(재발급하므로 즉시 폐기)
        API->>API: 새 Access Token 생성<br/>(15분 유효)
        API->>API: 새 Refresh Token 생성<br/>(7일 유효, Token Rotation)
        API->>API: 새 Refresh Token SHA-256 해싱
        API->>DB: 새 Refresh Token 저장<br/>refresh_tokens 테이블
        DB-->>API: 저장 완료
        API-->>Client: 200 OK<br/>새 Access Token (메모리)<br/>+ 새 Refresh Token (HttpOnly Cookie)
    else Token 만료 or 레코드 없음
        DB-->>API: 조회 실패
        API->>DB: 해당 사용자의 모든 Refresh Token 삭제<br/>(재사용 공격 방지)
        API-->>Client: 401 Unauthorized<br/>{error: "REFRESH_TOKEN_EXPIRED"}<br/>→ 재로그인 필요
    end
```

### 인증 정책 요약

| 항목 | 정책 | 비고 |
|------|------|------|
| **Access Token** | 15분 유효, 메모리 저장 | XSS 공격 방어 (localStorage 미사용) |
| **Refresh Token** | 7일 유효, HttpOnly Cookie | CSRF/XSS 방어, JavaScript 접근 불가 |
| **Token Rotation** | 재발급 시 기존 토큰 즉시 삭제 | 토큰 재사용 공격(token reuse) 방지 |
| **만료 감지** | 만료된 토큰 재발급 시 사용자 모든 토큰 폐기 | 계정 탈취 감지 시 빠른 대응 |
| **서명 검증** | JWT 서명 검증 필수 (HS256) | 토큰 위변조 방지 |

---

## 변경 이력

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|---------|
| 0.1.0-draft | 2026-05-13 | MinYoung | 최초 작성 (Mermaid 3개 다이어그램: 전체 시스템, 백엔드 레이어, JWT 인증 흐름) |
