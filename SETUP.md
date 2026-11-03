# 풀스택 세팅 가이드 — Next.js + NestJS + Prisma + Supabase(PostgreSQL)

빈 폴더에서 시작해 이 저장소와 똑같은 상태를 만드는 단계별 가이드입니다.
**이미 세팅이 끝나 있으므로**, 지금 당장 할 일은 [Step 7 (Supabase 연결)](#step-7-supabase-연결--env-채우기) 뿐입니다.
Step 0~6 은 "어떻게 만들어졌는지"에 대한 재현 기록입니다.

---

## 0. 이 프로젝트가 쓰는 버전

| | 버전 | 비고 |
|---|---|---|
| Node.js | 22.22.0 | 20.11+ 필요 |
| pnpm | 10.28.1 | 워크스페이스 관리 |
| Next.js | 16.4.3 | App Router, Turbopack, Tailwind v4 |
| NestJS | 12.x | **ESM** 프로젝트 (`"type": "module"`) |
| Prisma | **7.10.1 고정** | ⚠️ 아래 경고 참고 |

> ### ⚠️ `prisma@latest` 를 쓰면 안 됩니다
> 현재 npm 의 `prisma` **`latest` 태그는 `8.0.0-rc.28`(릴리스 후보)** 를 가리킵니다.
> `pnpm add prisma` 처럼 버전 없이 설치하면 RC 가 깔립니다.
> 안정 버전은 **7.10.1** 이므로 항상 버전을 명시하세요.
> ```bash
> pnpm add -D prisma@7.10.1
> pnpm add @prisma/client@7.10.1 @prisma/adapter-pg@7.10.1
> ```

### ORM: Prisma vs TypeORM — Prisma 를 골랐습니다

| | Prisma | TypeORM |
|---|---|---|
| 스키마 | `schema.prisma` 하나가 단일 소스, 마이그레이션 자동 생성 | 엔티티 데코레이터, 마이그레이션 수동 보정 잦음 |
| 타입 안전성 | 쿼리 결과 타입까지 완전 추론 | `find*` 반환 타입이 느슨함 |
| Supabase 풀러 | 공식 가이드 + `pgbouncer=true` 대응 | 직접 설정 |
| 모노레포 공유 | 생성 클라이언트를 패키지로 내보내기 쉬움 | 엔티티 공유 시 메타데이터 충돌 |

---

## 1. 폴더 구조 (pnpm 워크스페이스 모노레포)

```
ppp/
├─ package.json              # 워크스페이스 루트 — 모든 명령의 진입점
├─ pnpm-workspace.yaml       # 워크스페이스 글롭 + 빌드 스크립트 허용 목록
├─ tsconfig.base.json        # 공통 TS 옵션
├─ .env                      # DATABASE_URL / DIRECT_URL   ← git 제외
├─ .env.example              # 위 파일의 템플릿           ← 커밋됨
│
├─ apps/
│  ├─ web/                   # ■ 프론트엔드 Next.js  :3000
│  │  ├─ .env.local          #   NEXT_PUBLIC_API_URL
│  │  └─ src/
│  │     ├─ app/page.tsx     #   API 호출해서 Posts 목록 렌더
│  │     └─ lib/api.ts       #   fetch 헬퍼
│  │
│  └─ api/                   # ■ 백엔드 NestJS  :3001
│     ├─ .env                #   PORT / CORS_ORIGIN
│     └─ src/
│        ├─ main.ts          #   포트 3001 + CORS + ValidationPipe
│        ├─ app.module.ts    #   ConfigModule + PrismaModule + PostsModule
│        ├─ app.controller.ts#   GET /  ,  GET /health
│        ├─ prisma/          #   PrismaModule / PrismaService
│        └─ posts/           #   GET /posts , POST /posts
│
└─ packages/
   └─ db/                    # ■ @ppp/db — DB 레이어 (api 전용)
      ├─ prisma/schema.prisma
      ├─ prisma.config.ts    #   Prisma 7 설정 파일
      ├─ src/index.ts        #   createPrismaClient() + 타입 재export
      ├─ src/generated/      #   prisma generate 산출물  ← git 제외
      └─ dist/               #   tsc 빌드 산출물        ← git 제외
```

### 왜 이 구조인가
- **모노레포**: 프론트/백이 `Post` 같은 타입을 공유하고, 설치·실행을 루트에서 한 번에 관리합니다.
- **`packages/db` 분리**: 스키마와 Prisma 클라이언트를 한 곳에 모아 둡니다.
- **경계 규칙**: `packages/db` 는 **`apps/api` 만** 사용합니다.
  `apps/web` 은 DB 에 직접 붙지 않고 **반드시 `apps/api` 를 HTTP 로 호출**합니다.
  (DB 비밀번호가 프론트엔드 번들로 새는 것을 막기 위함)

---

## Step 1. 루트 초기화

```powershell
cd C:\Users\ogaeng\Desktop\ppp
git init
mkdir apps, packages        # ← 먼저 만들어야 합니다 (아래 주의 참고)
```

> **주의**: `apps` 폴더를 먼저 만들지 않고 `create-next-app apps/web` 을 실행하면
> `The application path is not writable` 에러가 납니다. 권한 문제가 아니라
> create-next-app 이 **대상의 상위 폴더가 존재하는지** 검사하기 때문입니다.

이어서 루트에 다음 4개 파일을 만듭니다 — 내용은 저장소의 실제 파일을 참고하세요.

| 파일 | 역할 |
|---|---|
| `package.json` | `private: true` + 모든 스크립트 허브 |
| `pnpm-workspace.yaml` | `apps/*`, `packages/*` 글롭 + 빌드 허용 목록 |
| `tsconfig.base.json` | 공통 컴파일러 옵션 |
| `.gitignore` | `node_modules`, `.env`, `dist`, `.next`, 생성 클라이언트 |

**`pnpm-workspace.yaml`**
```yaml
packages:
  - 'apps/*'
  - 'packages/*'

# pnpm 10 은 의존성의 설치 스크립트를 기본 차단합니다.
onlyBuiltDependencies:
  - prisma
  - '@prisma/engines'

ignoredBuiltDependencies:
  - sharp
  - unrs-resolver
```

> **pnpm 11 이상으로 올릴 때**: `onlyBuiltDependencies` / `ignoredBuiltDependencies` 가
> 제거되고 `allowBuilds` 맵 문법으로 바뀝니다.
> ```yaml
> allowBuilds:
>   prisma: true
>   '@prisma/engines': true
>   sharp: false
>   unrs-resolver: false
> ```

## Step 2. 프론트엔드 설치 (Next.js)

```powershell
pnpm create next-app@latest apps/web --ts --tailwind --eslint --app --src-dir `
  --import-alias "@/*" --no-cache-components --no-agent-feedback `
  --use-pnpm --skip-install --disable-git --yes
```

| 플래그 | 이유 |
|---|---|
| `--skip-install` | 설치는 마지막에 루트에서 `pnpm install` 로 한 번에 |
| `--disable-git` | 루트에서 이미 `git init` 했으므로 중첩 저장소 방지 |
| `--no-cache-components` | Next 16 의 실험적 기능. 입문 단계에서는 끄는 쪽이 단순함 |
| `--yes` | 대화형 프롬프트 없이 진행 |

**설치 직후 반드시 할 일 2가지**
```powershell
# ① create-next-app 이 만든 중첩 워크스페이스 파일 삭제 (모노레포가 깨집니다)
Remove-Item apps\web\pnpm-workspace.yaml
# ② apps/web/package.json 의 "packageManager" 필드 삭제 (루트에만 두기)
```
(① 안의 `ignoredBuiltDependencies: [sharp, unrs-resolver]` 는 루트 `pnpm-workspace.yaml` 로 옮깁니다)

## Step 3. 백엔드 설치 (NestJS)

```powershell
pnpm dlx @nestjs/cli@12 new api --directory apps/api `
  --package-manager pnpm --skip-install --skip-git --strict --no-observe
```

`--no-observe` 는 관측(Observability) SDK 설치 여부를 묻는 프롬프트를 건너뜁니다.

**중요**: NestJS 12 는 **ESM** 프로젝트로 생성됩니다 (`"type": "module"`, `module: "nodenext"`).
그래서 내부 import 에 **`.js` 확장자를 반드시** 붙여야 합니다.
```ts
import { AppModule } from './app.module.js';   // ✅
import { AppModule } from './app.module';      // ❌ 런타임 에러
```
`packages/db` 도 같은 이유로 ESM 으로 맞춰 둡니다.

`apps/api/package.json` 스크립트에 루트에서 호출할 별칭을 추가합니다:
```json
"dev": "nest start --watch"
```

## Step 4. DB 패키지 만들기 (`packages/db`)

이 패키지만 손으로 만듭니다. 4개 파일이 필요합니다.

**① `packages/db/package.json`** — ESM + 빌드 산출물을 내보냄
```json
{
  "name": "@ppp/db",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "generate": "prisma generate",
    "build": "prisma generate && tsc -p tsconfig.json",
    "migrate": "prisma migrate dev",
    "deploy": "prisma migrate deploy",
    "studio": "prisma studio"
  },
  "dependencies": {
    "@prisma/adapter-pg": "7.10.1",
    "@prisma/client": "7.10.1"
  },
  "devDependencies": {
    "@types/node": "^24.0.0",
    "dotenv": "^18.0.9",
    "prisma": "7.10.1",
    "typescript": "^6.0.2"
  }
}
```
> `pg` 는 따로 설치하지 않습니다 — `@prisma/adapter-pg` 가 의존성으로 포함합니다.

**② `packages/db/prisma/schema.prisma`**
```prisma
generator client {
  provider               = "prisma-client"
  output                 = "../src/generated/prisma"
  runtime                = "nodejs"
  moduleFormat           = "esm"
  generatedFileExtension = "ts"
  importFileExtension    = "js"
}

