# 아키텍처

> 이 문서는 **하네스 가드레일**이다 (`/harness` 가 매 step 프롬프트에 주입한다).
> 여기 적힌 구조가 틀리면 모든 step 이 틀린 전제로 작업한다. 구조를 바꾸면 이 문서를 같이 고친다.

## 전체 구성

**pnpm workspace 모노레포.** 단일 Next.js 앱이 아니다 — web 과 api 가 별도 배포 단위다.

```
apps/web        Next.js 16  (App Router, Tailwind v4)   → http://localhost:3000  → Vercel
apps/api        NestJS 12   (ESM)                       → http://localhost:3001  → Render
packages/db     @ppp/db — Prisma 7 스키마 + 클라이언트
scripts/        레포 도구 (diagnose.mjs, execute.py, hooks/)
phases/         하네스 작업 정의 (step 파일 + 상태 인덱스)
```

**브라우저는 api 를 직접 호출한다.** web 에 프록시 레이어가 없으므로 CORS 가 필수 경로다.

## 디렉토리 구조

### apps/web/src

```
app/                  App Router. 페이지는 인증 게이트 + 레이아웃만 맡는다
  auth/callback/      OAuth 콜백 라우트 핸들러
components/ui/        순수 UI. props 만 받고 훅·페칭을 모른다
components/           데이터 컴포넌트. 훅으로 받아와 ui/ 를 조립한다
components/providers/ 전역 Provider (QueryProvider)
hooks/                use-*.ts — useQuery / useMutation 래퍼
lib/api/index.ts      공용 타입·상수·ApiError (런타임 의존성 없음)
lib/api/client.ts     브라우저 호출. TanStack Query 의 queryFn 용
lib/api/server.ts     서버 전용 호출 (라우트 핸들러·서버 액션)
lib/query/keys.ts     쿼리 키 모음
lib/supabase/         브라우저/서버 클라이언트, 세션 갱신
proxy.ts              Next 16 의 미들웨어 (이름이 middleware.ts 가 아니다)
```

레이어 규칙:

- `ui/` 컴포넌트에 `useQuery` 를 넣지 않는다. 데이터가 필요하면 상위 데이터 컴포넌트가 받아서 props 로 내린다
- 페이지(서버 컴포넌트)는 **인증 게이트와 레이아웃**만 맡고, 화면 데이터는 데이터 컴포넌트가 가져온다
- 쿼리 키는 `lib/query/keys.ts` 에만 둔다. 호출부에 문자열을 흩뿌리면 무효화가 안 맞는다
- api 호출 함수는 실패 시 **`ApiError` 를 던진다.** 성공/실패 유니온을 반환하면 Query 가 `error` 로 다루지 못한다
- 재시도·캐시 정책은 `QueryProvider` 에 모은다. 개별 훅에서 다시 정하지 않는다 (`staleTime` 은 예외)

### apps/api/src

기능별 Nest 모듈. 각 모듈은 `*.module.ts` + `*.controller.ts` + `*.service.ts` 를 기본으로 하고,
프롬프트·파서처럼 순수한 로직은 별도 파일로 떼어 테스트한다.

```
auth/          SupabaseAuthGuard(JWT 검증) · AdminGuard · profile upsert · /me
documents/     문서 CRUD · PDF 텍스트 추출(pdf-text.ts)
reviews/       자소서 첨삭 · review-prompt.ts
interviews/    면접 세션·메시지 · interview-prompt.ts
claude/        Anthropic SDK 래퍼 (ClaudeService) — 외부 호출은 여기로 모은다
usage/         RateLimitGuard(메모리) · CostGuard(DB 집계) · 사용량 조회
monitoring/    RequestLogMiddleware · 메모리 링 버퍼 · 관리자 조회
feedback/      버그 신고 메일
storage/       Supabase Storage 래퍼
prisma/        PrismaService
common/        AllExceptionsFilter · ndjson 직렬화
test/          *.e2e-spec.ts (pnpm --filter api test:e2e 로 따로 돈다)
```

### packages/db

