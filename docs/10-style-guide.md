# TodoListApp 프론트엔드 스타일 가이드

> 버전: 1.0.0 | 작성일: 2026-05-14
> 참조: Naver Calendar 디자인 시스템 · docs/8-wireframe.md · docs/2-prd.md

---

## 목차

1. [디자인 철학](#1-디자인-철학)
2. [컬러 시스템](#2-컬러-시스템)
3. [타이포그래피](#3-타이포그래피)
4. [간격 및 레이아웃](#4-간격-및-레이아웃)
5. [컴포넌트](#5-컴포넌트)
6. [아이콘](#6-아이콘)
7. [애니메이션 및 트랜지션](#7-애니메이션-및-트랜지션)
8. [반응형 브레이크포인트](#8-반응형-브레이크포인트)
9. [접근성](#9-접근성)
10. [Tailwind CSS 설정](#10-tailwind-css-설정)

---

## 1. 디자인 철학

Naver Calendar의 디자인을 참조하여 아래 원칙을 따른다.

- **명료함**: 정보 계층이 즉시 인식되어야 한다. 불필요한 장식 요소는 배제한다.
- **집중**: 할일이라는 단일 목적에 집중. 흰 배경과 넓은 여백으로 콘텐츠가 돋보이게 한다.
- **즉각적 피드백**: 모든 상호작용(클릭, 입력, 완료 토글)은 0.15s 이내에 시각적으로 반응한다.
- **접근성**: WCAG 2.1 AA 기준 준수. 최소 대비율 4.5:1 이상.

---

## 2. 컬러 시스템

### 2.1 브랜드 컬러

Naver Calendar의 보라-녹색 계열을 참조하여 TodoListApp은 **보라(Violet)** 를 주 브랜드 컬러로, **녹색(Emerald)** 을 보조 강조 컬러로 사용한다.

```css
/* Tailwind CSS 커스텀 컬러 */
--color-primary-50:  #f5f3ff;  /* 배경, hover 상태 */
--color-primary-100: #ede9fe;
--color-primary-200: #ddd6fe;
--color-primary-500: #8b5cf6;  /* 주 버튼, 강조 텍스트 */
--color-primary-600: #7c3aed;  /* 버튼 hover */
--color-primary-700: #6d28d9;  /* 버튼 active */

--color-accent-50:  #ecfdf5;   /* 완료 상태 배경 */
--color-accent-500: #10b981;   /* 완료 체크박스, 성공 뱃지 */
--color-accent-600: #059669;   /* hover */
```

### 2.2 시맨틱 컬러

| 역할 | 토큰 | Tailwind | Hex | 사용 예 |
|------|------|----------|-----|---------|
| **Primary** | `primary` | `violet-600` | `#7c3aed` | 주 버튼, 활성 탭, 링크 |
| **Success** | `success` | `emerald-500` | `#10b981` | 완료 체크, 성공 Toast |
| **Warning** | `warning` | `amber-400` | `#fbbf24` | 기간 만료(Overdue) 뱃지 |
| **Danger** | `danger` | `red-500` | `#ef4444` | 삭제 버튼, 에러 인라인 메시지 |
| **Info** | `info` | `blue-500` | `#3b82f6` | 정보 Toast, 포커스 링 |
| **Neutral-900** | `text-primary` | `gray-900` | `#111827` | 제목, 주요 텍스트 |
| **Neutral-600** | `text-secondary` | `gray-600` | `#4b5563` | 본문, 보조 텍스트 |
| **Neutral-400** | `text-disabled` | `gray-400` | `#9ca3af` | placeholder, 비활성 |
| **Neutral-200** | `border` | `gray-200` | `#e5e7eb` | 기본 테두리 |
| **Neutral-50** | `bg-subtle` | `gray-50` | `#f9fafb` | 사이드바, 카드 배경 |

### 2.3 할일 상태 컬러

| 상태 | 배경 | 텍스트 | 테두리 |
|------|------|--------|--------|
| 미완료 (기본) | `white` | `gray-900` | `gray-200` |
| 완료 | `gray-50` | `gray-400` + ~~취소선~~ | `gray-200` |
| Overdue (기간 만료) | `amber-50` | `amber-700` | `amber-200` |
| 오늘 마감 | `violet-50` | `violet-700` | `violet-200` |

### 2.4 카테고리 뱃지 컬러 팔레트

카테고리는 생성 순서에 따라 아래 8가지 컬러를 순환 적용한다.

```
violet  →  #8b5cf6 (bg: #f5f3ff)
emerald →  #10b981 (bg: #ecfdf5)
sky     →  #0ea5e9 (bg: #f0f9ff)
orange  →  #f97316 (bg: #fff7ed)
pink    →  #ec4899 (bg: #fdf2f8)
teal    →  #14b8a6 (bg: #f0fdfa)
amber   →  #f59e0b (bg: #fffbeb)
indigo  →  #6366f1 (bg: #eef2ff)
```

---

## 3. 타이포그래피

### 3.1 폰트 패밀리

```css
font-family: 'Pretendard', -apple-system, BlinkMacSystemFont,
             'Segoe UI', sans-serif;
```

> Naver Calendar와 동일한 계열의 한국어 최적화 폰트. Pretendard 미로드 시 시스템 폰트로 폴백.

### 3.2 타입 스케일

| 토큰 | 크기 | 행간 | 자간 | Tailwind | 사용 예 |
|------|------|------|------|----------|---------|
| `display` | 24px | 1.4 | -0.5px | `text-2xl font-bold tracking-tight` | 페이지 제목 |
| `heading-1` | 20px | 1.4 | -0.3px | `text-xl font-semibold tracking-tight` | 섹션 제목 |
| `heading-2` | 16px | 1.5 | 0 | `text-base font-semibold` | 카드 제목, 모달 제목 |
| `body-1` | 15px | 1.6 | 0 | `text-[15px] font-normal` | 할일 제목 |
| `body-2` | 14px | 1.5 | 0 | `text-sm font-normal` | 본문, 설명 |
| `caption` | 12px | 1.4 | 0 | `text-xs font-normal` | 날짜, 보조 정보, 에러 메시지 |
| `label` | 13px | 1 | 0.1px | `text-[13px] font-medium tracking-wide` | 폼 레이블, 뱃지 |

### 3.3 폰트 굵기

| 토큰 | 값 | Tailwind | 사용 예 |
|------|-----|----------|---------|
| Regular | 400 | `font-normal` | 본문, 입력값 |
| Medium | 500 | `font-medium` | 레이블, 뱃지 텍스트 |
| Semibold | 600 | `font-semibold` | 섹션 제목, 버튼 |
| Bold | 700 | `font-bold` | 페이지 제목, 로고 |

---

## 4. 간격 및 레이아웃

### 4.1 간격 단위 (4px 기반)

```
4px   → gap-1  : 아이콘 내부 패딩
8px   → gap-2  : 인라인 요소 간격, 뱃지 내부 패딩
12px  → gap-3  : 폼 요소 간격, 버튼 내부 패딩 (세로)
16px  → gap-4  : 카드 내부 패딩, 섹션 내 간격
20px  → gap-5  : 할일 아이템 간격
24px  → gap-6  : 섹션 간격
32px  → gap-8  : 페이지 내 영역 구분
```

### 4.2 레이아웃 구조

```
[Desktop 1280px+]
+----------------------------------------------------------+
|  Header (height: 56px, sticky, border-b: gray-200)       |
+----------------------------------------------------------+
|  Sidebar (240px, fixed)  |  Main Content (flex-1)        |
|                          |  max-width: 800px, mx-auto    |
|  - 카테고리 목록         |  padding: 24px                |
|  - 빠른 필터             |                               |
|                          |                               |
+----------------------------------------------------------+

[Tablet 768px]
+------------------------------------------+
|  Header (height: 56px)                   |
+------------------------------------------+
|  Main Content (full-width, padding: 20px)|
|  카테고리는 드로어로 이동                 |
+------------------------------------------+

[Mobile 360px]
+------------------------------------------+
|  Header (height: 56px)                   |
+------------------------------------------+
|  Main Content (padding: 16px)            |
+------------------------------------------+
|  Bottom Tab Navigation (height: 56px)    |
+------------------------------------------+
```

### 4.3 컨테이너

| 브레이크포인트 | max-width | 패딩 |
|-------------|-----------|------|
| Mobile | 100% | `px-4` (16px) |
| Tablet | 100% | `px-5` (20px) |
| Desktop | `800px` | `px-6` (24px) |

---

## 5. 컴포넌트

### 5.1 Button

#### variant별 스타일

```
[primary]
┌─────────────────────┐
│  + 새 할일 등록      │   bg: violet-600, text: white, rounded-lg
└─────────────────────┘
  hover: violet-700 | active: violet-800 | focus: ring-2 ring-violet-300
  disabled: bg-gray-200 text-gray-400 cursor-not-allowed

[secondary]
┌─────────────────────┐
│    카테고리 추가     │   bg: white, text: gray-700, border: gray-200
└─────────────────────┘
  hover: bg-gray-50 | active: bg-gray-100

[danger]
┌─────────────────────┐
│      삭제            │   bg: white, text: red-500, border: red-200
└─────────────────────┘
  hover: bg-red-50 border-red-300 | active: bg-red-100

[ghost]
 카테고리 관리 →          bg: transparent, text: gray-500, no border
  hover: text-gray-700 bg-gray-100 rounded
```

#### 사이즈

| 크기 | 높이 | 패딩 | 폰트 | Tailwind |
|------|------|------|------|----------|
| `sm` | 32px | `px-3 py-1.5` | 13px medium | `h-8 text-[13px] font-medium` |
| `md` | 40px | `px-4 py-2.5` | 14px semibold | `h-10 text-sm font-semibold` |
| `lg` | 48px | `px-6 py-3` | 15px semibold | `h-12 text-[15px] font-semibold` |

#### 로딩 상태

버튼 내부 텍스트 앞에 Spinner를 인라인 배치. 버튼 너비 유지 (min-w 설정).

```
[로딩 중]
┌──────────────────────────────┐
│  ⟳  저장 중...               │   opacity-70, cursor-not-allowed
└──────────────────────────────┘
```

---

### 5.2 Input

#### 기본 구조

```
[Label]
[Input Field]
[Error Message]  ← 에러 시만 표시

기본:   border: gray-200, bg: white, rounded-lg
포커스: border: violet-500, ring: 2px violet-100
에러:   border: red-400, ring: 2px red-100
성공:   border: emerald-400
비활성: bg: gray-50, text: gray-400, cursor: not-allowed
```

#### 폼 레이블

```css
font-size: 13px;      /* text-[13px] */
font-weight: 500;     /* font-medium */
color: #374151;       /* text-gray-700 */
margin-bottom: 6px;
```

필수 항목은 레이블 우측에 `*` 표시 (color: red-500).

#### 에러 메시지

```css
font-size: 12px;      /* text-xs */
color: #ef4444;       /* text-red-500 */
margin-top: 4px;
display: flex;
align-items: center;
gap: 4px;             /* 에러 아이콘 + 텍스트 */
```

---

### 5.3 Checkbox (할일 완료 토글)

Naver Calendar 카테고리 체크박스 스타일 참조.

```
[미완료]  ○  → border: gray-300, bg: white, 18×18px, rounded-full
[완료]    ●  → bg: emerald-500, border: emerald-500, 체크 아이콘(white)
[hover]       → border: violet-400, 약한 그림자
```

완료 처리 시 할일 텍스트에 취소선(`line-through`) + `text-gray-400` 적용.

```
[ ○ ] 디자인 시안 v1 제출          ← 미완료
[ ● ] ~~개발 환경 세팅 완료~~      ← 완료 (취소선 + 회색)
```

---

### 5.4 Badge

```
[default]   bg: gray-100,   text: gray-600   → 카테고리 기본
[success]   bg: emerald-50, text: emerald-700 → 완료
[warning]   bg: amber-50,   text: amber-700   → Overdue(기간 만료)
[danger]    bg: red-50,     text: red-600     → 오늘 마감
[primary]   bg: violet-50,  text: violet-700  → 카테고리(커스텀 시 팔레트 컬러)
```

```
크기: height 22px, padding: px-2, border-radius: rounded-full
폰트: 12px / font-medium / tracking-wide
```

---

### 5.5 Modal

Naver Calendar 확인 다이얼로그 스타일 참조.

```
[오버레이]
bg: black/50, backdrop-blur-sm

[다이얼로그 패널]
bg: white
border-radius: rounded-xl (12px)
padding: 24px
max-width: 440px (sm: 90vw)
box-shadow: 0 20px 60px rgba(0,0,0,0.15)

[구조]
┌─────────────────────────────────────┐
│  [아이콘]  제목                 [×] │  ← header: pb-4 border-b
│ ─────────────────────────────────── │
│  설명 텍스트                        │  ← body: py-4 text-gray-600 text-sm
│ ─────────────────────────────────── │
│           [취소]    [확인 / 삭제]   │  ← footer: pt-4 border-t, 우측 정렬
└─────────────────────────────────────┘
```

- 위험 작업(삭제, 탈퇴): 확인 버튼에 `danger` variant 적용
- ESC 닫기, 오버레이 클릭 닫기 지원
- 열릴 때 확인 버튼으로 포커스 이동 (포커스 트랩)

---

### 5.6 Spinner

```
크기
  sm: 16×16px  → 버튼 내부 인라인
  md: 24×24px  → 카드 로딩
  lg: 40×40px  → 페이지 전체 로딩

색상: primary 컬러 기본, 버튼 내부는 white
애니메이션: rotate 0.8s linear infinite
```

---

### 5.7 Toast

Naver Calendar 상단 알림 스타일 참조.

```
위치: 화면 우측 상단 (top: 16px, right: 16px)
스택: 여러 개일 때 세로 8px 간격으로 쌓임

[구조]
┌─────────────────────────────────────┐
│  [아이콘]  메시지 텍스트        [×] │
└─────────────────────────────────────┘

크기: max-width 360px, padding: px-4 py-3, rounded-lg
폰트: 14px / font-medium
그림자: shadow-lg
자동 소멸: 3000ms

[variant별 스타일]
success: bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800
error:   bg-red-50     border-l-4 border-red-500     text-red-800
warning: bg-amber-50   border-l-4 border-amber-400   text-amber-800
info:    bg-violet-50  border-l-4 border-violet-500  text-violet-800
```

---

### 5.8 할일 카드 (TodoItem)

```
[기본 상태]
┌─────────────────────────────────────────────────┐
│ [○]  디자인 시안 v1 제출              [업무]    │
│      2026-05-14 까지      ✏️  🗑️               │
└─────────────────────────────────────────────────┘
bg: white, border: gray-200 (border-b), padding: py-4 px-4

[hover]
bg: gray-50, 수정/삭제 버튼 표시 (기본: hidden, hover: visible)

[완료]
bg: gray-50, 텍스트 취소선, 색상 gray-400

[Overdue]
due_date 텍스트 → amber-600, 뱃지 표시
```

**레이아웃**:

```
[체크박스 18px] [제목 flex-1] [카테고리 뱃지]
               [날짜 텍스트 12px] [액션 버튼들 (hover시)]
```

---

### 5.9 사이드바 / 카테고리 목록

Naver Calendar 좌측 패널 스타일 참조.

```
사이드바: width 240px, bg: gray-50, border-r: gray-200

[카테고리 아이템]
┌────────────────────────────┐
│  [■] 업무          (3)     │  ← 체크박스(카테고리 컬러), 이름, 할일 수
└────────────────────────────┘
height: 36px, padding: px-3, rounded-lg
hover: bg-white shadow-sm
active(선택됨): bg-violet-50 text-violet-700 font-medium
```

---

### 5.10 Navigation (Header)

```
[Desktop Header]
┌──────────────────────────────────────────────────────────┐
│  [●] TodoApp   [할일목록]  [카테고리]    [👤 홍길동 ▼]  │
└──────────────────────────────────────────────────────────┘
height: 56px, bg: white, border-b: gray-200, sticky top-0, z-50
로고: violet-600 (●), font-bold 18px

[활성 탭 스타일]
하단에 2px violet-600 언더라인 + text-violet-700

[Mobile Bottom Tab]
┌──────────────────────────────────────────────────────────┐
│  📋 할일목록    📂 카테고리    👤 내정보                 │
└──────────────────────────────────────────────────────────┘
height: 56px, bg: white, border-t: gray-200, safe-area 패딩
활성: 아이콘 + 텍스트 violet-600, 비활성: gray-400
```

---

## 6. 아이콘

**라이브러리**: `lucide-react` 사용.

| 아이콘 | 컴포넌트 | 사용 위치 |
|--------|---------|----------|
| `Plus` | 추가 버튼 | 할일 등록, 카테고리 생성 |
| `Check` | 완료 체크 | 완료된 할일 체크박스 |
| `Trash2` | 삭제 | 할일/카테고리 삭제 버튼 |
| `Pencil` | 수정 | 할일 수정 버튼 |
| `ChevronDown` | 드롭다운 | 사용자 메뉴, 카테고리 선택 |
| `X` | 닫기 | 모달, Toast 닫기 |
| `LogOut` | 로그아웃 | 헤더 로그아웃 |
| `Filter` | 필터 | 할일 필터 토글 |
| `Calendar` | 날짜 | 날짜 입력 필드 |
| `AlertCircle` | 에러 | 에러 메시지 아이콘 |
| `CheckCircle2` | 성공 | 성공 Toast |
| `Clock` | Overdue | 기간 만료 표시 |
| `Tag` | 카테고리 | 카테고리 뱃지 |
| `User` | 사용자 | 내 정보 메뉴 |

**기본 크기**: `size={16}` (인라인), `size={20}` (독립 버튼 아이콘)

---

## 7. 애니메이션 및 트랜지션

### 7.1 기본 원칙

- 의미 없는 애니메이션 금지. 상태 변화에만 적용한다.
- `prefers-reduced-motion: reduce` 미디어 쿼리 적용 필수.

### 7.2 트랜지션 토큰

| 토큰 | 값 | 적용 대상 |
|------|-----|----------|
| `fast` | `150ms ease` | 버튼 hover, 체크박스 |
| `normal` | `200ms ease` | 카드 hover, 뱃지 |
| `slow` | `300ms ease-in-out` | 모달 오픈/클로즈, 드로어 |

```css
/* 기본 트랜지션 클래스 */
.transition-fast   { transition: all 150ms ease; }
.transition-normal { transition: all 200ms ease; }
.transition-slow   { transition: all 300ms ease-in-out; }
```

### 7.3 모달 등장

```
오버레이: opacity 0 → 1 (200ms)
패널: scale(0.95) opacity(0) → scale(1) opacity(1) (200ms ease-out)
닫기: 역방향 (150ms ease-in)
```

### 7.4 Toast 등장

```
등장: translateX(100%) → translateX(0) (250ms ease-out)
소멸: opacity(1) → opacity(0) (200ms ease-in, 자동 소멸 200ms 전 시작)
```

### 7.5 완료 토글 Optimistic Update

```
체크박스: scale(1) → scale(0.85) → scale(1) (150ms, bounce)
텍스트: color + line-through (200ms transition)
```

---

## 8. 반응형 브레이크포인트

| 이름 | 최소 너비 | Tailwind prefix | 레이아웃 변화 |
|------|----------|----------------|-------------|
| Mobile | 360px (기본) | — | 단일 컬럼, 하단 탭 |
| Tablet | 768px | `md:` | 상단 네비, 사이드 드로어 |
| Desktop | 1280px | `xl:` | 고정 사이드바 (240px) |

### 터치 타겟 최소 크기

모바일에서 모든 인터랙티브 요소의 최소 터치 타겟: **44×44px**

버튼 자체가 44px 미만일 경우 투명 padding으로 터치 영역 확장:
```css
.touch-target {
  min-height: 44px;
  min-width: 44px;
}
```

---

## 9. 접근성

### 9.1 포커스 스타일

기본 outline 제거 후 커스텀 focus ring 적용.

```css
/* 키보드 포커스만 표시 (마우스 클릭 시 미표시) */
:focus-visible {
  outline: 2px solid #8b5cf6; /* violet-500 */
  outline-offset: 2px;
}
```

Tailwind: `focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2`

### 9.2 ARIA 속성

| 컴포넌트 | 필수 ARIA |
|---------|----------|
| 완료 체크박스 | `role="checkbox"`, `aria-checked`, `aria-label="할일 완료 토글"` |
| 모달 | `role="dialog"`, `aria-modal="true"`, `aria-labelledby` |
| 로딩 Spinner | `role="status"`, `aria-label="로딩 중"` |
| 에러 메시지 | `aria-live="polite"`, `aria-describedby` (input과 연결) |
| 삭제 버튼 | `aria-label="[할일명] 삭제"` |
| Toast | `aria-live="assertive"` (error), `aria-live="polite"` (나머지) |

### 9.3 색상 대비율

| 조합 | 대비율 | 통과 여부 |
|------|--------|----------|
| violet-600 on white | 5.74:1 | AA ✓ |
| gray-900 on white | 16.1:1 | AAA ✓ |
| gray-600 on white | 5.9:1 | AA ✓ |
| amber-700 on amber-50 | 4.9:1 | AA ✓ |
| white on violet-600 | 5.74:1 | AA ✓ |

---

## 10. Tailwind CSS 설정

### 10.1 tailwind.config.js

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Pretendard', '-apple-system', 'BlinkMacSystemFont',
               'Segoe UI', 'sans-serif'],
      },
      colors: {
        primary: {
          50:  '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
        },
      },
      maxWidth: {
        content: '800px',
      },
      screens: {
        sm: '360px',
        md: '768px',
        xl: '1280px',
      },
    },
  },
  plugins: [],
};
```

### 10.2 글로벌 CSS (index.css)

```css
@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  * { box-sizing: border-box; }

  html {
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  body {
    @apply text-gray-900 bg-white text-[15px] leading-relaxed;
  }

  /* 키보드 포커스 링 */
  :focus-visible {
    @apply outline-none ring-2 ring-violet-500 ring-offset-2;
  }

  /* 모션 감소 설정 */
  @media (prefers-reduced-motion: reduce) {
    * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
  }
}

@layer components {
  .btn-primary {
    @apply inline-flex items-center justify-center gap-2
           h-10 px-4 rounded-lg text-sm font-semibold text-white
           bg-violet-600 hover:bg-violet-700 active:bg-violet-800
           transition-colors duration-150
           disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed;
  }

  .btn-secondary {
    @apply inline-flex items-center justify-center gap-2
           h-10 px-4 rounded-lg text-sm font-semibold text-gray-700
           bg-white border border-gray-200 hover:bg-gray-50 active:bg-gray-100
           transition-colors duration-150;
  }

  .btn-danger {
    @apply inline-flex items-center justify-center gap-2
           h-10 px-4 rounded-lg text-sm font-semibold text-red-500
           bg-white border border-red-200 hover:bg-red-50 hover:border-red-300
           transition-colors duration-150;
  }

  .input-field {
    @apply w-full h-10 px-3 rounded-lg text-sm text-gray-900
           bg-white border border-gray-200
           placeholder:text-gray-400
           focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:border-violet-500
           transition-colors duration-150;
  }

  .input-error {
    @apply border-red-400 focus-visible:ring-red-200 focus-visible:border-red-400;
  }
}
```

---

## 변경 이력

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|---------|
| 1.0.0 | 2026-05-14 | MinYoung | 최초 작성 — Naver Calendar 디자인 시스템 참조, TodoListApp 컴포넌트 정의 |