datasource db {
  provider = "postgresql"
}

model Post {
  id        Int      @id @default(autoincrement())
  title     String
  content   String?
  published Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("posts")
}
```

Prisma 7 에서 바뀐 점 3가지 — **여기서 가장 많이 막힙니다**:
1. 제너레이터가 `prisma-client-js` → **`prisma-client`** 로 바뀌고 **`output` 이 필수**입니다.
   그리고 **TypeScript 소스를 생성**하므로 `src/` 안에 두어야 `tsc` 빌드에 포함됩니다.
2. `datasource` 블록에 **`url` 을 쓸 수 없습니다.** 쓰면 이렇게 실패합니다:
   ```
   error: The datasource property `url` is no longer supported in schema files.
   ```
   → 마이그레이션용 URL 은 `prisma.config.ts` 로, 런타임 URL 은 어댑터로 넘깁니다.
3. **드라이버 어댑터가 필수**입니다. `new PrismaClient()` 를 어댑터 없이 호출하면 에러입니다.

**③ `packages/db/prisma.config.ts`** — Prisma 7 의 표준 설정 파일
```ts
import { config } from 'dotenv';
import { defineConfig } from 'prisma/config';

// Prisma 7 부터 .env 자동 로딩이 없어졌습니다. 루트 .env 를 명시적으로 읽습니다.
config({ path: '../../.env' });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  // 마이그레이션은 커넥션 풀러를 우회해야 하므로 DIRECT_URL 사용
  datasource: { url: process.env.DIRECT_URL ?? '' },
});
```

**④ `packages/db/src/index.ts`** — 클라이언트 팩토리
```ts
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client.js';

