# 작업 목록

> 상태: **틀만 잡힌 상태.** 각 Phase 안의 세부 작업은 착수 직전에 쪼개서 채운다.
> 진행 규칙: 작업 시작 시 `[ ]` → 끝나면 `[x]`. 중단/보류는 뒤에 `(보류: 이유)` 를 적는다.

## 확정 사항

| 항목 | 결정 |
|---|---|
| 인터뷰 방식 | **텍스트 채팅** (음성 없음) |
| LLM | **Claude API** — `@anthropic-ai/sdk`, `claude-opus-5` |
| 로그인 | **구글 OAuth 단독** (이메일/비밀번호 없음) |
| 인증 구현 | **Supabase Auth** — 계정은 Supabase 가 관리하는 `auth.users` 에 저장 |
| 세션 검증 | api 가 **Supabase 액세스 토큰(JWT)** 을 검증해 호출자 식별 |
| 문서 종류 | **이력서 · 자소서 · 포트폴리오** (`DocumentKind`) |
| 문서 등록 | **텍스트 직접 입력 + 첨부파일 업로드** 둘 다 지원 |
| 스택 | Next.js(web) + NestJS(api) + Prisma/Supabase(db) — 기존 모노레포 유지 |

## 결정 필요 (착수 전 확인)

- [x] ~~**Supabase 패키지/변수명 확정**~~ → 아래 [Supabase 조사 결과](#supabase-조사-결과-2026-11-02) 참고
- [x] ~~**api 의 JWT 검증 방식**~~ → 이 프로젝트는 **ES256 비대칭 키** 사용 확인됨. `jose` 로 JWKS 로컬 검증
- [x] ~~**파일 저장소**~~ → **Supabase Storage** (비공개 `documents` 버킷). 업로드 경로는 브라우저 → api → Storage — 소유권 확인을 api 한곳에 모으기 위해
- [x] ~~**지원 파일 형식**~~ → **PDF 만**. 추출은 `unpdf`(네이티브 의존성 없음). 필요해지면 DOCX 추가
- [ ] **면접 범위** — 직무/회사 맞춤 질문을 어디까지 생성할지 (자소서 기반 꼬리질문 포함 여부)
- [ ] **초안 생성 기능 추가 여부** — Phase 3 은 **첨삭 피드백만** 구현했다(Phase 3 체크리스트가 전부 첨삭 항목이었음). 백지에서 자소서를 써주는 기능은 별도 판단 필요 — 지원자가 쓰지 않은 사실이 들어갈 위험이 커서 프롬프트 설계가 달라진다

---

## 인증 구조

**Supabase Auth** 가 구글 OAuth 왕복과 계정 저장을 모두 처리한다. 흐름:

```
브라우저 → Supabase(구글 OAuth 왕복) → 세션 쿠키 → apps/web
                                              ↓ 액세스 토큰(JWT)
                                           apps/api (JWT 검증)
                                              ↓ Prisma
                                           public 스키마 (도메인 데이터)
```

핵심은 **역할이 두 갈래**라는 점이다:

| 영역 | 담당 | 비고 |
|---|---|---|
| 계정·로그인·세션 | Supabase Auth (`auth` 스키마) | Supabase 가 관리. 우리가 테이블을 만들지 않는다 |
| 도메인 데이터 | api + Prisma (`public` 스키마) | 지금까지와 동일. Supabase 는 Postgres 호스팅일 뿐 |

- `public.users` 는 **프로필 테이블**이다. `id` 에 `auth.users.id`(UUID) 를 그대로 쓰고, 첫 로그인 때 upsert 한다. 도메인 테이블들의 외래키 기준점이 필요해서 둔다
- `auth` 스키마에는 **DB 레벨 외래키를 걸지 않는다.** Supabase 관리 영역이라 Prisma 마이그레이션과 충돌한다
- api 는 web 이 보낸 액세스 토큰(JWT)을 검증한다. DB 조회가 없어 빠르지만, **토큰 만료 전까지는 강제 로그아웃이 즉시 반영되지 않는다** — 필요해지면 그때 별도 처리
- RLS(Row Level Security)는 **쓰지 않는다.** 데이터 접근은 전부 api 를 거치고, 소유권 확인은 api 쿼리의 `userId` 조건으로 한다. 브라우저가 DB에 직접 붙지 않으므로 RLS 가 필요한 구조가 아니다

---

## Supabase 조사 결과 (2026-11-02)

### 설치할 패키지

| 패키지 | 버전 | 용도 |
|---|---|---|
| `@supabase/supabase-js` | 2.118.0 | 코어 SDK |
| `@supabase/ssr` | 0.12.7 | Next.js 서버사이드 쿠키/세션 (peer: `supabase-js ^2.114.0` ✓) |
| `jose` | 6.2.15 | api 의 JWT 검증 (JWKS) |

`@supabase/auth-helpers-nextjs` 는 **deprecated** — 쓰지 말 것. 옛날 블로그 글이 대부분 이걸 쓴다.

### 환경변수 (apps/web/.env.local)

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

공개 키 이름이 `ANON_KEY` → `PUBLISHABLE_KEY` 로 바뀌었다. 레거시 anon 키도 같은 변수명으로 2026년 말까지는 동작하지만 새 형식(`sb_publishable_`)을 쓰는 게 맞다.

### JWT 검증 — 비대칭 키 확인됨

JWKS 엔드포인트가 **ES256 키를 반환**한다:

```
https://<project-ref>.supabase.co/auth/v1/.well-known/jwks.json
→ {"keys":[{"alg":"ES256","kty":"EC","crv":"P-256",...}]}
```

→ api 는 `jose` 의 `createRemoteJWKSet` + `jwtVerify` 로 **로컬 검증**한다. 시크릿 공유가 필요 없다.
(HS256 레거시 프로젝트였다면 이 엔드포인트가 비어 있고, Auth 서버 왕복 검증을 써야 했다.)

### 반드시 지킬 것

- **`getSession()` 을 서버에서 신뢰하지 말 것.** 쿠키를 재검증 없이 읽는다. **`getClaims()`** 를 쓸 것 — 매 호출 서명 검증
- **`proxy.ts` 에서 세션을 갱신해야 한다.** Next 16 은 `middleware.ts` 를 호출하지 않으므로, 블로그 코드를 그대로 쓰면 세션이 갱신되지 않아 로그아웃된다
- `setAll` 이 마지막으로 만든 응답 객체를 **그대로 반환**할 것. 새 응답을 만들면 갱신 쿠키가 유실된다
- 세션 쿠키 이름은 `sb-<project-ref>-auth-token`

### 파일 배치 (공식 레지스트리 기준)

```
src/lib/supabase/client.ts   createBrowserClient  — 클라이언트 컴포넌트용
src/lib/supabase/server.ts   createServerClient   — 서버 컴포넌트/액션/라우트핸들러용
src/proxy.ts                 세션 갱신 + 미로그인 리다이렉트
```

---

## Phase 0 — 기반 정리

보일러플레이트(`Post` 샘플 모델)를 걷어내고 실제 도메인으로 교체. **인증 테이블이 스키마에 들어가므로 Phase 1 과 한 번에 설계한다.**

- [x] 샘플 `Post` 모델 / `/posts` 엔드포인트 / `api.ts` 의 `Post` 타입 제거
- [x] `users` 를 Supabase Auth 기준 프로필 테이블로 설계 (`id` = `auth.users.id` UUID)
- [x] 도메인 스키마 설계 (`Document`, `Review`, `InterviewSession`, `Message`) + `users` 와 관계 연결
- [x] `pnpm db:migrate` 로 적용 — `20261102101156_supabase_auth`
- [x] `.env.example` 갱신
- [x] 루트 화면을 `/posts` 대신 `/health` 기준으로 교체, `diagnose.mjs` 의 테이블 체크를 `users` 로 변경

## Phase 1 — 인증 (Supabase Auth + 구글 로그인)

> **되돌림 기록 (2026-11-02):** 처음에 Auth.js(next-auth)로 구현했다가, Supabase Auth 가
> 의도였음이 확인되어 전부 걷어냈다. 관련 패키지·파일·테이블(`accounts`,
> `sessions`, `verification_tokens`)은 모두 제거됨. 다시 끌어오지 말 것.

- [x] Supabase 대시보드에서 구글 프로바이더 설정 — 활성화 확인됨 (authorize 가 실제 client_id 로 302)
- [x] Google Cloud 리디렉션 URI 등록 — 확인됨 (Google authorize 가 302, 미등록이면 400)
- [x] 패키지 설치 — `@supabase/supabase-js@2.118.0`, `@supabase/ssr@0.12.7`, `jose@6.2.15`(api)
- [x] 로그인 / 로그아웃 + OAuth 콜백 (`/auth/callback` 에서 code → 세션 교환)
- [x] 세션 갱신 — `src/proxy.ts` → `updateSession()`
- [x] 로그인 전·후 화면 분기, 미로그인 접근 차단 (proxy + 페이지의 `getClaims()` 2단)
- [x] 첫 로그인 때 `public.users` 프로필 upsert — `ProfileService.ensureProfile`, `GET /me` 가 호출
- [x] api 로 액세스 토큰 전달 — `authedFetch` (`src/lib/api.server.ts`)
- [x] api 측 JWT 검증 가드 — `SupabaseAuthGuard` (JWKS/ES256) + `GET /me`
- [ ] **실제 구글 로그인 왕복 확인** — 브라우저에서 클릭해야 하므로 사용자 확인 필요

> 검증된 것: `/` → `/login` 리다이렉트, `/login` 200, Supabase 구글 프로바이더 활성화,
> Google 리디렉션 URI 등록, JWT 가드 4종(토큰 없음 / 형식 오류 / 서명 위조 / 만료 → 401,
> 위조 3종 모두 `signature verification failed` = JWKS 실제 조회·검증됨),
> 프로필 upsert 멱등성 + UUID FK 연결.

## 컴포넌트 기반 정리 (2026-11-03)

CLAUDE.md 의 컴포넌트 규칙(재사용 단위 / UI·데이터 분리 / TanStack Query)에 맞춰
Phase 2 전에 구조를 잡았다. 자세한 디렉터리 역할은 CLAUDE.md → 컴포넌트.

- [x] `@tanstack/react-query@5.105.3` 설치 + `QueryProvider` (재시도·캐시 정책 한곳에)
- [x] api 레이어를 브라우저용/서버용으로 분리, 실패 시 `ApiError` 를 **던지도록** 변경
- [x] 순수 UI 컴포넌트 분리 — `Alert`, `StatusList`/`StatusItem`, `PageHeader`, `RetryingIndicator`
- [x] 데이터 훅 — `useHealth`, `useProfile`
- [x] 데이터 컴포넌트 `ConnectionStatus` 가 훅 + UI 를 조립
- [x] 페이지는 인증 게이트·레이아웃만 담당
- [x] `RetryOnMount`(router.refresh 폴링) 제거 → Query 재시도로 대체
- [x] 로그인 콜백에서 `GET /me` 호출 → 로그인 직후 프로필 생성 보장

> 데이터 페칭이 브라우저로 옮겨갔으므로 **CORS 가 경로에 들어왔다.** preflight 확인됨
> (`Access-Control-Allow-Headers: authorization`). api 의 `CORS_ORIGIN` 이 배포 때 바뀌면 함께 고쳐야 한다.

## Phase 2 — 이력서 · 자소서 등록

- [x] 텍스트 직접 입력 폼 — `DocumentTextForm`
- [x] 파일 업로드 (Supabase Storage, PDF 10MB 제한) — `DocumentUploadForm` + `StorageService`
- [x] PDF → 텍스트 추출 — `unpdf`, 스캔 이미지 PDF 는 안내 후 거부
- [x] 목록 / 상세 / 삭제 — `/documents`, `/documents/[id]`
- [x] 원본 PDF 다운로드 — 만료되는 signed URL
- [ ] **`apps/api/.env` 에 `SUPABASE_SECRET_KEY` 입력** (**사용자 작업**) — 없으면 업로드만 503. 텍스트 등록은 동작함
- [ ] 업로드·등록 왕복 브라우저 확인

### 엔드포인트

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/documents` | 내 문서 목록 (본문 제외) |
| GET | `/documents/:id` | 상세 (본문 포함) |
| GET | `/documents/:id/file` | 원본 다운로드용 signed URL |
| POST | `/documents` | 텍스트로 등록 |
| POST | `/documents/upload` | PDF 업로드 (multipart) |
| DELETE | `/documents/:id` | 삭제 (Storage 객체도 함께) |

전부 `SupabaseAuthGuard` 적용. 남의 문서는 403 대신 **404** 로 응답한다 —
403 을 주면 해당 ID 가 존재한다는 사실이 새어 나간다.

> 검증: 엔드포인트 6종 등록·가드(토큰 없이 401), 실제 PDF 3페이지에서 한글
> 3,063자 추출, DB 왕복(등록→목록→상세→삭제), 소유권 격리(남의 문서 조회 시 null),
> `next build` 성공. **Storage 업로드는 키가 없어 미검증.**

## Phase 3 — 자소서 멘토 (첨삭)

- [x] 첨삭 프롬프트 설계 — `reviews/review-prompt.ts`, 이력서/자소서/포트폴리오 기준 분기
- [x] 첨삭 요청 API (streaming) — `POST /documents/:id/reviews`, NDJSON
- [x] 피드백 결과 화면 (원문 대비 보기) — `/documents/[id]` 2단 레이아웃
- [x] 첨삭 이력 저장 + 조회 + 삭제 — 토큰 사용량도 함께 기록
- [ ] **`apps/api/.env` 에 `ANTHROPIC_API_KEY` 입력** (**사용자 작업**) — 없으면 첨삭만 503
- [ ] 실제 첨삭 왕복 브라우저 확인

### 엔드포인트

| 메서드 | 경로 | 설명 |
|---|---|---|
| POST | `/documents/:id/reviews` | 첨삭 생성 — **NDJSON 스트림** |
| GET | `/documents/:id/reviews` | 첨삭 이력 (최신순, 본문 포함) |
| DELETE | `/reviews/:id` | 첨삭 삭제 |

### 설계 메모

- **스트림 형식은 SSE 가 아니라 NDJSON.** 첨삭 본문에 줄바꿈이 많은데 SSE 는
  줄바꿈을 프레임 구분자로 쓴다. JSON 한 줄이면 줄바꿈이 자동 escape 된다.
  이벤트: `{type:"text"}` / `{type:"done",reviewId}` / `{type:"error"}`
- **스트리밍 시작 전에 사전 점검**(`prepare`)을 한다. 본문을 흘려보내기 시작하면
  HTTP 상태를 못 바꾸므로, 소유권(404)과 API 키(503)는 그 전에 확인한다.
  시작 후 발생한 오류는 `{type:"error"}` 이벤트로 내려간다.
- **프롬프트의 1순위 규칙은 "사실을 만들어내지 말 것".** 모델이 빈 수치를 채우면
  지원자가 그대로 제출해 거짓이 된다 — 이 서비스에서 가장 위험한 실패다.
- `max_tokens` 는 16000. Claude Opus 5 는 사고가 기본으로 켜져 있고
  `max_tokens` 가 **사고 + 응답 합계**를 제한하므로 응답 길이만 보고 잡으면 잘린다.
- `stop_reason: "refusal"` 을 확인한다. 서버측 `fallbacks` 는 넣지 않았다 —
  자소서 첨삭에 거절이 날 일은 드물다. 보안 직군 자소서 등에서 실제로 걸리면 추가한다.
- 첨삭 이력은 `feedback` 을 그대로 목록에 싣는다. 문서당 몇 건이라 추가 요청 없이 받는 게 단순하다.

> 검증: 엔드포인트 3종 등록·가드(토큰 없이 401), 프롬프트 생성(이력서/자소서 분기),
> `next build` 성공, 타입체크. **실제 Claude 호출은 키가 없어 미검증.**

## Phase 4 — AI 인터뷰어 (텍스트 채팅)

- [x] 면접관 프롬프트 설계 (등록 문서를 컨텍스트로 주입) — `interviews/interview-prompt.ts`
- [x] 채팅 API (streaming) + 대화 저장 — `POST /interviews/:id/messages`, NDJSON
- [x] 채팅 UI — `/interviews`, `/interviews/[id]`
- [x] 긴 대화 컨텍스트 관리 — 프롬프트 캐시 + 메시지 상한 (아래 메모)
- [x] 면접 종료 후 총평 생성 — `POST /interviews/:id/summary`
- [x] 면접 난이도별 기능 (쉬움·보통·어려움) — `InterviewDifficulty`, 꼬리질문 개수·깊이만 차이
- [ ] 실제 면접 왕복 브라우저 확인 (첫 질문 → 답변 → 꼬리질문 → 총평)

### 엔드포인트

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/interviews` | 내 면접 목록 |
| GET | `/interviews/:id` | 상세 + 대화 전체 |
| POST | `/interviews` | 면접 생성 (제목·난이도·문서 선택) |
| POST | `/interviews/:id/messages` | 답변 전송 → 다음 질문 **스트림** |
| POST | `/interviews/:id/summary` | 종료 + 총평 **스트림** |
| DELETE | `/interviews/:id` | 삭제 (메시지 cascade) |

### 설계 메모

- **난이도는 꼬리질문 개수·깊이만 바꾼다.** 질문 주제나 분야를 바꾸지 않는다
  (쉬움 0~1개 / 보통 1~2개 / 어려움 2~3개 + 모순·과장 지적).
- **면접 중에는 면접관이 평가·칭찬·첨삭을 하지 않는다.** 실제 면접과 다르고,
  총평의 가치도 사라진다. 피드백은 전부 총평에서 나온다.
- **`KICKOFF_MESSAGE` 를 매 요청 맨 앞에 끼운다.** Messages API 는 첫 메시지가
  `user` 여야 하는데 면접은 면접관(assistant)이 먼저 말한다. DB 에는 저장하지
  않고 값이 고정이라 프롬프트 캐시도 깨지지 않는다.
- **컨텍스트 관리는 압축이 아니라 캐시 + 상한.** 1M 컨텍스트에서 40턴 면접은
  한참 여유가 있으므로 압축(compaction)은 불필요하다. 대신 문서 전문이 들어간
  시스템 프롬프트에 `cache_control` 을 걸어 **두 번째 턴부터 입력 비용을 줄이고**,
  메시지 80건(40턴) 상한에서 "총평을 받으세요"로 안내한다.
- **답변은 모델 호출 전에 저장한다.** 호출이 실패해도 사용자가 쓴 글이 날아가지
  않고, `content` 없이 다시 호출해 재시도할 수 있다.
- `POST /messages` 의 `content` 는 선택이다 — 비우면 답변 없이 면접관 턴만
  생성한다(첫 질문·재시도). 단 마지막 메시지가 면접관이면 400.

> 검증: 엔드포인트 6종 등록·가드(토큰 없이 401), 난이도 3단계 프롬프트 분기 +
> 문서 없는 경우, DB 왕복(세션→메시지 순서→총평 저장→cascade 삭제),
> 소유권 격리, `next build` 8라우트, 타입체크.
> **실제 Claude 호출은 미검증** — 과금되는 호출이라 브라우저 확인에 맡김.

## Phase 5 — 마무리

### 테스트 코드 / CI (2026-11-03 완료)

- [x] api 테스트 — vitest 기존 설정 활용, 7파일 68개
- [x] web 테스트 — vitest 추가(node 환경, jsdom 없음), 3파일 25개
- [x] 루트 스크립트 — `pnpm lint` / `typecheck` / `test`
- [x] CI — `.github/workflows/ci.yml` (lint → typecheck → test → build)
- [ ] CD(배포 자동화) — 배포 대상이 정해진 뒤

무엇을 테스트했나 (우선순위 = 조용히 틀리면 위험한 것):

| 영역 | 핵심 검증 |
|---|---|
| 프롬프트 | 문서 종류/난이도별 분기, "사실 만들어내지 말 것" 규칙 존재, 섹션 순서 고정 |
| 소유권 | 남의 문서·면접은 404(403 아님), 조회에 항상 `userId` 조건 |
| 입력 검증 | PDF 매직바이트, 용량 초과, 스캔 PDF 거부, 추출 실패 시 저장소 미오염 |
| 면접 턴 가드 | 종료된 면접 / 메시지 상한 / 답변 없이 연속 호출 / 재시도 경로 |
| 인증 가드 | 헤더 없음·잘못된 스킴·빈 토큰 구분, `SUPABASE_URL` 없으면 생성 실패 |
| NDJSON 파서 | **청크 경계가 줄·한글 중간을 잘라도** 복원, 개행 없는 마지막 줄 |

- 외부 호출(Claude·Storage·DB)은 전부 목으로 대체 — 테스트가 네트워크에 의존하지 않는다
- CI 는 더미 환경변수로 돈다. **더미 값으로 전체 빌드가 통과하는지 로컬에서 확인함**

### 레이트리밋 · 비용 가드 (2026-11-03 완료)

- [x] `RateLimitGuard` — 사용자·엔드포인트별 슬라이딩 윈도 (메모리)
- [x] `CostGuard` — 최근 24시간 누적 토큰 한도 (DB 집계)
- [x] `GET /usage` + 홈 화면 사용량 막대 — 429 만 뜨면 이유를 알 수 없으므로
- [x] 테스트 — 슬라이딩 윈도 동작, 키 분리, 한도 계산, 잘못된 설정값 폴백

| 엔드포인트 | 레이트리밋 | 비용 가드 |
|---|---|---|
| `POST /documents/:id/reviews` | 10회 / 60초 | ✅ |
| `POST /interviews/:id/messages` | 20회 / 60초 | ✅ |
| `POST /interviews/:id/summary` | 5회 / 60초 | ✅ |
| `POST /documents/upload` | 20회 / 60초 | — (토큰 안 씀) |

- 둘을 나눈 이유: **막는 대상이 다르다.** 레이트리밋은 "몰아치는 요청",
  비용 가드는 "하루 종일 꾸준히 써서 쌓이는 요금"
- 카운터 키에 핸들러 이름을 넣어 **엔드포인트별로 예산을 따로** 준다.
  첨삭을 많이 썼다고 면접이 막히면 안 된다
- 한도 초과 시 **조회·등록은 계속 동작**한다. Claude 쓰는 기능만 429
- ⚠️ 레이트리밋은 **프로세스 메모리**다. 인스턴스를 늘리면 실효 한도가
  곱해지므로 수평 확장 시 Redis 로 옮겨야 한다
- 기본 한도 `DAILY_TOKEN_LIMIT=300000`. 저장된 `inputTokens` 는 프롬프트
  캐시로 읽은 토큰이 빠진 값이라 **정가 과금분에 가깝다**

### 첫 질문 다양화 (2026-11-03)

같은 문서·난이도로 다시 면접을 보면 첫 질문이 거의 같던 문제.

- 원인: **Opus 5 는 `temperature` 를 받지 않는다**(400). 입력이 바이트 단위로
  같으면 출력도 수렴한다 — 샘플링으로 흔들 수 없다
- 해결: `OPENING_ANGLES` 에서 **시작 각도를 무작위로 하나** 골라 첫 턴에만
  함께 보낸다. 난수 문자열을 섞는 것과 달리 질문의 **방향**이 달라진다
- 첫 턴에만 붙인다 — 생성된 질문은 저장되므로 이후 턴은 저장된 대화를
  따라가면 되고, 매 턴 바뀌면 이력이 일관되지 않는다
- 문서가 없는 경우는 문서를 전제하지 않는 별도 후보군을 쓴다

### 운영 조회 (2026-11-03 완료)

관리자만 볼 수 있는 API 호출 기록 · 백엔드 로그 화면.

- [x] `ADMIN_EMAILS` 기반 `AdminService` / `AdminGuard` — **미설정 시 전원 차단**
- [x] 메모리 링 버퍼 — 요청 500건 / 로그 1000줄
- [x] `BufferedConsoleLogger` — 콘솔 출력은 그대로 두고 버퍼에도 담음
- [x] `RequestLogInterceptor` — 전역, 메서드·경로·상태·소요시간
- [x] `GET /admin/{requests,logs,stats}` + `/admin` 화면 (5초 폴링)
- [x] `/me` 에 `admin` 필드 — 관리자에게만 메뉴 노출
- [x] 테스트 — 관리자 판별(부분일치·대소문자·미설정), 링 버퍼, 경로 정규화, 인터셉터

| 결정 | 이유 |
|---|---|
| 권한 없으면 **404**(403 아님) | 403 은 엔드포인트 존재를 알려준다 |
| `ADMIN_EMAILS` 비면 **전원 차단** | 실수로 비웠을 때 전원 공개가 되면 안 된다 |
| 이메일 기준 (ID 아님) | 구글 로그인이라 안정적이고 사람이 설정하기 쉽다. 값은 검증된 JWT 클레임에서 온다 |
| **메모리** 링 버퍼 | 요청마다 INSERT 하면 비용·지연이 늘고, 운영 데이터는 본래 휘발성 |
| 본문·헤더·쿼리 **미기록** | 본문엔 이력서 전문, 헤더엔 토큰이 들어 있다 |

- ⚠️ 재시작하면 기록이 사라지고, 인스턴스별로 따로 쌓인다. 장기 보관·통합이
  필요해지면 외부 수집 도구로 보내야 한다
- `/me` 의 `admin` 은 메뉴 숨김용 **편의**다. URL 직접 접근도 api 가 404 로 막는다

#### 호출자 표시 + 수집 위치 수정 (2026-11-03)

"누가 호출했는지" 를 추가하면서 **기록 누락 버그 두 개**를 찾았다.

- [x] 요청 기록에 `userEmail` 추가, 화면에 "호출자" 열 표시
- [x] **인터셉터 → 미들웨어로 이동** — 인터셉터는 가드 뒤라서 거절된 요청
      (401·404)이 전부 누락됐다. 운영 조회에서 가장 보고 싶은 데이터였다
- [x] **와일드카드 `'*path'` → `'{*path}'`** — 전자는 세그먼트 1개 이상만
      매칭해서 루트 `GET /` 가 기록되지 않았다
- [x] `AllExceptionsFilter` — `finish` 시점에는 예외 객체를 못 보므로
      메시지를 요청에 얹어 전달. `BaseExceptionFilter` 상속으로 응답 형식 유지
- [x] `test/request-log.e2e-spec.ts` + CI 에 `pnpm test:e2e` 추가

> 둘 다 **단위 테스트로는 잡히지 않는 종류**였다. "미들웨어 함수가 올바르게
> 기록한다" 는 통과하지만 "Nest 가 그 미들웨어를 모든 라우트에 대해 불러주는가"
> 는 앱을 띄워야 알 수 있다. 와일드카드 버그는 실제로 e2e 가 잡았다.

- 인증 실패 요청은 호출자가 `null` 이고 화면에 "익명" 으로 뜬다 — 누구인지
  증명하지 못한 요청이므로 그게 맞다

### 배포 (2026-11-04 진행 중)

**web → Vercel, api → Render, Supabase 는 DB·Auth·Storage 유지.**

api 를 Render 로 보낸 이유는 **상시 실행 프로세스를 전제로 설계돼 있어서**다 —
메모리 레이트리밋, `/admin` 링 버퍼, 스트림이 끝난 뒤에 저장하는 첨삭·총평.
Vercel 서버리스에 올리면 앞의 둘이 무의미해지고 본문 4.5MB 제한에 업로드도 막힌다.

- [x] 플랫폼 결정 + `render.yaml` 작성
- [x] `CORS_ORIGIN` 을 쉼표 목록으로 (배포 도메인 + 로컬을 동시에 허용)
- [x] JSON 본문 한도 1mb — 기본 100kB 가 `content` 10만자(한글 ≈300kB)보다 작았다
- [x] 스트림 keepalive — 모델이 사고하는 동안 바이트가 0개 나가서 프록시가 끊는 걸 막음
- [x] `apps/web/.env.example` 에 누락된 Supabase 변수 2개 추가
- [ ] **Render 배포 성공** — 현재 `502 + x-render-routing: no-deploy` (살아있는 배포 없음)
- [ ] 구글 로그인 왕복 / 업로드 / 첨삭 스트림 실제 확인
- [ ] CD(배포 자동화) — push 자동배포로 충분한지 판단 후

> ⚠️ **`.env` 는 전부 gitignore 대상이라 배포되지 않는다.** Render·Vercel 대시보드에
> 직접 넣어야 한다. 특히 `SUPABASE_URL` 이 없으면 `SupabaseAuthGuard` 가 DI 시점에
> throw 해서 **부팅 자체가 실패**한다 → 그게 `no-deploy` 로 보인다.
>
> ⚠️ Render 는 **루트 디렉터리 밖 파일을 빌드·런타임에 제공하지 않는다.** Root Directory 를
> `apps/api` 로 두면 `packages/db` 와 락파일이 안 보여 깨진다 — 비워 두고 build filter 로 막는다.

### 남은 작업

- [ ] 에러 처리 전반 점검 (가드 외 — 전역 예외 필터, 로깅)
- [ ] README 갱신 (실제 기능 반영) — 위가 끝난 뒤
