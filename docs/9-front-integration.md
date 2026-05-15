# TodoListApp 프론트엔드 통합 가이드

> 버전: 1.0.0 | 작성일: 2026-05-14
> 참조: swagger/swagger.json · docs/4-project-principles.md · docs/2-prd.md

---

## 목차

1. [개요](#1-개요)
2. [인증 구조](#2-인증-구조)
3. [공통 응답 형식](#3-공통-응답-형식)
4. [에러 코드 처리](#4-에러-코드-처리)
5. [axios 클라이언트 및 자동 토큰 갱신](#5-axios-클라이언트-및-자동-토큰-갱신)
6. [API 엔드포인트 레퍼런스](#6-api-엔드포인트-레퍼런스)
7. [TypeScript 타입 정의](#7-typescript-타입-정의)
8. [필드 네이밍 규칙](#8-필드-네이밍-규칙)
9. [Overdue 판단 규칙](#9-overdue-판단-규칙)
10. [주요 주의사항 요약](#10-주요-주의사항-요약)

---

## 1. 개요

| 항목 | 값 |
|------|-----|
| 개발 서버 Base URL | `http://localhost:3000` |
| API 접두사 | `/api` |
| 인증 방식 | `Authorization: Bearer <accessToken>` |
| Content-Type | `application/json` |
| Swagger UI | `http://localhost:3000/api-docs` |

---

## 2. 인증 구조

### 2.1 토큰 발급

로그인(`POST /api/auth/login`) 성공 시 두 가지 토큰이 발급된다.

| 토큰 | 전달 방식 | 유효기간 | 저장 위치 |
|------|----------|---------|----------|
| Access Token | 응답 body (`data.accessToken`) | 15분 | **Zustand 메모리** (localStorage/sessionStorage 절대 금지) |
| Refresh Token | `Set-Cookie` — HttpOnly | 7일 | HttpOnly Cookie (JS 접근 불가, 브라우저 자동 관리) |

### 2.2 인증 요청 방법

Access Token이 필요한 모든 API 요청에 헤더를 추가한다.

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2.3 Token Rotation

`POST /api/auth/refresh` 호출 시:
- 기존 Refresh Token은 DB에서 즉시 삭제된다.
- 새로운 Access Token + Refresh Token이 함께 발급된다.
- 만료된 Refresh Token으로 재발급 시도 시 해당 사용자의 모든 Refresh Token이 일괄 폐기된다 → 재로그인 필요.

### 2.4 앱 초기화 (새로고침 시 인증 복구)

페이지 새로고침 시 Zustand 메모리의 Access Token이 사라진다. 앱 마운트 시 `GET /api/users/me`를 호출하여 인증 상태를 복구해야 한다.

```
흐름:
앱 마운트
  → GET /api/users/me (Refresh Token Cookie 자동 전송)
  → 200 OK: user 정보를 Zustand store에 저장, 정상 진입
  → 401: /login 으로 리다이렉트
```

> `GET /api/users/me`에 유효한 Access Token이 없으면 401이 반환된다.
> 이 경우 `POST /api/auth/refresh`로 토큰을 갱신한 뒤 재시도한다.

---

## 3. 공통 응답 형식

### 3.1 성공 응답

```json
{ "success": true, "data": { ... } }
```

- 단일 리소스: `data`가 객체
- 목록: `data`가 배열
- 삭제·로그아웃 등 반환 데이터 없음: `data`가 `null`

### 3.2 실패 응답

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "사람이 읽을 수 있는 에러 설명"
  }
}
```

`success` 필드로 성공/실패를 구분한다. `error.code`로 에러 종류를 식별하고, `error.message`를 UI에 표시한다.

---

## 4. 에러 코드 처리

| HTTP 상태 | error.code | 상황 | 프론트엔드 처리 |
|----------|-----------|------|--------------|
| 400 | `VALIDATION_ERROR` | 입력값 형식 오류 | 해당 필드 인라인 에러 표시 |
| 401 | `UNAUTHORIZED` | Access Token 없음 | 토큰 갱신 시도 → 실패 시 /login |
| 401 | `TOKEN_EXPIRED` | Access Token 만료 | 토큰 갱신 시도 → 실패 시 /login |
| 401 | `REFRESH_TOKEN_EXPIRED` | Refresh Token 만료 | Zustand store 초기화 → /login |
| 401 | `INVALID_CREDENTIALS` | 이메일/비밀번호 불일치 | "이메일 또는 비밀번호가 올바르지 않습니다" Toast |
| 403 | `FORBIDDEN` | 타인 리소스 접근 | 403 Toast 또는 목록으로 이동 |
| 403 | `DEFAULT_CATEGORY` | 기본 카테고리 삭제 시도 | "기본 카테고리는 삭제할 수 없습니다" Toast |
| 404 | `NOT_FOUND` | 리소스 없음 | 목록으로 이동 또는 Toast |
| 409 | `EMAIL_ALREADY_EXISTS` | 이메일 중복 | "이미 사용 중인 이메일입니다" Toast |
| 409 | `VALIDATION_ERROR` | 카테고리명 중복 | "이미 존재하는 카테고리명입니다" Toast |
| 422 | `VALIDATION_ERROR` | 비즈니스 규칙 위반 (날짜 등) | 해당 필드 인라인 에러 표시 |
| 429 | `RATE_LIMIT_EXCEEDED` | Rate Limit 초과 | "잠시 후 다시 시도해 주세요" Toast |
| 500 | `INTERNAL_SERVER_ERROR` | 서버 내부 오류 | "서버 오류가 발생했습니다" Toast |

---

## 5. axios 클라이언트 및 자동 토큰 갱신

### 5.1 기본 설정

```ts
// src/api/client.ts
import axios from 'axios';
import { useAuthStore } from '../stores/auth.store';

const apiClient = axios.create({
  baseURL: 'http://localhost:3000',
  withCredentials: true, // Refresh Token Cookie 자동 전송 필수
});
```

### 5.2 요청 인터셉터 — Access Token 자동 주입

```ts
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### 5.3 응답 인터셉터 — 401 자동 갱신

```ts
let isRefreshing = false;
let waitQueue: Array<(token: string) => void> = [];

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    if (error.response?.status !== 401 || original._retried) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      // 갱신 중인 경우 대기열에 추가
      return new Promise((resolve) => {
        waitQueue.push((newToken) => {
          original.headers.Authorization = `Bearer ${newToken}`;
          resolve(apiClient(original));
        });
      });
    }

    original._retried = true;
    isRefreshing = true;

    try {
      const { data } = await apiClient.post('/api/auth/refresh');
      const newToken = data.data.accessToken;
      useAuthStore.getState().setAccessToken(newToken);
      waitQueue.forEach((cb) => cb(newToken));
      waitQueue = [];
      original.headers.Authorization = `Bearer ${newToken}`;
      return apiClient(original);
    } catch {
      // Refresh Token도 만료 → 재로그인
      useAuthStore.getState().clearAuth();
      window.location.href = '/login';
      return Promise.reject(error);
    } finally {
      isRefreshing = false;
    }
  },
);
```

> 동시에 여러 요청이 401을 받아도 `isRefreshing` 플래그로 `/api/auth/refresh`가 1회만 호출된다.

---

## 6. API 엔드포인트 레퍼런스

### 6.1 인증 (Auth)

#### POST /api/auth/signup — 회원가입

```ts
// 요청
interface SignupRequest {
  email: string;    // 이메일 형식
  password: string; // 최소 8자
  name: string;
}

// 응답 data
interface User { ... } // §7.1 참조

// 에러
// 409 EMAIL_ALREADY_EXISTS: 이메일 중복
// 429 RATE_LIMIT_EXCEEDED: 분당 10회 초과
```

#### POST /api/auth/login — 로그인

```ts
// 요청
interface LoginRequest {
  email: string;
  password: string;
}

// 응답 data
interface LoginResponse {
  accessToken: string; // Zustand 메모리에 저장
  user: User;
}
// Set-Cookie: refreshToken=...; HttpOnly; Secure; SameSite=Strict
```

#### POST /api/auth/logout — 로그아웃 (인증 필요)

```ts
// 요청 body 없음
// 응답 data: null
// 처리: Zustand clearAuth() 호출, /login 이동
```

#### POST /api/auth/refresh — Access Token 재발급

```ts
// 요청 body 없음 (Refresh Token Cookie 자동 전송)
// 응답 data
interface RefreshResponse {
  accessToken: string;
}
// Set-Cookie: 새 refreshToken (Token Rotation)
```

---

### 6.2 사용자 (Users)

#### GET /api/users/me — 내 정보 조회 (인증 필요)

```ts
// 응답 data: User (§7.1)
// password_hash 필드 없음
```

#### PATCH /api/users/me — 내 정보 수정 (인증 필요)

```ts
// 요청 (모든 필드 선택)
interface UpdateUserRequest {
  name?: string;
  currentPassword?: string; // 비밀번호 변경 시 필수
  newPassword?: string;     // 최소 8자, 비밀번호 변경 시 필수
}

// 응답 data: User
// 에러
// 401 INVALID_CREDENTIALS: 현재 비밀번호 불일치
```

#### DELETE /api/users/me — 회원 탈퇴 (인증 필요)

```ts
// 요청
interface DeleteAccountRequest {
  password: string; // 본인 확인
}

// 응답 data: null
// 처리: 단일 트랜잭션으로 refresh_tokens → todos → categories → users 순서 삭제
//       성공 후 clearAuth() 호출, /login 이동
```

---

### 6.3 카테고리 (Categories)

#### GET /api/categories — 카테고리 목록 조회 (인증 필요)

```ts
// 응답 data: Category[]
// is_default=true인 시스템 기본 카테고리('일반' 등)가 항상 포함됨
```

#### POST /api/categories — 카테고리 생성 (인증 필요)

```ts
// 요청
interface CreateCategoryRequest {
  name: string; // 최대 100자, 동일 사용자 내 중복 불가
}

// 응답 data: Category (201)
// 에러
// 409 VALIDATION_ERROR: 카테고리명 중복
```

#### DELETE /api/categories/:id — 카테고리 삭제 (인증 필요)

```ts
// 경로 파라미터: id (UUID)
// 응답 data: null
// 주의: 소속 할일이 기본 카테고리로 자동 재배정됨 (BR-07)
//       삭제 성공 후 todoKeys.all도 invalidate 필요
// 에러
// 403 DEFAULT_CATEGORY: 기본 카테고리 삭제 불가 (BR-06)
// 403 FORBIDDEN: 타인 소유 카테고리
```

---

### 6.4 할일 (Todos)

#### GET /api/todos — 할일 목록 조회 (인증 필요)

```ts
// 쿼리 파라미터 (모두 선택)
interface TodoFilter {
  categoryId?: string;   // UUID, 카테고리 필터
  isCompleted?: boolean; // 완료 여부 필터
  overdue?: boolean;     // true: due_date < 오늘인 미완료 할일
}

// 예시: GET /api/todos?categoryId=<uuid>&isCompleted=false&overdue=true

// 응답 data: Todo[]
```

#### POST /api/todos — 할일 생성 (인증 필요)

```ts
// 요청
interface CreateTodoRequest {
  categoryId: string;    // UUID, 필수 (camelCase)
  title: string;         // 최대 255자, 필수
  description?: string;
  start_date?: string;   // 'YYYY-MM-DD' 형식 (snake_case)
  due_date?: string;     // 'YYYY-MM-DD' 형식, start_date 이상이어야 함 (BR-05)
}

// 응답 data: Todo (201)
```

> **주의**: 요청 body에서 `categoryId`는 camelCase, `start_date`/`due_date`는 snake_case를 사용한다.

#### GET /api/todos/:id — 할일 상세 조회 (인증 필요)

```ts
// 경로 파라미터: id (UUID)
// 응답 data: Todo
```

#### PATCH /api/todos/:id — 할일 수정 (인증 필요)

```ts
// 요청 (모든 필드 선택, Partial Update)
interface UpdateTodoRequest {
  categoryId?: string;   // camelCase
  title?: string;
  description?: string | null;
  start_date?: string | null; // snake_case
  due_date?: string | null;   // snake_case
  is_completed?: boolean;     // snake_case — 완료 토글에 사용
}

// 응답 data: Todo
// UC-06 완료 토글: { is_completed: true } 또는 { is_completed: false }만 전송
```

#### DELETE /api/todos/:id — 할일 삭제 (인증 필요)

```ts
// 경로 파라미터: id (UUID)
// 응답 data: null
```

---

## 7. TypeScript 타입 정의

### 7.1 공통 응답 래퍼

```ts
// src/types/api.types.ts
interface ApiResponse<T> {
  success: true;
  data: T;
}

interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
  };
}
```

### 7.2 User

```ts
// src/types/user.types.ts
interface User {
  id: string;
  email: string | null;
  name: string;
  auth_provider: 'local' | 'google' | 'facebook';
  created_at: string; // ISO 8601 UTC
  updated_at: string; // ISO 8601 UTC
}
```

### 7.3 Category

```ts
// src/types/category.types.ts
interface Category {
  id: string;
  user_id: string | null; // null이면 시스템 기본 카테고리
  name: string;
  is_default: boolean;    // true이면 삭제 버튼 disabled
  created_at: string;     // ISO 8601 UTC
}
```

### 7.4 Todo

```ts
// src/types/todo.types.ts
interface Todo {
  id: string;
  user_id: string;
  category_id: string;
  title: string;
  description: string | null;
  start_date: string | null;  // 'YYYY-MM-DD'
  due_date: string | null;    // 'YYYY-MM-DD'
  is_completed: boolean;
  created_at: string;         // ISO 8601 UTC
  updated_at: string;         // ISO 8601 UTC
}

interface TodoFilter {
  categoryId?: string;
  isCompleted?: boolean;
  overdue?: boolean;
}

interface CreateTodoRequest {
  categoryId: string;
  title: string;
  description?: string;
  start_date?: string;
  due_date?: string;
}

interface UpdateTodoRequest {
  categoryId?: string;
  title?: string;
  description?: string | null;
  start_date?: string | null;
  due_date?: string | null;
  is_completed?: boolean;
}
```

---

## 8. 필드 네이밍 규칙

API 응답과 요청 body의 필드 네이밍이 혼재되므로 반드시 아래 규칙을 따른다.

### 8.1 응답 body (서버 → 프론트엔드)

모든 응답 필드는 **snake_case**를 사용한다.

| 필드 | 예시 |
|------|------|
| `user_id` | `"550e8400-..."` |
| `category_id` | `"bbbbbbbb-..."` |
| `is_completed` | `false` |
| `is_default` | `true` |
| `start_date` | `"2026-05-13"` |
| `due_date` | `"2026-05-14"` |
| `auth_provider` | `"local"` |
| `created_at` | `"2026-05-13T10:00:00.000Z"` |
| `updated_at` | `"2026-05-13T10:00:00.000Z"` |

### 8.2 요청 body (프론트엔드 → 서버)

할일 관련 요청 body에서만 혼재가 발생한다.

| 필드 | 케이스 | 엔드포인트 |
|------|--------|-----------|
| `categoryId` | camelCase | POST /api/todos, PATCH /api/todos/:id |
| `start_date` | snake_case | POST /api/todos, PATCH /api/todos/:id |
| `due_date` | snake_case | POST /api/todos, PATCH /api/todos/:id |
| `is_completed` | snake_case | PATCH /api/todos/:id |
| `currentPassword` | camelCase | PATCH /api/users/me |
| `newPassword` | camelCase | PATCH /api/users/me |

### 8.3 쿼리 파라미터

쿼리 파라미터는 **camelCase**를 사용한다.

```
GET /api/todos?categoryId=<uuid>&isCompleted=false&overdue=true
```

---

## 9. Overdue 판단 규칙

`overdue` 관련 처리는 서버와 클라이언트 역할이 나뉜다.

| 역할 | 처리 기준 |
|------|----------|
| 서버 (`?overdue=true` 필터) | `due_date < CURRENT_DATE` (서버 UTC 기준) |
| 클라이언트 UI (뱃지 표시) | `dayjs(due_date).isBefore(dayjs(), 'day')` — **로컬 타임존 기준** |

클라이언트에서 Overdue 뱃지 표시 유틸 함수 예시:

```ts
// src/utils/dateUtils.ts
import dayjs from 'dayjs';

export function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false;
  return dayjs(dueDate).isBefore(dayjs(), 'day');
}
```

| 입력 | 결과 (오늘: 2026-05-14 기준) |
|------|--------------------------|
| `null` | `false` |
| `"2026-05-13"` (어제) | `true` |
| `"2026-05-14"` (오늘) | `false` (당일은 만료 아님) |
| `"2026-05-15"` (내일) | `false` |

---

## 10. 주요 주의사항 요약

1. **Access Token은 메모리에만 저장**: `localStorage`, `sessionStorage` 절대 사용 금지. Zustand store만 사용.

2. **axios `withCredentials: true` 필수**: Refresh Token Cookie 자동 전송을 위해 axios 인스턴스 생성 시 반드시 설정.

3. **카테고리 삭제 후 todo 쿼리 무효화**: 카테고리 삭제 시 소속 할일이 기본 카테고리로 재배정되므로, 삭제 성공 후 `categoryKeys.all`과 `todoKeys.all` 모두 `invalidateQueries` 필요.

4. **완료 토글 Optimistic Update**: `PATCH /api/todos/:id`로 완료 상태 변경 시 즉각적 UI 반응을 위해 Optimistic Update 적용 권장. 실패 시 이전 캐시로 롤백.

5. **할일 요청 body 필드 네이밍 혼재**: `categoryId`는 camelCase, `start_date` / `due_date` / `is_completed`는 snake_case. §8.2 참조.

6. **날짜 형식**: 날짜는 `"YYYY-MM-DD"` 문자열로 전송. ISO 8601 datetime(`created_at` 등)은 서버가 UTC로 반환.

7. **기본 카테고리 삭제 방지**: `is_default === true`인 카테고리의 삭제 버튼은 `disabled` 처리. 서버에서도 403으로 거부하지만 클라이언트에서 선제적으로 차단.

8. **Rate Limiting**: `POST /api/auth/login`과 `POST /api/auth/signup`은 IP당 분당 10회 제한. 429 응답 수신 시 Toast 표시 후 재시도 유도.

---

## 변경 이력

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|---------|
| 1.0.0 | 2026-05-14 | MinYoung | 최초 작성 — swagger.json v1.0.0 기반 |
