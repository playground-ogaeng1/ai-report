# UI 디자인 가이드

> 이 문서는 **하네스 가드레일**이다 (`/harness` 가 매 step 프롬프트에 주입한다).
> 아래 값은 `apps/web` 에 **실제로 쓰이고 있는 것**이다. 새 화면은 여기서 고르고, 없는 값을 만들지 않는다.

## 디자인 원칙

1. **도구처럼 보여야 한다.** 마케팅 랜딩이 아니라 매일 쓰는 작업 화면이다
2. **라이트·다크를 둘 다 지원한다.** OS 설정을 따른다 — 한쪽만 보고 색을 하드코딩하지 않는다
3. **색은 상태를 말할 때만 쓴다.** 기본은 무채색이고, 브랜드 색은 없다
4. **장식 요소를 추가하지 않는다.** 구분은 얇은 테두리와 간격으로 한다

## Tailwind v4 · 테마

설정 파일이 없다. `apps/web/src/app/globals.css` 에서 `@import "tailwindcss"` 와 `@theme inline` 으로 끝낸다.

```css
:root  { --background: #ffffff; --foreground: #171717; color-scheme: light; }
@media (prefers-color-scheme: dark) {
  :root { --background: #0a0a0a; --foreground: #ededed; color-scheme: dark; }
}
```

- **`color-scheme` 선언을 지우지 마라.** 브라우저가 그리는 네이티브 UI(select 드롭다운, 스크롤바,
  체크박스, 날짜 선택기)의 테마를 결정한다. 빠지면 다크 모드에서 **흰 배경에 흰 글자**가 된다
- `option` 의 배경색도 `globals.css` 에서 명시한다. 일부 브라우저가 select 의 computed background 를 쓴다
- 색은 `bg-background` / `text-foreground` 유틸로 접근한다. 두 변수 외의 전역 색 토큰은 없다

### 폰트

`layout.tsx` 가 Geist / Geist Mono 를 로드해 `--font-sans` · `--font-mono` 에 연결한다.
단 `body` 가 `font-family: Arial, Helvetica, sans-serif` 로 덮고 있어서 **기본 본문은 Arial** 이고,
`font-mono` 를 명시한 곳(관리자 표·로그·연결 상태)만 Geist Mono 로 그려진다.

## 색상

### 배경

| 용도 | 값 |
|------|------|
| 페이지·카드 | `bg-background` (라이트 `#ffffff` / 다크 `#0a0a0a`) |
| 호버 면 | `hover:bg-black/5 dark:hover:bg-white/10` |
| 비어 있는 막대 | `bg-black/10 dark:bg-white/15` |

**카드에 별도 배경색을 쓰지 않는다.** 카드는 테두리로만 구분한다.

### 테두리

| 용도 | 값 |
|------|------|
| 입력·버튼·카드 | `border-black/15 dark:border-white/20` |
| 표·탭바·플로팅 패널 | `border-black/10 dark:border-white/15` |
| 표 행 구분선 | `divide-black/5 dark:divide-white/10` |
| 빈 상태 | `border-dashed border-black/15 dark:border-white/20` |

### 텍스트

| 용도 | 값 |
|------|------|
| 주 텍스트 | 상속 (`text-foreground`) |
| 설명 | `text-black/60 dark:text-white/60` |
| 보조·캡션·힌트 | `text-black/50 dark:text-white/50` |
| 비활성 탭 | `text-black/50 hover:text-black/80 dark:text-white/50 dark:hover:text-white/80` |
| 에러 | `text-red-600 dark:text-red-400` |

### 시맨틱 색상

알림은 `border-{색}-500/40` + `bg-{색}-500/10`, 막대는 단색 `bg-{색}-500` 을 쓴다.

| 용도 | 색 |
|------|------|
| 정보 | `sky-500` |
| 성공 | `emerald-500` |
| 경고 | `amber-500` |
| 에러·위험 | `red-500` |

## 컴포넌트

순수 UI 는 `components/ui/` 에 있다. **새로 만들기 전에 거기 있는지 먼저 본다.**
`alert` · `button` · `empty-state` · `field` · `input` · `markdown` · `meter` · `page-header` ·
`retrying-indicator` · `status-list` · `tab-bar` · `table` · `bug-report-panel`

### 버튼 (`Button`)

```
공통:    rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed
primary: bg-foreground text-background hover:opacity-90 disabled:opacity-40
outline: border border-black/15 hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10
danger:  border border-red-500/40 text-red-600 hover:bg-red-500/10 dark:text-red-400
ghost:   hover:bg-black/5 dark:hover:bg-white/10
```