export * from './generated/prisma/client.js';   // Post 등 모델 타입 재export

export function createPrismaClient(
  connectionString: string | undefined = process.env.DATABASE_URL,
): PrismaClient {
  if (!connectionString) throw new Error('DATABASE_URL 이 설정되지 않았습니다.');
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}
```

**⑤ `packages/db/tsconfig.json`**: `module`/`moduleResolution` 을 `nodenext`,
`rootDir: src`, `outDir: dist`, `declaration: true`, `types: ["node"]`.

## Step 5. 의존성 연결 후 설치

`apps/api/package.json` 의 `dependencies` 에 추가:
```json
"@nestjs/config": "^12.0.1",
"@ppp/db": "workspace:*",
"class-transformer": "^0.5.1",
"class-validator": "^0.14.1"
```
`workspace:*` 프로토콜을 **명시**해야 로컬 패키지로 확실히 링크됩니다.

```powershell
pnpm install
```

설치 끝에 이런 경고가 나오면:
```
Ignored build scripts: @prisma/engines@7.10.1.
Run "pnpm approve-builds" to pick which dependencies should be allowed to run scripts.
```
→ 해당 패키지를 `pnpm-workspace.yaml` 의 `onlyBuiltDependencies` 에 추가하고 `pnpm install` 재실행.
(`@prisma/engines` 는 마이그레이션 엔진 바이너리를 내려받으므로 **반드시 허용**해야 합니다)

## Step 6. 앱 코드 연결

**백엔드** (`apps/api/src/`)
- `main.ts` — 포트 **3001**, `app.enableCors({ origin: CORS_ORIGIN })`
- `app.module.ts` — `ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../../.env'] })`
  → 앱 전용 `.env` 와 루트 `.env` 를 **둘 다** 읽으므로 DB URL 을 중복 작성하지 않아도 됩니다.
