Next.js + NestJS + Prisma + Supabase(PostgreSQL) 풀스택 모노레포

```
apps/web        Next.js 16  (App Router, Tailwind v4)   → http://localhost:3000
apps/api        NestJS 12   (ESM)                       → http://localhost:3001
packages/db     @ppp/db — Prisma 7 스키마 + 클라이언트
```


| 명령어 | 설명 |
|---|---|
| `pnpm diagnose` | **환경 진단** — .env/DNS/DB접속/테이블/포트/health 일괄 확인 (읽기 전용) |
| `pnpm dev` | web(:3000) + api(:3001) 동시 실행 |
| `pnpm dev:web` / `pnpm dev:api` | 개별 실행 |
| `pnpm build` | 전체 프로덕션 빌드 |
| `pnpm db:migrate` | 스키마 변경 → 마이그레이션 생성/적용 |
| `pnpm db:generate` | Prisma 클라이언트만 재생성 |
| `pnpm db:studio` | DB 데이터 GUI |