기본 variant 는 `outline` 이다. `loading` 을 주면 비활성화되고 "처리 중…" 으로 바뀌며 `aria-busy` 가 붙는다.

### 입력 (`Input` / `Textarea` / `Select`)

```
rounded-lg border border-black/15 px-3 py-2 text-sm outline-none transition
focus:border-black/40 disabled:opacity-50
dark:border-white/20 dark:focus:border-white/50
```

- 배경은 `bg-transparent`. **단 `Select` 만 `bg-background`** — 투명이면 드롭다운 목록이 흰 바탕으로 그려진다
- 포커스 링을 쓰지 않고 테두리 색으로 표시한다
- 라벨·힌트·에러는 직접 쓰지 않고 `Field` 로 감싼다

### 카드 · 빈 상태

```
카드:     rounded-lg border border-black/15 p-4~6  (dark:border-white/20)
빈 상태:  rounded-lg border border-dashed border-black/15 p-8 text-center
```

### 표 (`Table`)

가로로 넘치면 **표만** 스크롤되게 `overflow-x-auto` 로 감싼다 — 페이지 본문이 가로로 흔들리면 안 된다.
표 전체가 `text-xs` 이고 셀은 `px-3 py-2` 다.

## 레이아웃

```
기본 페이지:  mx-auto w-full max-w-2xl flex-1 px-6 py-16
관리자:       mx-auto w-full max-w-5xl flex-1 px-6 py-16
로그인:       mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-16
```

- 좌측 정렬이 기본이다. 로그인 화면만 수직 중앙 정렬한다
- 간격은 `gap-1.5`(라벨-입력) · `gap-3~4`(요소) · `space-y-6~8`(섹션)

## 타이포그래피

| 용도 | 스타일 |
|------|--------|
| 페이지 제목 | `text-3xl font-bold tracking-tight` |
| 설명 | `text-sm` + 설명 색 |
| 본문·버튼·입력 | `text-sm` |
| 캡션·힌트·표 | `text-xs` |
| 코드·ID·경로·로그 | `font-mono text-xs` |

제목 레벨을 늘리지 않는다. 페이지당 `h1` 하나다.

## 모서리

| 값 | 쓰는 곳 |
|------|------|
| `rounded-lg` | **기본값.** 버튼·입력·카드·표·빈 상태 |
| `rounded-full` | 사용량 막대, 원형 요소 |
| `rounded-2xl` | **예외 두 곳만** — 채팅 버블, 플로팅 버그 신고 패널 |

새 컴포넌트는 `rounded-lg` 를 쓴다. 모서리 값을 늘리지 않는다.

## 애니메이션

**허용되는 것은 두 개뿐이다.**

- `transition` — 색·투명도 변화 (Tailwind 기본 150ms). 버튼·입력·탭에 쓴다
- `animate-pulse` — 로딩 스켈레톤
- 사용량 막대만 `transition-[width]` 로 너비를 애니메이션한다

그 외 모든 애니메이션(진입 모션, 스크롤 연동, 호버 확대, 글로우)은 쓰지 않는다.

## 접근성

- 로딩 버튼에 `aria-busy`, 막대에 `role="meter"` + `aria-valuenow/min/max`
- 탭은 `role="tablist"` / `role="tab"` + `aria-selected`
- 폼 입력은 `Field` 의 `htmlFor` 로 라벨과 연결한다

## AI 슬롭 안티패턴 — 하지 마라

| 금지 사항 | 이유 |
|-----------|------|
| `backdrop-filter: blur()` (glass morphism) | AI 템플릿의 가장 흔한 징후 |
| 배경 그라데이션 텍스트 | AI 가 만든 SaaS 랜딩의 1번 특징 |
| 배경 gradient orb (`blur-3xl` 원형) | 모든 AI 랜딩 페이지에 있는 장식 |
| `box-shadow` 글로우 애니메이션 | 네온 글로우 = AI 슬롭 |
| 보라/인디고 브랜드 색상 | "AI = 보라색" 클리셰. 이 프로젝트에 브랜드 색은 없다 |
| "Powered by AI" 배지 | 기능이 아니라 장식 |
| 아이콘을 둥근 배경 박스로 감싸기 | 템플릿 느낌을 만든다 |
| 다크 모드 색만 하드코딩 | 라이트 모드가 읽을 수 없게 된다 — 항상 `dark:` 짝을 맞춘다 |
| `components/ui/` 안에서 데이터 페칭 | 순수 UI 여야 한다. 데이터는 상위에서 props 로 내린다 |