- `prisma/prisma.service.ts` — `extends PrismaClient` 가 아니라 **합성**:
  ```ts
  @Injectable()
  export class PrismaService implements OnModuleInit, OnModuleDestroy {
    readonly client: Db;
    constructor(config: ConfigService) {
      this.client = createPrismaClient(config.get<string>('DATABASE_URL'));
    }
    async onModuleInit()    { await this.client.$connect(); }   // 실패해도 warn 만
    async onModuleDestroy() { await this.client.$disconnect(); }
  }
  ```
  사용법은 `prisma.client.post.findMany()` 입니다.
- `posts/` — `GET /posts`, `POST /posts`

**프론트엔드** (`apps/web/src/`)
- `lib/api.ts` — `NEXT_PUBLIC_API_URL` 기반 fetch 헬퍼(예외를 던지지 않고 결과 객체 반환)
- `app/page.tsx` — 서버 컴포넌트에서 `/posts` 를 호출해 목록 렌더링.
  API 가 안 떠 있으면 해결 방법 안내를 보여줍니다.

---

## Step 7. Supabase 연결 — `.env` 채우기

**지금 해야 하는 유일한 수동 작업입니다.**

### 7-1. Supabase 프로젝트 생성
1. <https://supabase.com> 접속 → 로그인 (GitHub 계정으로 가입 가능)
2. **New project** 클릭
3. 입력값
   - **Name**: 아무 이름 (예: `ppp`)
   - **Database Password**: 💡 **이 비밀번호를 꼭 메모하세요.** 나중에 다시 볼 수 없고, 재설정만 가능합니다.
   - **Region**: `Northeast Asia (Seoul)` — 한국에서 가장 빠릅니다
4. **Create new project** → 프로비저닝 1~2분 대기

### 7-2. 연결 문자열 복사
1. 프로젝트 화면 상단의 **[Connect]** 버튼 클릭
2. **ORMs → Prisma** 탭을 선택하면 아래 두 값이 바로 나옵니다
   - **Transaction pooler** (포트 `6543`) → `DATABASE_URL` 로
   - **Session pooler** (포트 `5432`) → `DIRECT_URL` 로

### 7-3. 루트 `.env` 수정

```dotenv
# ① 앱 런타임용 — Transaction pooler (6543) + pgbouncer=true
DATABASE_URL="postgresql://postgres.abcdefghijklmnop:내비밀번호@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"

# ② 마이그레이션 / Studio 용 — Session pooler (5432)
DIRECT_URL="postgresql://postgres.abcdefghijklmnop:내비밀번호@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres"
```

| 항목 | 설명 |
|---|---|
| 사용자명 | `postgres.<프로젝트-ref>` 형식 (풀러 사용 시 ref 가 붙습니다) |
| 호스트 | **대시보드에서 그대로 복사하세요.** 리전 이름으로 추측해서 조합하면 틀립니다 |
| `?pgbouncer=true` | 트랜잭션 풀러에서 prepared statement 를 끕니다. **없으면 런타임 에러** |
| `connection_limit=1` | 서버리스/다중 인스턴스 환경에서 커넥션 고갈 방지 |
| 왜 URL 이 2개인가 | `prisma migrate` 는 풀러를 거치면 동작하지 않아 별도 연결이 필요합니다 |

> **비밀번호에 특수문자가 있으면 URL 인코딩**하세요. `@` → `%40`, `#` → `%23`, `/` → `%2F`, `?` → `%3F`
> 반면 `!` `$` `*` `-` `_` `.` `~` 는 그대로 써도 됩니다 (URL 에서 허용되는 문자).
> 헷갈리면 `pnpm diagnose` 가 실제 접속까지 확인해 줍니다.
>
> **직접 연결(`db.<ref>.supabase.co:5432`)은 권하지 않습니다** — 무료 플랜에서 IPv6 전용이라
> 환경에 따라 `P1001` 로 실패합니다. `DIRECT_URL` 에도 세션 풀러(5432)를 쓰세요.

### 7-4. 마이그레이션 실행

