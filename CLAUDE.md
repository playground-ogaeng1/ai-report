# CLAUDE.md

AI 인터뷰어 & 자소서 멘토 — 취업 준비 보조 서비스.

**작업 목록은 [docs/TODO.md](./docs/TODO.md) 를 보세요.** 새 작업을 시작하거나 끝낼 때 그 파일의 체크박스를 갱신합니다.

## 프로젝트 구조

```
apps/web        Next.js 16  (App Router, Tailwind v4)   → http://localhost:3000
apps/api        NestJS 12   (ESM)                       → http://localhost:3001
packages/db     @ppp/db — Prisma 7 스키마 + 클라이언트
```

pnpm workspace 모노레포. 전체 세팅/트러블슈팅은 [SETUP.md](./SETUP.md), 명령어 표는 [README.md](./README.md).

## 명령어

| 명령어 | 설명 |
|---|---|
| `pnpm diagnose` | 환경 진단 (.env/DNS/DB/포트/health) — 막히면 이걸 먼저 |
| `pnpm dev` | web + api 동시 실행 |
| `pnpm db:migrate` | 스키마 변경 후 마이그레이션 생성/적용 |
| `pnpm lint` | 전체 lint (api: oxlint / web: eslint) |
| `pnpm typecheck` | 전체 타입체크 |
| `pnpm test` | 전체 테스트 |
| `pnpm build` | 전체 프로덕션 빌드 |

CI(`.github/workflows/ci.yml`)가 위 네 개(lint·typecheck·test·build)를 돌립니다.
**푸시 전에 로컬에서 같은 명령으로 확인하세요.**

## 규칙

### Prisma 7
- 스키마 변경 후 **반드시** `pnpm db:migrate` (개발) 또는 `pnpm db:generate` 실행
- 스키마 안에 `url` 을 쓸 수 없음 — 런타임은 adapter(`DATABASE_URL`), 마이그레이션은 `prisma.config.ts`(`DIRECT_URL`)
- 생성물은 `packages/db/src/generated/prisma` — 직접 수정하지 않음

### Claude API
- SDK는 `@anthropic-ai/sdk`, 모델은 `claude-opus-5`
- **API 키는 절대 `apps/web` 에 두지 않음.** 모든 Claude 호출은 `apps/api` 를 경유한다 (`ANTHROPIC_API_KEY` 는 api 전용 `.env`)
- 채팅/첨삭은 응답이 길어 streaming 사용
- **`temperature` / `top_p` / `top_k` 를 쓸 수 없다** — Opus 5 는 받으면 400.
  같은 입력에 다른 결과가 필요하면 **프롬프트 쪽에서** 변화를 만들어야 한다
  (예: `interview-prompt.ts` 의 `OPENING_ANGLES`)
- `max_tokens` 는 **사고 + 응답 합계**를 제한한다. 사고가 기본으로 켜져 있어서
  응답 길이만 보고 잡으면 답이 중간에 잘린다
- 매 턴 같은 내용을 다시 보내는 경우(면접의 문서 컨텍스트) 시스템 프롬프트에
  `cache_control` 을 걸어 입력 비용을 줄인다

### 관리자 · 운영 조회
- 관리자 판별은 **`ADMIN_EMAILS`**(api 전용 `.env`, 쉼표 구분). **비우면 아무도
  관리자가 아니다** — 실수로 전원 공개되는 쪽으로 열리지 않게 닫아둔다
- 이메일은 Supabase 가 검증한 **JWT 클레임**에서 온다. 클라이언트가 보낸 값이 아니다
- `AdminGuard` 는 403 이 아니라 **404** 를 던진다. 403 은 "그 엔드포인트가 있고
  너는 권한이 없다"를 알려주는 셈이라, 관리자 화면은 존재 자체를 숨긴다
- `/me` 의 `admin` 필드는 **메뉴를 숨기는 편의용**이다. 실제 차단은 api 가 한다
- 수집은 `monitoring/log-buffer.ts` 의 **메모리 링 버퍼**다. 재시작하면 사라지고
  인스턴스별로 따로 쌓인다 — 장기 보관이 필요해지면 외부 수집 도구로 보내야 한다
- **요청 본문과 헤더는 기록하지 않는다.** 본문엔 이력서·자소서 전문, 헤더엔
  액세스 토큰이 들어 있다. 쿼리스트링도 떼어낸다

### 요청 로그는 미들웨어로 (인터셉터 아님)
NestJS 실행 순서는 **미들웨어 → 가드 → 인터셉터 → 핸들러**다.