```
prisma/schema.prisma   단일 스키마. 변경 후 반드시 pnpm db:migrate 또는 db:generate
prisma/migrations/     마이그레이션 이력
prisma.config.ts       마이그레이션용 DIRECT_URL (스키마 안에 url 을 쓸 수 없다)
src/index.ts           PrismaClient 생성 (런타임은 adapter + DATABASE_URL)
src/generated/prisma   생성물. 직접 수정하지 않는다
```

## 요청 파이프라인 (api)

Nest 의 실행 순서는 **미들웨어 → 가드 → 인터셉터 → 핸들러**다. 이 순서가 설계의 근거다.

```
요청
 → RequestLogMiddleware        가드보다 먼저. res.on('finish') 로 최종 상태코드까지 기록
 → SupabaseAuthGuard           JWT(ES256) JWKS 로컬 검증 → request.user
 → AdminGuard                  관리자 전용 경로. 권한 없으면 403 이 아니라 404
 → RateLimitGuard              짧은 시간 몰아치는 요청. 메모리, 프로세스 단위
 → CostGuard                   24시간 누적 토큰. DB 집계, 인스턴스 무관
 → 핸들러 (ValidationPipe 통과한 DTO)
 → AllExceptionsFilter         예외 메시지를 request 에 얹어 로그에 전달
```

- 요청 기록을 **인터셉터로 옮기면 안 된다** — 가드가 거절한 401·404 가 전부 누락된다
- `RateLimitGuard`·`CostGuard` 는 **`SupabaseAuthGuard` 뒤**여야 한다 (`request.user` 가 필요)
- `CostGuard` 는 **Claude 를 호출하는 엔드포인트에만** 붙인다. 업로드처럼 토큰을 안 쓰는 곳은 레이트리밋만

## 데이터 흐름

### 인증

```
브라우저 → Supabase(구글 OAuth 왕복) → 세션 쿠키 → apps/web
                                              ↓ 액세스 토큰(JWT)
                                           apps/api (JWKS 로 서명 검증)
                                              ↓ Prisma
                                           public 스키마
```

- 계정은 Supabase 가 관리하는 `auth.users` 에 있다. `public.users` 는 **프로필 테이블**이고
  `id` 에 `auth.users.id`(UUID) 를 그대로 쓴다 — 첫 로그인 때 upsert
- `auth` 스키마에는 **DB 레벨 외래키를 걸지 않는다** (Supabase 관리 영역)
- 서버 코드에서 `getSession()` 을 신뢰하지 않는다. 반드시 **`getClaims()`** (매 호출 서명 검증)
- `proxy.ts` 는 세션 갱신만 한다. **DB 조회를 넣지 않는다** — 모든 요청 앞단에서 돌기 때문

### 문서 등록

```
브라우저 → api (소유권·검증) → [PDF면] 텍스트 추출 → Supabase Storage(비공개 버킷)
                              → Prisma: Document 생성 (content 에 본문 텍스트)
```

업로드를 web 에서 Storage 로 직접 보내지 않는다. **소유권 확인을 api 한곳에 모으기 위해** api 를 경유한다.

### 첨삭 · 면접 (Claude 호출)

```
브라우저 → api (인증 → 레이트리밋 → 비용가드)
         → ClaudeService (streaming)
         → NDJSON 으로 브라우저에 중계 → use-stream-text 가 조립
         → 완료 후 Prisma 에 결과 + 토큰 수 저장
```

- 모든 Claude 호출은 **api 경유**다. 키를 `apps/web` 에 두지 않는다
- 매 턴 같은 문서 컨텍스트를 다시 보내므로 시스템 프롬프트에 `cache_control` 을 건다

## 상태 관리

| 영역 | 방식 |
|---|---|
| 서버 상태 (web) | **TanStack Query**. 정책은 `QueryProvider` 에 모은다 |
| 클라이언트 로컬 상태 | `useState` / `useReducer`. 전역 스토어는 쓰지 않는다 |
| 세션 | Supabase 쿠키 + `proxy.ts` 갱신 |
| 레이트리밋 카운터 | api 프로세스 메모리 (**단일 인스턴스 전제**) |
| 최근 로그 | api 프로세스 메모리 링 버퍼 (재시작하면 사라진다) |

메모리에 상태를 두는 두 곳은 **Render 단일 인스턴스**라는 전제에 의존한다.
수평 확장·서버리스로 가는 순간 Redis 등으로 함께 옮겨야 한다.