```powershell
pnpm db:migrate        # 이름을 물어보면 init 같은 이름 입력
```

성공하면 `packages/db/prisma/migrations/` 에 SQL 이 생기고,
Supabase 대시보드 **Table Editor** 에 `posts` 테이블이 보입니다.

---

## Step 8. 개발 서버 실행

모든 명령은 **루트(`ppp/`)** 에서 실행합니다.

```powershell
pnpm dev
```
→ Next.js **http://localhost:3000** + NestJS **http://localhost:3001** 동시 실행

### 명령어 모음

| 목적 | 명령어 |
|---|---|
| **환경 진단 (막히면 제일 먼저)** | `pnpm diagnose` |
| 프론트 + 백엔드 동시 실행 | `pnpm dev` |
| 프론트만 | `pnpm dev:web` → http://localhost:3000 |
| 백엔드만 | `pnpm dev:api` → http://localhost:3001 |
| 전체 프로덕션 빌드 | `pnpm build` |
| 스키마 변경 반영 (마이그레이션 생성) | `pnpm db:migrate` |
| 클라이언트만 재생성 | `pnpm db:generate` |
| DB 데이터 GUI 로 보기 | `pnpm db:studio` |
| 배포 환경 마이그레이션 적용 | `pnpm db:deploy` |

> `pnpm dev` / `pnpm build` 는 **항상 `@ppp/db` 를 먼저 빌드**합니다.
> Prisma 가 생성하는 클라이언트는 TypeScript 소스이므로, 빌드하지 않으면
> `apps/api` 컴파일이 `Cannot find module '@ppp/db'` 로 실패합니다.

### 동작 확인

**막히면 먼저 이것부터 — 한 번에 전부 진단합니다:**

```powershell
pnpm diagnose
```
```
 1. ✅ .env 변수            DATABASE_URL / DIRECT_URL 발견
 2. ✅ DATABASE_URL 형식    aws-0-ap-northeast-2.pooler.supabase.com:6543 (user postgres.xxx)
 3. ✅ DIRECT_URL 형식      aws-0-ap-northeast-2.pooler.supabase.com:5432 (user postgres.xxx)
 4. ✅ DNS 해석             aws-0-ap-northeast-2.pooler.supabase.com → 13.124.111.232
 5. ✅ DB 접속 (:6543)      99ms
 6. ✅ DB 접속 (:5432)      34ms
 7. ✅ posts 테이블          존재 (0 rows)
 8. ✅ web (:3000)          실행중
 9. ✅ api (:3001)          실행중
10. ✅ GET /health          {"ok":true,"db":"up"}
```
`.env` 로드 → URL 형식(플레이스홀더 잔존 여부) → DNS → 양쪽 포트 실제 접속 →
`posts` 테이블 존재 → dev 서버 포트 → `/health` 까지 순서대로 확인하고,
실패한 항목마다 해결 방법을 바로 알려줍니다. **DB 에는 `SELECT` 만 하는 읽기 전용**입니다.

> 스크립트 이름이 `doctor` 가 아닌 이유: `pnpm doctor` 는 **pnpm 내장 명령어**라서
> 같은 이름으로 만들면 package.json 스크립트가 무시되고 아무 출력도 나오지 않습니다.

개별 확인:

```powershell
# 1) 백엔드 + DB 왕복 확인
curl http://localhost:3001/health
#    → {"ok":true,"db":"up"}            연결 성공
#    → {"ok":false,"db":"down",...}     .env 확인 필요

# 2) 글 하나 생성
curl -X POST http://localhost:3001/posts -H "Content-Type: application/json" -d "{\"title\":\"첫 글\",\"content\":\"안녕하세요\"}"

# 3) 목록 확인
curl http://localhost:3001/posts
```

그리고 브라우저에서 **http://localhost:3000** 을 새로고침하면
방금 만든 글이 목록에 보입니다 → **프론트 → 백엔드 → Prisma → Supabase** 전 구간 연결 완료.

---

---

## ⭐ 가장 많이 겪는 문제: 화면에 `fetch failed`

localhost:3000 을 열었는데 이런 화면이 나오는 경우입니다.

```
API 응답을 받지 못했습니다.
fetch failed
```

**원인은 `.env` 가 아니라 기동 순서입니다.** `pnpm dev` 는 두 서버를 동시에 띄우는데
준비 속도가 크게 다릅니다.