- **인터셉터로 기록하면 가드가 거절한 요청(401·404)이 전부 누락된다.**
  운영 조회에서 가장 보고 싶은 "거절된 호출" 이 안 보인다
- `RequestLogMiddleware` 는 가드보다 먼저 돌고 `res.on('finish')` 로 기록한다 —
  그 시점이면 **최종 상태 코드**와 **가드가 채운 `request.user`** 를 둘 다 읽을 수 있다
- `forRoutes` 경로는 **`'{*path}'`** 다. `'*path'` 는 세그먼트 1개 이상만 매칭해서
  **루트 `GET /` 가 기록되지 않는다** (Express 5 / path-to-regexp v8 문법)
- 예외 메시지는 `AllExceptionsFilter` 가 `request.loggedErrorMessage` 에 얹어
  전달한다. `finish` 시점에는 예외 객체를 볼 수 없다
- 이 배선은 **단위 테스트로 확인되지 않는다** — "Nest 가 미들웨어를 불러주는지" 는
  앱을 띄워봐야 안다. `test/request-log.e2e-spec.ts` 가 그 역할이고 CI 에서 돈다

### 레이트리밋 · 비용 가드
- `usage/` 모듈에 두 가지가 있다. **섞지 말 것** — 막는 대상이 다르다
  - `RateLimitGuard` — 짧은 시간에 몰아치는 요청. 메모리, **프로세스 단위**
  - `CostGuard` — 24시간 누적 토큰. DB 집계, 인스턴스 무관
- 두 가드는 **`SupabaseAuthGuard` 뒤에 와야 한다** (`request.user` 필요).
  클래스에 인증 가드를 두고 메서드에 `@UseGuards(RateLimitGuard, CostGuard)` 를
  붙이면 Nest 가 컨트롤러 → 라우트 순서로 실행한다
- `CostGuard` 는 **Claude 를 호출하는 엔드포인트에만** 붙인다. 업로드처럼
  토큰을 쓰지 않는 곳에는 레이트리밋만
- 레이트리밋이 메모리라서 **인스턴스를 늘리면 실효 한도가 곱해진다.**
  수평 확장 시 Redis 로 옮겨야 한다
- 한도를 바꿀 땐 `@RateLimit({max, windowSec})` 과 `DAILY_TOKEN_LIMIT` 를 본다

### 인증
- 인증은 **Supabase Auth** 가 담당한다. 구글 OAuth **단독**
- 계정 자체는 Supabase 가 관리하는 `auth.users` 에 있다. `public.users` 는 **프로필 테이블**이고 `id` 에 `auth.users.id`(UUID) 를 그대로 쓴다 — 첫 로그인 때 upsert
- `auth` 스키마에는 **DB 레벨 외래키를 걸지 않는다.** Supabase 가 관리하는 영역이라 마이그레이션이 깨진다
- Supabase 를 인증에 쓴다고 해서 DB 접근 방식이 바뀌는 건 아니다 — 데이터는 계속 **Prisma 를 통해 api 가** 읽고 쓴다
- `apps/api` 는 web 이 보낸 Supabase 액세스 토큰(JWT)을 검증해서 호출자를 식별한다. 이 프로젝트는 **ES256 비대칭 키**라 JWKS 공개키로 로컬 검증한다 — 시크릿 공유 불필요
- 서버 코드에서 **`getSession()` 을 신뢰하지 않는다.** 쿠키 값을 재검증 없이 읽기 때문이다. 반드시 **`getClaims()`** 를 쓴다 (매 호출 서명 검증)
- 모든 데이터 조회/수정은 **본인 소유인지 확인**한다. 리소스 ID 만 믿고 반환하지 않는다

> Auth.js(next-auth) 는 2026-11-02 에 걷어냈다. 다시 끌어오지 말 것.

### Next.js 16 주의
- **`middleware.ts` 는 `proxy.ts` 로 이름이 바뀌었다.** 내보내는 함수도 `proxy`(또는 default) 여야 한다. Supabase 공식 문서는 이 변경을 반영하고 있지만(Next 16 → `proxy.ts`), 블로그·튜토리얼은 대개 `middleware.ts` 기준이니 그대로 복사하면 **파일이 호출되지 않아 세션이 갱신되지 않고 로그아웃된다**
- `proxy.ts` 에서 **Supabase 세션 갱신은 필수다.** 안 하면 토큰이 만료돼 로그아웃된다. 다만 여기에 **DB 조회는 넣지 않는다** — 모든 요청 앞단에서 돌기 때문이다. 소유권 확인 같은 건 api 에서 한다
- `proxy.ts` 는 `setAll` 이 마지막으로 만든 응답 객체를 **그대로 반환**해야 한다. 중간에 새 응답을 만들어 반환하면 갱신된 쿠키가 실리지 않아 다음 요청에서 로그아웃된다
- `cookies()`, `searchParams`, `params` 는 모두 **async** 다 — `await` 를 빼먹으면 런타임에서 터진다

