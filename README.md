# ppp

Next.js + NestJS + Prisma + Supabase(PostgreSQL) 풀스택 모노레포.

```
apps/web        Next.js 16  (App Router, Tailwind v4)   → http://localhost:3000
apps/api        NestJS 12   (ESM)                       → http://localhost:3001
packages/db     @ppp/db — Prisma 7 스키마 + 클라이언트
```

## 빠른 시작

```powershell
pnpm install

# 1) 루트 .env 에 Supabase 연결 문자열 입력  → SETUP.md 의 Step 7 참고
# 2) 테이블 생성
pnpm db:migrate
# 3) 개발 서버 실행 (web + api 동시)
pnpm dev
```

> 처음 `pnpm dev` 후 몇 초간 화면에 "백엔드가 아직 준비되지 않았습니다" 가 보이는 것은
> 정상입니다 — NestJS 컴파일(5~15초)을 기다리는 중이며 자동으로 목록 화면으로 전환됩니다.
> 뭔가 막히면 `pnpm diagnose` 를 먼저 실행하세요.

| 명령어 | 설명 |
|---|---|
| `pnpm diagnose` | **환경 진단** — .env/DNS/DB접속/테이블/포트/health 일괄 확인 (읽기 전용) |
| `pnpm dev` | web(:3000) + api(:3001) 동시 실행 |
| `pnpm dev:web` / `pnpm dev:api` | 개별 실행 |
| `pnpm build` | 전체 프로덕션 빌드 |
| `pnpm db:migrate` | 스키마 변경 → 마이그레이션 생성/적용 |
| `pnpm db:generate` | Prisma 클라이언트만 재생성 |
| `pnpm db:studio` | DB 데이터 GUI |

## 엔드포인트

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/` | API 동작 확인 |
| GET | `/health` | DB 까지 왕복해서 연결 상태 확인 |
| GET | `/posts` | 글 목록 |
| POST | `/posts` | 글 생성 (`{ title, content?, published? }`) |

## 설정 파일 / 환경 변수

| 파일 | 내용 |
|---|---|
| `.env` | `DATABASE_URL`(런타임, 6543) · `DIRECT_URL`(마이그레이션, 5432) |
| `apps/api/.env` | `PORT` · `CORS_ORIGIN` |
| `apps/web/.env.local` | `NEXT_PUBLIC_API_URL` |

**전체 세팅 과정과 트러블슈팅은 [SETUP.md](./SETUP.md) 를 보세요.**