| | 준비 시간 |
|---|---|
| `next dev` (Turbopack) | **~1초** |
| `nest start --watch` | TypeScript 전체 컴파일 후 → **5~15초** |

이 사이에 브라우저를 열면 서버 컴포넌트의 fetch 가 연결 거부(`ECONNREFUSED`)로 실패하고,
Node 는 이것을 뭉뚱그려 `fetch failed` 로만 알려줍니다.

**해결**: 그냥 기다리면 됩니다.
- 현재 코드는 네트워크 실패 시 **자동으로 3회 재시도**(600ms 간격)하고,
  그래도 안 되면 **3초마다 화면을 자동 갱신**합니다. 백엔드가 뜨는 순간 목록으로 전환됩니다.
- 터미널에 `apps/api dev: 🚀 API ready on http://localhost:3001` 줄이 보이면 준비 완료입니다.
- 30초 넘게 같은 화면이면 `pnpm diagnose` 를 실행하세요.

화면 안내가 두 가지로 나뉘니 구분해서 보세요.

| 화면 색 | 의미 | 봐야 할 곳 |
|---|---|---|
| 🔵 파란 박스 "백엔드가 아직 준비되지 않았습니다" | 백엔드에 **아예 닿지 못함** | 기다리기 / `pnpm dev:api` 로 에러 확인 |
| 🟡 노란 박스 "백엔드는 떴지만 요청이 실패했습니다" | 백엔드는 응답, **DB 쪽 문제** | 루트 `.env`, `pnpm db:migrate`, `pnpm diagnose` |

> `pnpm dev` 가 이미 떠 있는 상태에서 또 실행하면 포트 충돌로 혼란이 생깁니다.
> `pnpm diagnose` 의 8·9번 항목으로 먼저 확인하세요.

---

## 자주 겪는 문제

| 증상 | 원인 / 해결 |
|---|---|
| 화면에 `fetch failed` | 백엔드 컴파일 대기. **`.env` 문제 아님** → [위 섹션](#-가장-많이-겪는-문제-화면에-fetch-failed) |
| `pnpm doctor` 를 만들었는데 출력이 없음 | `doctor` 는 pnpm 내장 명령어. 다른 이름을 쓰세요 (이 저장소는 `pnpm diagnose`) |
| `The datasource property 'url' is no longer supported` | Prisma 7 변경사항. `schema.prisma` 의 `url = env(...)` 줄을 지우고 `prisma.config.ts` 로 옮기세요 |
| `PrismaClient requires a driver adapter` | `new PrismaClient()` 를 어댑터 없이 호출. `createPrismaClient()` 를 쓰세요 |
| `Ignored build scripts: ...` 경고 | `pnpm-workspace.yaml` 의 `onlyBuiltDependencies` 에 추가 후 `pnpm install` |
| `Cannot find module '@ppp/db'` | `pnpm db:build` 를 먼저 실행하세요 |
| `Cannot find type definition file for 'node'` | 해당 패키지에 `@types/node` 가 없습니다 |
| `P1001 Can't reach database server` | ① 호스트/포트 오타 ② 비밀번호 URL 인코딩 ③ 직접 연결(IPv6) 대신 세션 풀러 사용 |
| `Invalid URL` (`/health` 응답) | `.env` 가 아직 플레이스홀더(`[PROJECT-REF]`) 상태입니다 |
| prepared statement 관련 에러 | `DATABASE_URL` 에 `?pgbouncer=true` 가 빠졌습니다 |
| 브라우저 콘솔에 CORS 에러 | `apps/api/.env` 의 `CORS_ORIGIN` 이 프론트 주소와 일치하는지 확인 |
| NestJS 에서 `Cannot find module './x'` | ESM 프로젝트입니다. import 에 `.js` 확장자를 붙이세요 |
| 설치하니 Prisma 8 RC 가 깔림 | 버전을 명시하세요: `prisma@7.10.1` |

## 다음 단계로 할 만한 것

- `packages/db/prisma/schema.prisma` 에 실제 모델 추가 → `pnpm db:migrate`
- `packages/shared` 패키지를 만들어 프론트/백 공용 DTO·타입 분리
- Supabase Auth 연동 (NestJS 에서 JWT 검증 가드 추가)
- 배포: `apps/web` → Vercel, `apps/api` → Railway/Render/Fly.io
  (배포 시 마이그레이션은 `pnpm db:deploy`, 런타임은 `DATABASE_URL` 만 필요)