### 건드리지 말 것
- `apps/web/AGENTS.md`, `apps/api/AGENTS.md` — 프레임워크가 자동 생성/덮어쓰는 파일
- `.env` — `.env.example` 만 갱신하고 실제 값은 사용자가 입력

### 코드
- 주석과 네이밍은 주변 코드 스타일에 맞춘다
- 과도한 추상화 금지. 요청된 범위만 구현하고, 범위를 넘는 리팩터링은 먼저 물어본다

### 테스트
- 파일명은 `*.spec.ts`, **소스 옆에** 둔다 (`review-prompt.ts` ↔ `review-prompt.spec.ts`)
- **외부를 호출하지 않는다.** Claude·Storage·DB 는 목으로 대체한다. 네트워크가
  필요한 검증은 테스트가 아니라 수동 확인으로 남긴다
- 우선순위는 **프롬프트 내용 · 소유권 검사 · 입력 검증 · 파서**. 이 넷이 깨지면
  조용히 잘못 동작하거나 보안 문제가 된다
- web 테스트는 **순수 로직만**이고 node 환경이다(`vitest.config.mts`). 컴포넌트
  렌더링 테스트가 필요해지면 그때 jsdom 과 testing-library 를 추가한다
- e2e(`apps/api/test/*.e2e-spec.ts`)는 `pnpm --filter api test:e2e` 로 따로 돈다

### enum 을 추가할 때
`DocumentKind` 처럼 스키마 enum 에 값을 추가하면 **네 곳**을 함께 고쳐야 한다.
타입이 잡아주는 곳과 안 잡아주는 곳이 섞여 있다:

1. `packages/db/prisma/schema.prisma` → `pnpm db:migrate` → **`pnpm db:build`**
   (dist 를 다시 만들지 않으면 api 가 옛 타입을 본다)
2. `apps/api` 의 `Record<DocumentKind, …>` 들 — **타입이 잡아준다**
3. `apps/web/src/lib/api/index.ts` 의 문자열 유니온·라벨 — web 은 Prisma 에
   의존하지 않으므로 **타입이 잡아주지 않는다.** 직접 고쳐야 한다
4. 분기하는 프롬프트/UI 가 있으면 함께


### 컴포넌트
- 재사용 가능한 컴포넌트 단위로 만든다.
- UI 를 담당하는 컴포넌트, 데이터를 받아오는 컴포넌트는 분리되어야 한다.
- 서버 상태관리는 TanStack Query 를 사용한다.

디렉터리 역할 (apps/web/src):

```
components/ui/       순수 UI. props 만 받고 훅·페칭을 모른다
components/          데이터 컴포넌트. 훅으로 받아와 ui/ 를 조립한다
components/providers/ 전역 Provider
hooks/               use-*.ts — useQuery / useMutation 래퍼
lib/api/index.ts     공용 타입·상수·ApiError (런타임 의존성 없음)
lib/api/client.ts    브라우저 호출. TanStack Query 의 queryFn 용
lib/api/server.ts    서버 전용 호출 (라우트 핸들러·서버 액션)
lib/query/keys.ts    쿼리 키 모음
```

- `ui/` 컴포넌트에 `useQuery` 를 넣지 않는다. 데이터가 필요하면 상위 데이터 컴포넌트가 받아서 props 로 내린다
- api 호출 함수는 실패 시 **`ApiError` 를 던진다.** Query 가 `error`/`isError` 로 다루게 하려면 성공/실패 유니온을 반환하면 안 된다
- 재시도·캐시 정책은 `QueryProvider` 에 모아둔다. 개별 훅에서 다시 정하지 않는다 (`staleTime` 같은 데이터별 특성은 예외)
- 페이지(서버 컴포넌트)는 **인증 게이트와 레이아웃**만 맡고, 화면 데이터는 데이터 컴포넌트가 가져온다
- 쿼리 키는 `lib/query/keys.ts` 에만 둔다. 호출부에 문자열을 흩뿌리면 무효화가 안 맞는다