# docker-next-trpc-app

Next.js 16(App Router) + **React 19**, **NextAuth.js**, **tRPC 11**, **Drizzle ORM**, **PostgreSQL**, **TanStack Query**, **shadcn/ui**, **Tailwind CSS v4** 로 만든 학습용 풀스택 보드입니다.

참고한 레거시 스택: `docker_app`(NestJS + Vite + TypeORM)의 **로그인·게시글 CRUD·이미지 업로드** 를 유사한 UX로 옮겼습니다. 인증은 **NextAuth.js Credentials + JWT 세션 쿠키**로 단순화했습니다.

---

## 폴더 구조와 역할

처음 클론했을 때 **어느 디렉터리가 무엇을 담당하는지** 한 번에 보기 위한 표와 트리입니다. `src/` 안의 짧은 트리만 필요하면 [10. 프로젝트 구조](#10-프로젝트-구조)도 같이 보면 된다.

### 저장소 루트(최상위)

| 경로 | 역할 |
|------|------|
| `package.json` / `package-lock.json` | 의존성·npm 스크립트(`dev`, `build`, `db:*` 등). |
| `next.config.ts` | Next.js 설정. Docker/Windows 환경에서 감시 불안정 시 `watchOptions.pollIntervalMs` 등. |
| `tsconfig.json` | TypeScript 경로·컴파일 옵션. |
| `components.json` | shadcn/ui 생성기 설정. |
| `docker-compose.yml` | **릴리즈용** Compose(앱 + DB 등). |
| `docker-compose.dev.yml` | **개발용** Compose(HMR·볼륨 마운트 등). |
| `drizzle.config.ts` | Drizzle Kit(`db:generate`, `db:push`, `db:studio`)이 참조하는 DB 연결·스키마 경로. |
| `drizzle/` | 마이그레이션 산출물·메타(`meta/`). 스키마 변경 후 `db:generate`로 쌓인다. |
| `scripts/` | 유지보수 스크립트(예: `seed-random-posts.ts` — 테스트 글 시드). |
| `.env.example` | 필수·권장 환경 변수 샘플. 실제 값은 `.env`(로컬·비밀 — 커밋하지 않음). |
| `uploads/` | 기본 업로드 루트(로컬). `UPLOADS_DIR` 미설정 시 `src/lib/env.ts`가 프로젝트 루트 `uploads/`를 쓴다. Docker에서는 보통 컨테이너 경로로 마운트. |

### `src/` — 애플리케이션 소스

| 경로 | 역할 |
|------|------|
| `src/app/` | **App Router**: 페이지(`page.tsx`), 레이아웃, `loading.tsx` / `error.tsx`, **Route Handlers**(`api/**/route.ts`), 업로드 파일 서빙(`uploads/[[...path]]`). URL과 폴더 구조가 대응한다. |
| `src/components/` | 재사용 UI·조각. `ui/`(shadcn 프리미티브), `scaffold/`(페이지 뼈대·스켈레톤), `forms/`, `posts/`, `error-boundary/`, `trpc-dehydrated-state-boundary`(RSC→클라이언트 TanStack hydrate), `site-header`·`require-auth` 등. |
| `src/hooks/` | 클라이언트 전용 React 훅(예: 무한 스크롤용 `IntersectionObserver`). |
| `src/lib/` | 앱 전역 유틸·설정: `env`([Zod로 `process.env` 검증](#142-zod-검증)), NextAuth `auth-options`, 클라이언트용 `auth-api`·`http-request-log`, `flow-log`, `query-cache`, `trpc-server-access-log`(서버에서만 import — 터미널 tRPC 풀이 로그) 등. |
| `src/server/` | **서버 전용** 도메인: `db/`(Drizzle 스키마·연결), `services/`(비즈니스 로직), `trpc/`(라우터·프로시저·컨텍스트·`prefetch-post-list` 등 RSC용 프리패치), `upload/`(이미지 저장 헬퍼). 클라이언트 컴포넌트에서 직접 import하지 않는다. |
| `src/trpc/` | 브라우저에서 쓰는 **tRPC + QueryClient** 조립: `TrpcProvider`, `httpBatchLink`, 세션 쿠키 포함 `fetch`, RSC dehydrate와 맞춘 **superjson `serializeData` / `deserializeData`**. |
| `src/next-auth.d.ts` | NextAuth `Session` / `User` 타입 확장(JWT 클레임과 맞춤). |

### `src/app/` 안만 조금 더

| 경로 | 역할 |
|------|------|
| `app/api/auth/` | NextAuth(`[...nextauth]`), 회원가입 REST `register`. |
| `app/api/trpc/` | tRPC HTTP 어댑터 — `/api/trpc/*` 요청을 `appRouter`로 넘김. |
| `app/api/upload/` | 멀티파트 업로드(아바타·게시글 이미지). |
| `app/api/health/` | 헬스 체크 등 단순 엔드포인트. |
| `app/uploads/` | DB에 저장된 `/uploads/...` 경로의 **파일 응답**(정적 서빙). |
| `app/login`, `register`, `posts`, `todos`, `profile` | 각 화면 라우트. 동적 세그먼트는 `posts/[id]` 등. |

```
프로젝트 루트
├── docker-compose.yml / docker-compose.dev.yml
├── drizzle.config.ts
├── drizzle/
├── scripts/
├── src/
│   ├── app/              # 라우트·API·업로드 서빙
│   ├── components/       # UI·스캐폴드·에러 경계
│   ├── hooks/
│   ├── lib/              # env, 인증, 로그, 캐시 설정
│   ├── server/           # DB, 서비스, tRPC 서버, 업로드 로직
│   ├── trpc/             # tRPC React 프로바이더
│   └── next-auth.d.ts
├── uploads/              # (로컬 기본) 업로드 저장소
├── package.json
└── next.config.ts
```

---

## 목차

[폴더 구조와 역할](#폴더-구조와-역할)

1. [아키텍처 개요](#1-아키텍처-개요)
2. [로딩·에러 처리 (Suspense / error boundary)](#2-로딩에러-처리-suspense--error-boundary)
3. [docker_app 과의 대응](#3-docker_app-과의-대응)
4. [로컬 개발 (Docker 없이)](#4-로컬-개발-docker-없이)
5. [Docker: 개발 모드](#5-docker-개발-모드)
6. [Docker: 릴리즈 모드](#6-docker-릴리즈-모드)
7. [환경 변수](#7-환경-변수)
8. [데이터베이스](#8-데이터베이스) · [8.1 Drizzle 개요](#81-drizzle-개요)
9. [주요 요청 흐름](#9-주요-요청-흐름)
10. [프로젝트 구조](#10-프로젝트-구조)
11. [브라우저에서 세션 쿠키 확인](#11-브라우저에서-세션-쿠키-확인)
12. [tRPC 주소 설정과 사용](#12-trpc-주소-설정과-사용)
13. [캐시 전략 (TanStack Query + tRPC HTTP)](#13-캐시-전략-tanstack-query--trpc-http) · [13.6 Prefetch·HydrationBoundary](#136-게시판-목록-서버-프리패치와-hydrationboundary) · [13.9 할 일 useOptimistic](#139-할-일-목록과-react-19-useoptimistic-낙관적-ui)
14. [tRPC를 쓰는 이유와 대안과의 차이](#14-trpc를-쓰는-이유와-대안과의-차이) · [14.2 Zod 검증](#142-zod-검증)
15. [`export const dynamic = "force-dynamic"`](#15-export-const-dynamic--force-dynamic)
16. [서버 컴포넌트와 클라이언트 컴포넌트 (이 프로젝트 기준)](#16-서버-컴포넌트와-클라이언트-컴포넌트-이-프로젝트-기준)
17. [렌더링 전략 (CSR, SSR, SSG, RSC, 정적, ISR)](#17-렌더링-전략-csr-ssr-ssg-rsc-정적-isr)
18. [리팩터링 메모 · 추후 학습·확장](#18-리팩터링-메모--추후-학습확장)

---

## 1. 아키텍처 개요

- **UI**: App Router + 클라이언트에서 TanStack Query(`@trpc/react-query`)와 **`useSuspenseQuery` / `useSuspenseInfiniteQuery`** 로 데이터를 가져옵니다. 게시판 목록은 RSC에서 **`post.listInfinite` 첫 페이지를 프리패치**한 뒤 **`HydrationBoundary`** 로 클라이언트 캐시에 넣는 학습용 경로도 포함합니다([13.6절](#136-게시판-목록-서버-프리패치와-hydrationboundary)).
- **인증**: **NextAuth.js v4** — `Credentials` 프로바이더로 이메일/비밀번호 검증, **JWT 세션** 쿠키(기본 7일). `SessionProvider` + `useSession` / `signIn` / `signOut`.
- **API (타입 공유)**: `src/server/trpc` 라우터. 서버 컨텍스트는 `getServerSession(authOptions)` 로 세션을 읽고 Drizzle에서 사용자를 다시 로드합니다.
- **REST 보조**
  - `POST /api/auth/register` — 계정만 생성 (이후 클라이언트에서 `signIn('credentials')`).
  - `POST /api/upload/*` — multipart (세션 쿠키로 인증).
  - `GET /api/auth/[...nextauth]` — NextAuth 핸들러.
- **정적 업로드**: DB에는 `/uploads/...` 경로만 저장, `app/uploads/[[...path]]/route.ts` 가 파일을 반환합니다.

---

## 2. 로딩·에러 처리 (Suspense / error boundary)

| 방식 | 위치·역할 |
|------|-----------|
| **`loading.tsx`** | `app/`, `posts/`, `posts/[id]/`, `posts/[id]/edit/`, `profile/` — 라우트 전환 시 Next가 스켈레톤을 보여 줌 |
| **`error.tsx` / `global-error.tsx`** | 세그먼트·루트 예외 시 복구 UI (`reset`) |
| **`<Suspense fallback={…}>`** | 게시판 목록·상세·수정·프로필에서 tRPC `useSuspenseQuery` 와 짝을 이루는 **세부 스켈레톤** (`PostListSkeleton` 등) |
| **`QueryErrorBoundary`** | `@tanstack/react-query` 의 `useQueryErrorResetBoundary` + `react-error-boundary` — Suspense 쿼리가 던진 오류를 잡고 “다시 시도” 시 쿼리 리셋 |
| **`PageShell`** | 제목·설명·액션 슬롯이 있는 간단한 페이지 뼈대 |

게시판·상세·수정·프로필 쪽 라우트는 **`export const dynamic = "force-dynamic"`** 을 켜 두었습니다. 무엇을 하는지는 [15절](#15-export-const-dynamic--force-dynamic)에서 자세히 설명합니다. tRPC 클라이언트는 서버에서 **`NEXT_PUBLIC_APP_URL`**(또는 `VERCEL_URL`) 기준 **절대 URL**로 `/api/trpc` 를 호출합니다.

---

## 3. docker_app 과의 대응

| docker_app (Nest + Vite) | 이 프로젝트 |
|---------------------------|------------|
| `POST /api/auth/login` 등 | NextAuth `signIn('credentials')` + `/api/auth/[...nextauth]` |
| `POST /api/auth/register` | `POST /api/auth/register` (계정 생성만) |
| `GET/PATCH /api/auth/me` | tRPC `auth.me`, `auth.updateName` |
| `POST /api/auth/me/avatar` | `POST /api/upload/avatar` |
| 게시글 API | tRPC `post.*` + `POST /api/upload/post-image` |
| `/uploads/*` | `GET /uploads/*` |
| TypeORM 엔티티 | Drizzle `users`, `posts`, `todos`([§8](#8-데이터베이스)) |

---

## 4. 로컬 개발 (Docker 없이)

### 4.1 준비

1. Node 22 권장.
2. PostgreSQL 16.
3. `.env` — `.env.example` 참고. **`NEXTAUTH_SECRET`**, **`NEXTAUTH_URL`** 필수에 가깝습니다.

### 4.2 설치 및 DB

```bash
npm ci
npm run db:push
```

### 4.3 개발 서버

```bash
npm run dev
```

`http://localhost:3000` — `/posts`, `/login`, `/register`, `/profile`.

### 4.4 콘솔 흐름 로그 (`[flow:*]`)

학습용으로 주요 단계에 `flowLog`가 박혀 있습니다(`src/lib/flow-log.ts`). 접두사 **`[flow:태그]`** 로 필터하기 쉽습니다.

- **`actionLog`** (`flow-log.ts`): 버튼·폼 제출·파일 선택 등 **사용자가 직접 유발한 동작**만 **`[user-action:태그]`** 로 남깁니다. 콘솔 필터에 `user-action` 을 쓰면 “어떤 클릭/제출 다음에 HTTP가 나갔는지”를 맞추기 좋습니다.
- **브라우저** DevTools 콘솔: tRPC `fetch`, 폼 action, 무한 스크롤, 세션 가드 등.
- **터미널**(Next 서버 프로세스): RSC `page.tsx` 진입, tRPC `createTRPCContext` 등.
- **tRPC 인입 HTTP**(Docker/Next 액세스 로그 직후): `src/lib/trpc-server-access-log.ts`가 **`[trpc.server]`** + `util.inspect` 로 `input=` 퍼센트 인코딩·배치·superjson(void) 등을 풀어 줍니다(`api/trpc` Route Handler의 `after()`에서만 호출 — 클라이언트 번들 미포함).

**HTTP 요청/응답**은 `src/lib/http-request-log.ts`에서 묶어서 남깁니다. 같은 순번 **`요청 #n` / `응답 #n`** 으로 짝을 맞출 수 있고, **`status` / `statusText` / `ok`** 와 본문 미리보기(길면 잘림)가 포함됩니다. **브라우저** DevTools에서는 `%c` 스타일로 태그(회색)·**요청(파랑)**·**응답 2xx(초록) / 4xx(주황) / 5xx(빨강)**·**fetch 실패(빨강)** 이 구분됩니다. **Node(Next 서버)** 터미널에서는 ANSI 색으로 비슷하게 구분됩니다. tRPC는 태그 **`trpc-http`**, 회원가입·업로드 REST는 **`rest-auth`**, **`rest-upload-*`** 등입니다. JSON 본문은 필드명에 `password` 등이 있으면 **`[REDACTED]`** 로 가립니다.

`NODE_ENV === "development"` 일 때만 기본 출력됩니다. 프로덕션 빌드에서도 보려면 `.env`에 **`NEXT_PUBLIC_DEBUG_FLOW=1`** (`.env.example` 참고).

### 4.5 DB만 Docker, Next는 로컬 (`npm run dev`)

Postgres만 Compose로 띄우고 앱은 호스트에서 돌릴 때는 **DB 주소가 컨테이너 이름(`db`)이 아니라 `localhost`** 여야 합니다.

1. **`.env`** — `.env.example` 기준으로 두되, 아래를 맞춥니다.
   - `DB_HOST=localhost`, `DB_PORT=5432`
   - `DB_USERNAME` / `DB_PASSWORD` / `DB_NAME` 은 `docker-compose.dev.yml` 의 `db` 서비스 기본값(`board`)과 동일하게
   - `NEXTAUTH_URL=http://localhost:3000`
   - **`NEXT_PUBLIC_APP_URL=http://localhost:3000`** — SSR에서 tRPC가 절대 URL로 호출할 때 필요
   - `UPLOADS_DIR` 는 비우거나 생략 → 프로젝트 루트의 `uploads/` 사용 (로컬 파일)

2. **DB만 기동** (백그라운드):

   ```bash
   docker compose -f docker-compose.dev.yml up db -d
   ```

   종료: `docker compose -f docker-compose.dev.yml stop db` (데이터 유지). 볼륨까지 지우려면 `... down -v` (주의: DB 데이터 삭제).

3. **스키마 반영·앱** (호스트 터미널):

   ```bash
   npm ci
   npm run db:push
   npm run dev
   ```

`5432` 포트가 이미 쓰이면 Compose의 `ports` 를 바꾸거나, 로컬 다른 Postgres를 끕니다.

---

## 5. Docker: 개발 모드

```bash
docker compose -f docker-compose.dev.yml up --build
```

컨테이너 안에서는 **`npm run dev:docker`** (`next dev --webpack`) 로 띄웁니다. Compose 에서 **`/app/.next` 를 별도 Docker 볼륨으로 빼면** Turbopack/webpack 이 `/app/.next-internal` 등을 감시할 때 경로가 어긋나 **`watch error … No such file`** 과 **HMR 미동작**이 나기 쉬우므로, 개발용 compose 는 **`.next` 를 프로젝트(바인드 마운트) 아래**에 둡니다. `DOCKER_DEV` / `WATCHPACK_POLLING` 과 함께 **`next.config.ts` 의 `watchOptions.pollIntervalMs`** 로 폴링 감시를 켭니다. 실험적으로 Turbopack 을 쓰려면 `npm run dev:docker:turbo` 를 쓰되, 위와 같이 `.next` 분리 볼륨은 쓰지 않는 것이 안전합니다. Windows **`D:\` NTFS 직마운트**는 I/O·감시가 불안정할 수 있어, 가능하면 **WSL2 리눅스 경로**에 저장소를 두세요. `next_dev_dot_next` 볼륨을 쓰던 적이 있다면 한 번 **`docker compose … down` 후 호스트의 `.next` 폴더를 지우고** `up --build` 로 깨끗이 올리면 캐시 꼬임을 줄일 수 있습니다. 스크립트·compose 변경 후에는 **`--build`** 가 필요합니다.

---

## 6. Docker: 릴리즈 모드

```bash
docker compose up --build
```

Compose 에 `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `NEXT_PUBLIC_APP_URL` 이 포함되어 있습니다.

---

## 7. 환경 변수

| 변수 | 설명 |
|------|------|
| `DB_*` | Postgres 연결 |
| `NEXTAUTH_SECRET` | NextAuth JWT·쿠키 서명 (운영 시 `openssl rand -base64 32` 등) |
| `NEXTAUTH_URL` | 사이트 공개 URL (예: `http://localhost:3000`) |
| `NEXT_PUBLIC_APP_URL` | SSR 시 tRPC 절대 URL (Docker/배포 시 권장) |
| `UPLOADS_DIR` | 업로드 루트 (Docker: `/app/uploads`) |

앱 코드에서 읽을 때는 `src/lib/env.ts`가 **`process.env`를 Zod 스키마로 파싱**해 기본값·형 변환을 맞춘다([14.2절 Zod 검증](#142-zod-검증)).

---

## 8. 데이터베이스

PostgreSQL 위에 **[Drizzle ORM](https://orm.drizzle.team)** 과 **Drizzle Kit** 을 쓴다. 스키마는 **TypeScript 코드**로 정의하고, 런타임에는 **`postgres` 드라이버** + `drizzle-orm/postgres-js` 로 쿼리한다.

### 8.1 Drizzle 개요

| 개념 | 설명 |
|------|------|
| **스키마 코드** | `pgTable` 등으로 테이블·컬럼·제약을 TS로 선언 → 컴파일 타임에 타입 추론(`$inferSelect` / `$inferInsert`). |
| **SQL에 가까운 쿼리** | `eq`, `and`, `desc` 같은 빌더 + 필요 시 **관계형 쿼리 API**(`db.query.posts.findMany({ with: { author: true } })`). |
| **Drizzle Kit** | `drizzle.config.ts`를 읽어 **마이그레이션 SQL 생성**(`db:generate`)·**스키마를 DB에 맞춤**(`db:push`)·**Studio** GUI. |
| **이 레포의 선택** | 학습·초기 단계에 맞게 **`db:push`** 로 스키마를 자주 맞추고, `drizzle/` 폴더에는 `db:generate`로 쌓인 마이그레이션 산출물을 둘 수 있다([폴더 구조](#폴더-구조와-역할)). |

ORM 전체 비교는 공식 [Drizzle 문서](https://orm.drizzle.team/docs/overview)를 보면 된다.

### 8.2 Drizzle Kit 설정

`DATABASE_URL`이 있으면 그것을 쓰고, 없으면 `DB_*` 환경 변수로 Postgres URL을 조합한다. **스키마 파일 경로**와 **마이그레이션 출력**(`drizzle/`)이 여기서 고정된다.

```typescript
// drizzle.config.ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url /* … */ },
});
```

### 8.3 테이블·관계 스키마 (발췌)

`users` · `posts` · `todos` 와 FK(`onDelete: "set null"` / `"cascade"`), `relations()` 로 **역방향 조회**(예: 글 → 작성자)를 선언한다.

```typescript
// src/server/db/schema.ts (발췌)
import { relations, sql } from "drizzle-orm";
import { boolean, jsonb, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  // …
});

export const posts = pgTable("posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 200 }).notNull(),
  content: text("content").notNull(),
  imageUrls: jsonb("image_urls").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  authorId: uuid("author_id").references(() => users.id, { onDelete: "set null" }),
  // …
});

export const postsRelations = relations(posts, ({ one }) => ({
  author: one(users, { fields: [posts.authorId], references: [users.id] }),
}));
```

타입 별칭 예: `export type User = typeof users.$inferSelect`.

### 8.4 앱 런타임: `db` 클라이언트

`getDatabaseUrl()`([§7·§14.2](#7-환경-변수))로 연결 문자열을 만들고, **개발 시 HMR**으로 인스턴스가 여러 개 생기지 않도록 `postgres` 클라이언트를 `globalThis`에 한 번 캐시한다.

```typescript
// src/server/db/index.ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getDatabaseUrl } from "@/lib/env";
import * as schema from "./schema";

const client = globalForDb.queryClient ?? postgres(getDatabaseUrl(), { max: 10 });
export const db = drizzle(client, { schema });
```

서비스·tRPC·시드 스크립트는 **`import { db } from "@/server/db"`** 만 하면 된다.

### 8.5 쿼리 예시 (서비스 레이어)

**관계형 API**: `schema`를 `drizzle(client, { schema })`에 넘겼을 때 `db.query.<table>.findMany` 로 `where` / `orderBy` / `with` 를 쓸 수 있다.

**빌더 API**: `db.insert(todos).values({ ... }).returning()` 처럼 SQL 절에 대응하는 체이닝.

```typescript
// src/server/services/todos.ts (발췌)
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { todos } from "@/server/db/schema";

export async function listTodosForUser(userId: string) {
  return db.query.todos.findMany({
    where: eq(todos.userId, userId),
    orderBy: [desc(todos.createdAt), desc(todos.id)],
  });
}

export async function createTodo(input: { title: string }, userId: string) {
  const [row] = await db.insert(todos).values({ title: input.title, userId }).returning();
  return row;
}
```

게시글 목록은 `db.query.posts.findMany({ with: { author: true }, orderBy: … })` 패턴(`src/server/services/posts.ts`)을 쓴다.

### 8.6 npm 스크립트

| 스크립트 | 의미 |
|-----------|------|
| `npm run db:push` | 스키마 TS를 읽어 **현재 DB에 반영**(로컬·학습에 편함). |
| `npm run db:generate` | `drizzle/`에 **마이그레이션 SQL** 생성(버전 관리·CI 배포에 적합). |
| `npm run db:studio` | 브라우저에서 테이블을 보는 Drizzle Studio. |

### 8.7 시드 스크립트

- **글** (`scripts/seed-random-posts.ts`): 사용자가 **최소 1명** 있어야 함. 기본 **20개** 랜덤 글을 `users` 첫 행 작성자로 삽입.
  - Docker: `docker compose -f docker-compose.dev.yml exec app npm run db:seed:posts`
  - 호스트: `npm run db:seed:posts`
  - 개수: `SEED_POST_COUNT=50 npm run db:seed:posts` (상한 500)
- **할 일** (`scripts/seed-random-todos.ts`): 동일하게 첫 사용자 기준, 기본 **10개** — `SEED_TODO_COUNT` 로 조절.

---


## 9. 주요 요청 흐름

### 9.1 세션

1. 로그인 시 NextAuth가 **세션 쿠키**를 설정합니다.
2. 브라우저는 `credentials: 'include'` 로 tRPC·업로드 API에 쿠키를 보냅니다.
3. 서버는 `getServerSession(authOptions)` 로 사용자를 확인합니다.

### 9.2 회원가입

1. `POST /api/auth/register` 로 사용자 생성.
2. `signIn('credentials', { redirect: false })` 로 즉시 세션 확보.

### 9.3 tRPC

1. `post.list` / `post.listInfinite`(커서·무한 스크롤) / `post.byId` 는 공개.
2. `post.create` / `update` / `delete` 및 `auth.*` 는 세션 필요 — `protectedProcedure` 가 `ctx.user` 검사.

### 9.4 프로필 이름·아바타

1. tRPC `auth.updateName` 또는 업로드 후 `useSession().update({ name, image })` 로 JWT 세션 클레임을 맞춥니다.

---

## 10. 프로젝트 구조

저장소 전체·폴더 역할의 개요는 문서 상단 **[폴더 구조와 역할](#폴더-구조와-역할)** 을 본다. 여기서는 `src/` 트리만 짧게 적어 둔다.

```
src/
  app/                    # 페이지, loading/error, Route Handlers
  components/
    error-boundary/       # QueryErrorBoundary (react-error-boundary)
    scaffold/             # PageShell, 스켈레톤들
  hooks/                  # 클라이언트 훅 (예: 무한 스크롤 IntersectionObserver)
  lib/                    # env, flow/http 로그, post-list-config, trpc-server-access-log(서버 전용 import)
  server/
    db/
    services/
    trpc/
  trpc/                   # TrpcProvider (httpBatchLink + superjson)
  next-auth.d.ts          # Session / User 타입 확장
```

---

## 11. 브라우저에서 세션 쿠키 확인

이 프로젝트는 NextAuth.js **JWT 세션**(`src/lib/auth-options.ts` 의 `session.strategy: "jwt"`)이라, 로그인 후 세션 페이로드는 **`next-auth.session-token`(또는 HTTPS용 `__Secure-*`) 쿠키**에 서명된 JWT 형태로 들어갑니다.

### Chrome / Edge

1. **F12** 로 개발자 도구를 연다.
2. **Application**(애플리케이션) 탭 → 왼쪽 **Storage → Cookies** → 실제 접속 origin (예: `http://localhost:3000`).

### 쿠키 이름

| 접속 방식 | 세션 쿠키 이름 |
|-----------|----------------|
| **HTTP** (예: `http://localhost:3000`) | `next-auth.session-token` |
| **HTTPS** | 보통 `__Secure-next-auth.session-token` |

같은 목록에 **`next-auth.csrf-token`**(CSRF용)이 보일 수 있다. 로그인 여부는 **`next-auth.session-token`(또는 위 Secure 이름) 존재 여부**로 확인하면 된다.

### 값의 의미·주의

- 쿠키 **값은 평문 JSON이 아니라 서명된 JWT 문자열**이다. 페이로드만 디코딩해 보려면 [jwt.io](https://jwt.io) 같은 도구를 쓸 수 있으나, **운영 시 쿠키 값은 공유·스크린샷하지 말 것**(세션 탈취와 동일하다).
- 디버깅 시에는 **Application → Cookies** 에서 삭제하거나 **시크릿 창**으로 세션을 분리하는 편이 안전하다.

---

## 12. tRPC 주소 설정과 사용

### 12.1 엔드포인트

클라이언트는 **`/api/trpc`** 로 배치 요청을 보낸다. 서버는 App Router **Route Handler** 한 곳에서 `GET`/`POST` 를 받는다 (`src/app/api/trpc/[trpc]/route.ts`).

```typescript
// src/app/api/trpc/[trpc]/route.ts
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { createTRPCContext } from "@/server/trpc/context";
import { appRouter } from "@/server/trpc/root";

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: createTRPCContext,
    responseMeta() {
      const headers = new Headers();
      headers.set("Cache-Control", "private, no-store, must-revalidate");
      headers.set("Vary", "Cookie");
      return { headers };
    },
  });

export { handler as GET, handler as POST };
```

### 12.2 URL이 달라지는 이유 (브라우저 vs 서버)

`TrpcProvider` 는 `httpBatchLink` 의 `url` 을 **`getBaseUrl() + "/api/trpc"`** 로 만든다 (`src/trpc/react.tsx`).

- **브라우저**: 상대 경로 `"" + "/api/trpc"` → 같은 origin 으로 요청.
- **서버**(RSC 등에서 tRPC를 부를 때): 절대 URL이 필요하므로 **`VERCEL_URL`**(배포) 또는 **`NEXT_PUBLIC_APP_URL`**(로컬·Docker 권장), 없으면 `http://127.0.0.1:3000` 을 쓴다.

```typescript
// src/trpc/react.tsx (발췌)
function getBaseUrl() {
  if (typeof window !== "undefined") return "";
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://127.0.0.1:3000";
}

function trpcLinks() {
  return [
    httpBatchLink({
      url: `${getBaseUrl()}/api/trpc`,
      transformer: superjson,
      fetch(url, opts) {
        return fetch(url, { ...opts, credentials: "include" });
      },
    }),
  ];
}
```

**환경 변수**: `NEXT_PUBLIC_APP_URL` 을 앱이 노출하는 실제 URL 과 맞추면 SSR·Docker·리버스 프록시에서 404/잘못된 호스트를 줄일 수 있다. (§7, §4.5 참고)

### 12.3 앱에 붙이기

루트에서 `SessionProvider` 안에 `TrpcProvider` 로 감싼다 (`src/components/providers.tsx`).

```tsx
// src/components/providers.tsx
import { SessionProvider } from "next-auth/react";
import { TrpcProvider } from "@/trpc/react";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchOnWindowFocus>
      <TrpcProvider>{children}</TrpcProvider>
    </SessionProvider>
  );
}
```

### 12.4 클라이언트에서 호출하기

`createTRPCReact<AppRouter>()` 로 만든 **`api`** 를 import 한다. 라우터 트리는 `src/server/trpc/root.ts` 의 `appRouter` 와 타입이 공유된다.

```tsx
"use client";

import { api } from "@/trpc/react";

// Suspense 쿼리 (로딩은 상위 Suspense / loading.tsx)
const [data] = api.post.listInfinite.useSuspenseInfiniteQuery(
  { limit: 20 },
  { getNextPageParam: (last) => last.nextCursor ?? undefined },
);
const posts = data.pages.flatMap((p) => p.items);
const [post] = api.post.byId.useSuspenseQuery({ id: postId });

// 입력이 있는 뮤테이션 + 성공 후 캐시 무효화
const utils = api.useUtils();
const updateName = api.auth.updateName.useMutation({
  onSuccess: async () => {
    await utils.auth.me.invalidate();
  },
});
```

- **`credentials: "include"`** 가 링크에 걸려 있어 **NextAuth 세션 쿠키**가 tRPC 요청에 실린다.
- **`superjson`** 으로 `Date` 등 직렬화가 맞춰져 있다.

---

## 13. 캐시 전략 (TanStack Query + tRPC HTTP)

데이터 신선도는 **브라우저 메모리의 TanStack Query 캐시**가 1차이고, **`/api/trpc` 응답 헤더**는 공유 캐시(프록시·CDN)가 이 API를 잘못 저장하지 않도록 2차 방어선으로 둔다. 실제 “최신 반영”은 **뮤테이션 성공 후 `utils.*.invalidate()`** 로 필요한 키만 무효화하는 패턴과 맞물린다. **사용자가 아직 요청하지 않은(또는 화면에 나타나기 직전인) 데이터를 미리 캐시에 넣는 프리패치(prefetch)** 는 체감 속도·깜빡임 감소에 직결되므로, 이 저장소에서는 [13.6절](#136-게시판-목록-서버-프리패치와-hydrationboundary)에서 개념과 코드를 따로 정리한다.

### 13.1 관련 파일

| 파일 | 역할 |
|------|------|
| `src/lib/query-cache.ts` | `staleTime` / `gcTime` 상수, 쿼리 `retry` 판별(`queryRetry`) |
| `src/lib/post-list-config.ts` | `POST_LIST_PAGE_SIZE`, `postListInfiniteGetNextPageParam`(서버 프리패치·클라이언트 무한 쿼리 공통) |
| `src/trpc/react.tsx` | `QueryClient` 기본 옵션, superjson `dehydrate`/`hydrate`, `httpBatchLink` |
| `src/app/api/trpc/[trpc]/route.ts` | `responseMeta` 로 HTTP 캐시 관련 헤더 |

### 13.2 TanStack Query 기본값 (`TrpcProvider`)

| 옵션 | 값 | 의미 |
|------|-----|------|
| `staleTime` | `60_000` ms (1분) | 이 시간 동안은 데이터를 “신선”으로 간주. **창 포커스·재연결 시** 자동 재요청은 **stale일 때만** 일어난다. |
| `gcTime` | `15 * 60_000` ms (15분) | 구독이 모두 끊긴 뒤 캐시 엔트리를 메모리에 유지하는 시간. |
| `refetchOnWindowFocus` | `true` | 탭 복귀 시 stale이면 refetch (기본 신선도와 조합). |
| `refetchOnReconnect` | `true` | 오프라인 후 복귀 시 stale이면 refetch. |
| `queries.retry` | `queryRetry` | 아래 13.4 참고. |
| `mutations.retry` | `false` | 제출·삭제 등은 실패 시 자동 재시도하지 않음(이중 처리 방지). |

### 13.3 화면별 덮어쓰기 (상수는 `query-cache.ts`)

| 쿼리 | `staleTime` | `gcTime` | 비고 |
|------|-------------|----------|------|
| `post.listInfinite` | 60초 | 30분 | 무한 스크롤 누적 페이지를 뒤로가기 등에서 오래 보존. 새 글·삭제 등은 `listInfinite.invalidate()` 로 갱신. **첫 페이지**는 RSC에서 한 번 프리패치되어 hydrate 될 수 있음([13.6절](#136-게시판-목록-서버-프리패치와-hydrationboundary)). |
| `post.byId` | 2분 | (기본 15분) | 상세·수정 화면. 수정 성공 시 `byId`·목록 invalidate 사용. |
| `auth.me` | 60초 | (기본) | 프로필. 이름 저장·아바타 후 `auth.me.invalidate()` + `update()` 로 세션과 맞춤. |
| `todo.list` | 60초 | 30분 | 할 일 목록. 생성·삭제·완료 토글 후 `todo.list.invalidate()`. 완료 체크 UI는 React 19 **`useOptimistic`** 으로 서버 응답 전에 반영([13.9절](#139-할-일-목록과-react-19-useoptimistic-낙관적-ui)). |

상수 이름: `STALE_POST_LIST_MS`, `STALE_POST_DETAIL_MS`, `STALE_AUTH_ME_MS`, `STALE_TODO_LIST_MS`, `GC_TIME_INFINITE_MS` 등.

### 13.4 쿼리 재시도 (`queryRetry`)

- **최대 2번**까지(0·1차 실패 후) 재시도 여부를 판단한다.
- **tRPC 클라이언트 오류**이면서 다음에 해당하면 **재시도하지 않음**:
  - HTTP 상태: `400`, `401`, `403`, `404`, `409`, `422`
  - 코드: `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `BAD_REQUEST`, `CONFLICT`, `PRECONDITION_FAILED`
- 그 외(네트워크 단절, 5xx 등)는 제한적으로 재시도해 일시 장애를 흡수한다.

### 13.5 tRPC HTTP 응답 (`responseMeta`)

`httpBatchLink`는 **`credentials: "include"`** 로 쿠키를 보내고, 한 배치에 여러 프로시저가 섞일 수 있어 **공유 캐시에 저장되면 사용자 간 데이터가 섞일 위험**이 있다. 그래서 모든 tRPC 응답에 대략 다음을 붙인다.

- **`Cache-Control: private, no-store, must-revalidate`** — 중간 캐시·브라우저가 응답 본문을 오래 저장하지 않도록.
- **`Vary: Cookie`** — 쿠키가 다른 요청과 응답을 섞어 쓰지 않도록 힌트.

“진짜 캐시”는 **TanStack Query의 메모리**와 **앱에서 호출하는 `invalidate`** 에 두고, HTTP 레이어는 **안전한 비저장**에 가깝게 유지하는 구성이다.

### 13.6 게시판 목록 서버 프리패치와 HydrationBoundary

#### 프리패치(prefetch)가 중요한 이유

- **사용자 행동 전에** 필요한 데이터를 백그라운드로 가져와 **TanStack Query 캐시**에 넣어 두면, 이후 `useSuspenseQuery` / `useSuspenseInfiniteQuery`가 같은 `queryKey`로 구독할 때 **네트워크 왕복 없이 또는 대기 시간이 짧게** 그려질 수 있다.
- **서버(RSC)에서 프리패치**하면 HTML·JS와 함께 **직렬화된 캐시 스냅샷**을 내려보내, 클라이언트 첫 페인트 직후 **추가 `/api/trpc` 호출을 줄이는** 데 유리하다(특히 목록 첫 페이지처럼 모든 방문자가 공통으로 보는 구간).
- **클라이언트에서 프리패치**(예: 링크·카드 **호버**)는 “곧 열릴 가능성이 높은 화면”의 데이터를 미리 채워 **클릭 직후 상세 화면이 즉시 뜨는** 체감을 줄 수 있다.
- Next.js **`Link`의 `prefetch`** 는 주로 **라우트 세그먼트 JS·RSC 페이로드**를 미리 가져오는 축이고, **tRPC JSON(예: `post.byId`)** 은 별도이므로, 이 앱에서는 **데이터 프리패치를 `utils.*.prefetch` / 서버 `prefetchInfinite`** 로 명시한다.

#### TanStack Query / tRPC에서의 역할

- TanStack Query: `queryClient.prefetchQuery` / `prefetchInfiniteQuery` 가 **캐시에 `queryKey` + 결과**를 넣는다. `@trpc/react-query`의 **`api.useUtils().post.byId.prefetch(input, opts)`** 는 내부적으로 같은 훅이 쓰는 **키·변환(superjson)** 과 맞춘 프리패치다.
- 서버: `@trpc/react-query/server`의 **`createServerSideHelpers`** 는 **HTTP 없이** `appRouter` 프로시저를 호출해 **서버 전용 `QueryClient`** 에 넣은 뒤, **`dehydrate()`** 로 클라이언트에 넘길 **스냅샷**을 만든다.

#### 이 저장소의 두 가지 프리패치

| 패턴 | 위치 | 무엇을 미리 채우는가 |
|------|------|----------------------|
| **서버 + hydrate** | `/posts` RSC | `post.listInfinite` **첫 페이지**만 → `HydrationBoundary`로 브라우저 `QueryClient`에 이어 붙임 |
| **클라이언트 호버** | `PostListClient` | `post.byId` — 카드에 포인터가 들어올 때 상세 쿼리 캐시 프리패치 |

---

#### 패턴 1 — 서버: `prefetchInfinite` → `dehydrate` → `HydrationBoundary`

RSC에서 한 번 실행되는 헬퍼로, 세션 컨텍스트와 동일한 `appRouter`를 쓰고 **무한 쿼리 첫 페이지**만 서버 `QueryClient`에 넣은 뒤 직렬화한다.

```typescript
// src/server/trpc/prefetch-post-list.ts
import { createServerSideHelpers } from "@trpc/react-query/server";
import superjson, { type SuperJSONResult } from "superjson";
import {
  POST_LIST_PAGE_SIZE,
  postListInfiniteGetNextPageParam,
} from "@/lib/post-list-config";
import { createTRPCContext } from "@/server/trpc/context";
import { appRouter } from "@/server/trpc/root";

export async function prefetchPostListInfiniteDehydratedState(): Promise<SuperJSONResult> {
  const ctx = await createTRPCContext();
  const helpers = createServerSideHelpers({
    router: appRouter,
    ctx,
    transformer: superjson,
  });

  await helpers.post.listInfinite.prefetchInfinite(
    { limit: POST_LIST_PAGE_SIZE },
    {
      getNextPageParam: postListInfiniteGetNextPageParam,
      initialCursor: null,
    },
  );

  return helpers.dehydrate() as unknown as SuperJSONResult;
}
```

게시판 페이지는 위 스냅샷을 받아 **클라이언트 경계**에서 캐시에 주입한다. `PostListClient`의 `useSuspenseInfiniteQuery` **입력·`getNextPageParam`** 은 반드시 위와 **동일**해야 같은 `queryKey`로 맞붙는다.

```tsx
// src/app/posts/page.tsx (발췌)
import { Suspense } from "react";
import { QueryErrorBoundary } from "@/components/error-boundary/query-error-boundary";
import { PostListSkeleton } from "@/components/scaffold/post-list-skeleton";
import { TrpcDehydratedStateBoundary } from "@/components/trpc-dehydrated-state-boundary";
import { prefetchPostListInfiniteDehydratedState } from "@/server/trpc/prefetch-post-list";
import { PostListClient } from "./post-list-client";

export default async function PostListPage() {
  const dehydratedState = await prefetchPostListInfiniteDehydratedState();

  return (
    <QueryErrorBoundary>
      <TrpcDehydratedStateBoundary dehydratedState={dehydratedState}>
        <Suspense fallback={<PostListSkeleton />}>
          <PostListClient />
        </Suspense>
      </TrpcDehydratedStateBoundary>
    </QueryErrorBoundary>
  );
}
```

tRPC `dehydrate()` 결과는 **전체 스냅샷을 superjson으로 한 번 감싼 값**이므로, 클라이언트에서 푼 뒤 TanStack의 `HydrationBoundary`에 넘긴다. `TrpcProvider`의 `QueryClient`에는 **`dehydrate.serializeData` / `hydrate.deserializeData`** 로 superjson을 연결해 두었다(`src/trpc/react.tsx`).

```tsx
// src/components/trpc-dehydrated-state-boundary.tsx
"use client";

import { HydrationBoundary, type DehydratedState } from "@tanstack/react-query";
import superjson, { type SuperJSONResult } from "superjson";

export function TrpcDehydratedStateBoundary({
  dehydratedState,
  children,
}: {
  dehydratedState: SuperJSONResult;
  children: React.ReactNode;
}) {
  const state = superjson.deserialize(dehydratedState) as DehydratedState;
  return <HydrationBoundary state={state}>{children}</HydrationBoundary>;
}
```

---

#### 패턴 2 — 클라이언트: 목록에서 호버 시 `post.byId` 프리패치

상세 페이지는 `useSuspenseQuery({ id })` 로 같은 키를 쓴다. **호버 시점에** `prefetch` 해 두면 클릭 직후 캐시 히트 가능성이 높아진다.

```tsx
// src/app/posts/post-list-client.tsx (발췌)
const utils = api.useUtils();

const prefetchPostDetail = useCallback(
  (id: string) => {
    void utils.post.byId.prefetch(
      { id },
      { staleTime: STALE_POST_DETAIL_MS },
    );
  },
  [utils],
);

// 카드(또는 Link)에 연결
<Link href={`/posts/${p.id}`} onPointerEnter={() => prefetchPostDetail(p.id)}>
  …
</Link>
```

상세 화면의 `staleTime`과 맞추면 불필요한 재요청을 줄이면서도 프리패치와 **같은 신선도 규칙**을 공유한다.

---

#### 관련 파일 요약

| 파일 | 역할 |
|------|------|
| `src/server/trpc/prefetch-post-list.ts` | `createServerSideHelpers`로 `post.listInfinite.prefetchInfinite` + `dehydrate()` |
| `src/components/trpc-dehydrated-state-boundary.tsx` | superjson `deserialize` 후 `HydrationBoundary` |
| `src/app/posts/page.tsx` | RSC에서 프리패치·dehydrate 호출 후 경계로 감쌈 |
| `src/app/posts/post-list-client.tsx` | `utils.post.byId.prefetch` (호버) + 무한 목록 훅 |
| `src/lib/post-list-config.ts` | `POST_LIST_PAGE_SIZE`, `postListInfiniteGetNextPageParam` — 서버·클라이언트 **동일** 유지 |
| `src/trpc/react.tsx` | `QueryClient`의 superjson `dehydrate` / `hydrate` 옵션 |

**정리**: 서버는 **`createServerSideHelpers`** 로 프로시저를 직접 호출해 **무한 목록 첫 페이지** 캐시를 채우고, 브라우저의 `TrpcProvider` 안 `QueryClient`는 **`HydrationBoundary`** 로 그 상태를 이어받는다. **2페이지째 이후**·**글 상세 데이터**는 각각 **클라이언트** 무한 스크롤·**호버 `prefetch`** 가 담당한다.

### 13.7 NextAuth 세션과의 관계

`SessionProvider`에 **`refetchOnWindowFocus`** 가 켜져 있어, 탭 복귀 시 JWT 세션을 다시 확인한다. 게시글·프로필의 tRPC 캐시 정책과는 별층이지만, 로그인 상태 표시와 함께 쓰일 때 동작이 겹치지 않도록 **역할을 나눈 것**(세션 vs 서버에서 읽은 DB 데이터)으로 이해하면 된다.

### 13.8 정적 업로드 파일

게시글 이미지 등 **`GET /uploads/...`** 는 tRPC가 아니라 별도 라우트에서 강한 캐시 헤더를 줄 수 있다. 게시판 본문·목록의 JSON은 `/api/trpc`이고, 바이너리 정적 파일과 캐시 특성이 다르다는 점만 구분하면 된다.

### 13.9 할 일 목록과 React 19 useOptimistic (낙관적 UI)

**`/todos`** 의 완료 체크는 네트워크 왕복을 기다리지 않고 **즉시 체크 상태·스타일이 바뀌도록** [React 19 `useOptimistic`](https://react.dev/reference/react/useOptimistic) 을 쓴다. TanStack Query의 `onMutate` 로 캐시를 직접 패치하는 방식과 **역할이 비슷**하지만, 여기서는 **React가 제공하는 낙관적 레이어**에 맡긴 예시다.

#### 코드 조각 — `useOptimistic`과 목록 소스

쿼리로 받은 `todos`를 **패스스루(기준 상태)** 로 두고, `reducer`는 **불변**으로 해당 행의 `completed` 만 갈다. 화면에는 `optimisticTodos`만 쓴다.

```tsx
// src/app/todos/todo-list-client.tsx (발췌)
import type { inferRouterOutputs } from "@trpc/server";
import { useOptimistic, startTransition } from "react";
import type { AppRouter } from "@/server/trpc/root";
import { api } from "@/trpc/react";

type TodoRow = inferRouterOutputs<AppRouter>["todo"]["list"][number];
type ToggleOptimistic = { id: string; completed: boolean };

const [todos] = api.todo.list.useSuspenseQuery(undefined, {
  staleTime: STALE_TODO_LIST_MS,
  gcTime: GC_TIME_INFINITE_MS,
});

const [optimisticTodos, setOptimisticCompleted] = useOptimistic(
  todos,
  (current: TodoRow[], action: ToggleOptimistic): TodoRow[] =>
    current.map((t) =>
      t.id === action.id ? { ...t, completed: action.completed } : t,
    ),
);
```

#### 코드 조각 — 뮤테이션과 캐시 동기화

서버 응답 후 **`todo.list.invalidate()`** 로 TanStack 캐시를 갱신하면 `todos` 참조가 바뀌고, `useOptimistic`의 기준값이 따라가 **낙관적 오버레이가 정리**된다. 실패 시에도 같은 `invalidate`로 서버 기준으로 되돌린다.

```tsx
// src/app/todos/todo-list-client.tsx (발췌)
const utils = api.useUtils();

const toggleMut = api.todo.toggleCompleted.useMutation({
  onSuccess: async () => {
    await utils.todo.list.invalidate();
  },
  onError: async () => {
    await utils.todo.list.invalidate();
  },
});
```

#### 코드 조각 — 체크박스: `startTransition` + `mutate`

체크 직후 **UI는 transition 안의 낙관적 업데이트**로 반영하고, 곧바로 tRPC 뮤테이션을 보낸다.

```tsx
// src/app/todos/todo-list-client.tsx (발췌)
<input
  type="checkbox"
  checked={todo.completed}
  disabled={toggleMut.isPending && toggleMut.variables?.id === todo.id}
  onChange={() => {
    const next = !todo.completed;
    startTransition(() => {
      setOptimisticCompleted({ id: todo.id, completed: next });
    });
    toggleMut.mutate({ id: todo.id });
  }}
/>
```

리스트 전체는 **`optimisticTodos.map(...)`** 으로 렌더한다(빈 목록 여부도 동일).

#### 요약

| 항목 | 내용 |
|------|------|
| **파일** | `src/app/todos/todo-list-client.tsx` |
| **기준 데이터** | `api.todo.list.useSuspenseQuery` → `useOptimistic` 첫 인자 |
| **낙관적 반영** | `startTransition` + `setOptimisticCompleted({ id, completed })` |
| **서버 확정** | `todo.toggleCompleted` 후 `invalidate` (성공·실패 모두) |
| **타입** | `inferRouterOutputs<AppRouter>["todo"]["list"][number]` — **`import type`** 만 번들에 남김 |

같은 화면에서 **목록 정렬**은 `completed` 가 아니라 **`createdAt`(및 `id`)만** 쓰도록 서비스 레이어에 두어, 낙관적 UI로 `completed` 가 바뀌어도 **행 순서가 튀지 않는다**.

```typescript
// src/server/services/todos.ts (발췌)
orderBy: [desc(todos.createdAt), desc(todos.id)],
```

---

## 14. tRPC를 쓰는 이유와 대안과의 차이

이 프로젝트는 **같은 TypeScript 코드베이스** 안에서 서버 라우터(`appRouter`)와 클라이언트 훅(`api.post.byId.useSuspenseQuery` 등)이 **하나의 타입 정의**를 공유한다. “문서나 스키마를 따로 맞추는” 단계가 줄어드는 방식이다.

### 14.1 tRPC 방식의 특징 (이 저장소 기준)

| 특징 | 설명 |
|------|------|
| **엔드투엔드 타입** | `AppRouter`에서 입력·출력 타입이 추론된다. 프로시저 이름을 바꾸거나 `input` 스키마를 바꾸면 **클라이언트가 컴파일 단계에서 깨져** 런타임에야 알게 되는 불일치를 줄인다. |
| **프로시저 단위 API** | URL을 수십 개 나열하기보다 `auth.me`, `post.listInfinite`처럼 **함수 호출**에 가깝게 쓴다. 실제 전송은 `POST /api/trpc` 등 한두 엔드포인트에 배치될 수 있다(`httpBatchLink`). |
| **서버에서 입력 검증** | `protectedProcedure` + **[Zod](#142-zod-검증)** 로 **서버가 신뢰하는 입력**만 받는다. 클라이언트 검증과 별개로 서버 경계가 명확하다. |
| **컨텍스트 한 번에** | `createTRPCContext`에서 세션·DB 접근을 묶어 두고, 각 프로시저는 `ctx`만 쓰면 된다. |
| **React Query와 결합** | `@trpc/react-query`가 쿼리 키·무효화를 프로시저 경로와 맞춰 준다. `utils.post.byId.invalidate({ id })`처럼 **이름 기반**으로 캐시를 건드린다. |

### 14.2 Zod 검증

의존성은 **`zod` ^4** (`package.json`). 스키마는 **런타임**에 JSON·환경 변수를 거르고, **`z.infer<typeof schema>`** 로 TypeScript 타입을 뽑을 수 있다. **클라이언트 폼 검증은 UX용**으로만 쓰고, **서버(또는 tRPC `input`)에서 반드시 다시 검증**하는 것이 보안·일관성 측면에서 전제다.

#### tRPC 프로시저 `input`

각 프로시저에 **`.input(z.object({ ... }))`** 를 붙이면, 요청 본문이 스키마를 통과하지 못할 때 tRPC가 **`BAD_REQUEST`** 로 응답한다. UUID 식별자는 Zod 4에서 **`z.uuid()`** 를 쓴다(과거 `z.string().uuid()` 대신).

```typescript
// src/server/trpc/routers/post.ts (발췌)
import { z } from "zod";

const postIdSchema = z.uuid();

listInfinite: publicProcedure
  .input(
    z.object({
      limit: z.number().min(1).max(50).default(20),
      cursor: z.string().nullable().optional(),
    }),
  )
  .query(async ({ input }) => { /* … */ }),

byId: publicProcedure
  .input(z.object({ id: postIdSchema }))
  .query(async ({ input }) => { /* … */ }),

create: protectedProcedure
  .input(
    z.object({
      title: z.string().min(1).max(200),
      content: z.string().min(1),
      imageUrls: z.array(z.string()).max(5).optional(),
    }),
  )
  .mutation(({ ctx, input }) => { /* … */ }),
```

할 일 라우터는 제목 길이·`id` 등에 동일한 패턴을 쓴다(`src/server/trpc/routers/todo.ts`). 프로필 이름은 `auth.updateName` 의 `z.string().min(1).max(100)` (`src/server/trpc/routers/auth-trpc.ts`).

#### REST 회원가입 본문

tRPC 밖의 **`POST /api/auth/register`** 는 `Request.json()` 결과를 **`safeParse`** 로 검사하고, 실패 시 400을 돌려 **도메인 로직에 잘못된 형태가 들어가지 않게** 한다.

```typescript
// src/app/api/auth/register/route.ts (발췌)
import { z } from "zod";

const bodySchema = z.object({
  email: z.email().max(320),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(100),
});

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return jsonError("잘못된 요청 본문입니다.", 400);
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return jsonError("입력값을 확인해 주세요.", 400);
  }
  const dto = parsed.data;
  // … createUser(dto) …
}
```

#### 환경 변수

`process.env` 는 전부 문자열이라, 앱 기동 시 **`z.object` + `default` / `z.coerce.number()`** 로 한 번 파싱해 두면 DB URL·업로드 경로 등이 **형식 맞는 값만** 쓰이게 된다(`src/lib/env.ts`).

```typescript
// src/lib/env.ts (발췌)
import { z } from "zod";

const schema = z.object({
  DB_HOST: z.string().default("localhost"),
  DB_PORT: z.coerce.number().default(5432),
  DB_USERNAME: z.string().default("board"),
  DB_PASSWORD: z.string().default("board"),
  DB_NAME: z.string().default("board"),
  UPLOADS_DIR: z.string().optional(),
});

export type AppEnv = z.infer<typeof schema>;

export function getEnv(): AppEnv {
  if (cached) return cached;
  cached = schema.parse(process.env);
  return cached;
}
```

#### 요약

| 위치 | 역할 |
|------|------|
| `src/server/trpc/routers/*.ts` | 프로시저별 `input` 스키마 — API 경계 |
| `src/app/api/auth/register/route.ts` | JSON 본문 `safeParse` |
| `src/lib/env.ts` | `process.env` 파싱·`AppEnv` 타입 |

### 14.3 장점 (체감하기 쉬운 순)

1. **리팩터링 내성**: 서버 시그니처 변경이 클라이언트 타입 오류로 바로 드러난다.
2. **보일러플레이트 감소**: `fetch('/api/posts/' + id)` + 수동 `JSON` 파싱 + 수동 타입 단언을 매 엔드포인트마다 반복하지 않아도 된다.
3. **일관된 오류 모델**: tRPC 오류 형태가 클라이언트에서도 예측 가능하고, TanStack Query의 `retry` 조건을 걸기 쉽다(이 프로젝트의 `queryRetry` 등).
4. **배치 요청**: 여러 프로시저 호출을 한 HTTP 왕복으로 묶을 수 있어 왕복 수를 줄이기 좋다(대신 응답 캐시 정책은 [캐시 전략 절](#13-캐시-전략-tanstack-query--trpc-http)처럼 신중히 잡는 편이 안전하다).

### 14.4 tRPC를 쓰지 않을 때 (전형적인 REST + `fetch` / axios)

| 구간 | 흔한 방식 | 그때 생기는 일 |
|------|-----------|----------------|
| **타입** | 서버는 컨트롤러, 클라이언트는 별도 `types/api.ts` 또는 코드 생성(OpenAPI) | 스키마·문서·구현 셋이 **어긋나기 쉽고**, 수정이 한쪽에만 반영되는 실수가 잦다. |
| **호출부** | 문자열 URL, 쿼리스트링 수작업 | 오타·누락이 **런타임**에 드러난다. |
| **캐시** | TanStack Query를 쓰더라도 `queryKey`를 직접 설계 | 키 규칙이 팀마다 달라지고, 무효화 범위를 잘못 잡기 쉽다. |
| **인증** | 매 요청마다 헤더·쿠키 처리 반복 | 공통 래퍼로 모을 수는 있지만, 엔드포인트마다 누락이 나올 여지가 있다. |

정리하면, **tRPC는 “타입 공유 + 호출 규약 + (옵션) 배치”를 프레임워크가 잡아 주고**, REST는 **규약을 팀이 직접 문서·코드로 유지**하는 쪽에 가깝다.

### 14.5 이 프로젝트에서 tRPC가 맡지 않는 것

모든 것을 tRPC로 통일할 필요는 없다. 여기서는 예를 들어 다음은 **REST Route Handler**로 두었다.

- **회원가입** `POST /api/auth/register` — 단순 JSON 한 방.
- **파일 업로드** `POST /api/upload/*` — `multipart/form-data`는 tRPC보다 일반 HTTP가 단순한 경우가 많다.
- **NextAuth** — 프레임워크가 정한 `GET/POST /api/auth/[...nextauth]` 경로.

즉 **“앱 내부 JSON RPC + 타입 공유”는 tRPC**, **브라우저·외부 도구와 맞추기 쉬운 폼/인증 표면**은 REST로 나눈 형태다.

### 14.6 트레이드오프 (언제 굳이 tRPC가 아닐 수 있는지)

- **공개 서드파티 API**를 노출해야 하면 OpenAPI·REST가 업계 관례에 잘 맞는 경우가 많다. tRPC 클라이언트는 보통 **같은 TS 모노레포/풀스택 앱**에 최적화되어 있다.
- **다른 언어 클라이언트**(모바일 네이티브를 Kotlin만 쓴다 등)가 주가 되면, 계약은 HTTP+스키마가 더 단순할 수 있다.
- **HTTP 캐시/CDN에 의존한 공개 GET**만으로 서비스가 구성된다면, 의도적으로 “얇은 REST+캐시 헤더”를 택하는 설계도 있다(이 앱의 게시판 JSON은 쿠키·배치 특성상 [캐시 전략 절](#13-캐시-전략-tanstack-query--trpc-http)에서 설명한 `responseMeta`처럼 보수적으로 두었다).

학습·내부용 풀스택 Next 앱에서는 **tRPC + 필요한 곳만 REST** 조합이 이 README의 방향과 맞다.

---

## 15. export const dynamic = "force-dynamic"

App Router에서 `page.tsx` / `layout.tsx` 등 **라우트 세그먼트** 맨 위에 두는 **Route Segment Config** 입니다. 한 줄로 말하면, 그 세그먼트(와 일반적으로 그 아래 자식)를 **“빌드 시점에 완전 정적으로 미리 만들어 두지 말고, 요청이 올 때 동적 렌더링 파이프라인을 타라”**고 Next.js에 알려 주는 설정입니다.

공식 개념은 [Route Segment Config (`dynamic`)](https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config#dynamic) 문서를 보면 됩니다.

### 15.1 정적 렌더 vs 동적 렌더

| 구분 | 대략적인 동작 | 잘 맞는 경우 |
|------|----------------|--------------|
| **정적(Static)** | `next build` 때 RSC 결과를 만들어 두고, 가능하면 같은 결과를 재사용한다. CDN 캐시와 궁합이 좋다. | 마케팅 페이지, 블로그 글처럼 **요청마다 바뀔 필요가 적은** 콘텐츠 |
| **동적(Dynamic)** | 해당 URL에 대한 요청이 들어올 때 서버에서 RSC를 다시 계산하는 쪽으로 간다(캐시·ISR과 조합하면 세부 동작은 달라질 수 있음). | **쿠키·헤더·로그인 여부·DB 최신값** 등 요청마다 달라질 수 있는 화면 |

`dynamic`은 이 중에서 **“이 세그먼트를 정적으로 고정할지”**를 제어하는 스위치에 가깝습니다.

### 15.2 값의 의미 (자주 쓰는 것만)

- **`"force-dynamic"`** — 이 세그먼트는 **항상 동적**으로 취급한다. 빌드 단계에서 “이 페이지를 정적 프리렌더로 끝내자”는 시도를 하지 않게 만든다.
- **`"auto"`**(또는 명시 안 함) — Next가 코드를 보고 정적/동적을 **추론**한다. `cookies()`, `headers()`, 특정 `fetch` 옵션 등이 있으면 동적으로 기울기 쉽다.
- **`"force-static"`** — 가능한 한 정적으로(단, 그만큼 쿠키·요청별 데이터 사용이 제한된다).
- **`"error"`** — 동적이어야 하는데 정적으로만 처리되면 **빌드 에러**로 잡아 준다.

### 15.3 이 프로젝트에서 `force-dynamic`을 쓰는 이유

1. **빌드 시점과 런타임의 차이**  
   서버 쪽에서 tRPC 클라이언트가 **`NEXT_PUBLIC_APP_URL`**(또는 `VERCEL_URL`)로 **`/api/trpc`에 절대 URL `fetch`**를 할 수 있다. `next build`를 돌리는 환경에는 앱 서버가 떠 있지 않거나, URL·환경 변수가 런타임과 다를 수 있어 **정적 프리렌더 단계에서 네트워크 호출이 실패**하는 상황을 피하고 싶을 때가 있다. `force-dynamic`은 “이 경로를 빌드 때 정적 산출물로 굳이지 말라”고 **명시**해서 그런 실패를 줄이는 데 도움이 된다.

2. **데이터·세션에 가까운 화면**  
   게시판 목록·상세·수정·프로필은 DB·로그인 상태와 연결된 UX라, **요청 시점에 서버 렌더링 파이프를 타는 쪽**이 의도에 잘 맞는다.

3. **추론(`auto`)에만 맡기지 않기**  
   Next 버전이나 트리 구조가 바뀌면 정적/동적 판정이 바뀔 수 있다. 학습용 저장소에서는 **의도를 코드로 고정**해 두면 “왜 빌드만 실패하지?” 같은 디버깅이 쉬워진다.

### 15.4 실제로 걸어 둔 파일

| 파일 | 역할 |
|------|------|
| `src/app/posts/page.tsx` | 게시판 목록 — RSC에서 `post.listInfinite` 프리패치 후 `HydrationBoundary`([13.6절](#136-게시판-목록-서버-프리패치와-hydrationboundary)) |
| `src/app/posts/[id]/page.tsx` | 글 상세 |
| `src/app/posts/[id]/edit/page.tsx` | 글 수정 |
| `src/app/profile/layout.tsx` | 프로필 하위 전체 |

### 15.5 TanStack Query 캐시와 헷갈리지 않기

`force-dynamic`은 **Next 서버가 RSC를 어떻게 만들·캐시하느냐**에 가깝고, 브라우저에서 돌아가는 **TanStack Query 메모리 캐시**와는 별개입니다. 클라이언트 쪽 신선도·무효화는 [캐시 전략 절](#13-캐시-전략-tanstack-query--trpc-http)을 보면 된다.

---

## 16. 서버 컴포넌트와 클라이언트 컴포넌트 (이 프로젝트 기준)

App Router에서는 파일 **맨 위에 `"use client"`가 없으면 기본이 서버 컴포넌트(React Server Component)** 입니다. Next.js와 React의 공식 설명은 각각 [Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components), [Client Components](https://nextjs.org/docs/app/building-your-application/rendering/client-components)를 보면 됩니다.

### 16.1 한 줄 요약

| | 서버 컴포넌트 | 클라이언트 컴포넌트 |
|--|----------------|---------------------|
| **실행 위치** | 요청 처리 시 **Node(서버)** 에서만 실행(결과만 클라이언트로 전달) | 브라우저에서 **하이드레이션** 후 실행 |
| **번들** | 클라이언트 JS 번들에 포함되지 않음(트리에 따라 일부 자식은 제외) | 해당 모듈이 **클라이언트 번들**에 포함됨 |
| **`useState` / `useEffect` / 이벤트** | 사용 불가 | 사용 가능 |
| **브라우저 전용 API** (`window`, `localStorage` 등) | 직접 쓰면 안 됨 | 사용 가능 |
| **비밀·서버 전용 모듈** | 서버에서만 import 가능(DB 드라이버, 내부 env 등) | 클라이언트로 새어 나가면 안 되는 코드는 import하지 말 것 |

서버 컴포넌트가 클라이언트 컴포넌트를 **자식으로 import**하는 것은 가능합니다. 반대로 클라이언트 파일이 서버 전용 컴포넌트를 **직접 import**하는 패턴은 되지 않습니다(필요하면 서버에서 조각을 children 등으로 넘기는 식으로 경계를 나눕니다).

### 16.2 이 저장소에서의 역할 나누기

데이터 패칭은 대부분 **클라이언트**에서 tRPC + TanStack Query(`useSuspenseQuery` 등)로 하고, **서버** 쪽 `page.tsx`는 `Suspense`·에러 경계·스켈레톤·동적 `params` 처리 같은 **껍데기**를 맡는 경우가 많습니다.

**서버 컴포넌트 예시 (`"use client"` 없음)**

| 파일 | 하는 일 |
|------|---------|
| `src/app/layout.tsx` | 루트 레이아웃, 폰트·`metadata`, `AppProviders` / `SiteHeader` 감싸기 |
| `src/app/page.tsx` | `redirect("/posts")` 만 수행 |
| `src/app/posts/page.tsx` | `QueryErrorBoundary` + `TrpcDehydratedStateBoundary` + `Suspense` + `PostListClient` |
| `src/app/posts/[id]/page.tsx` | `await params`로 `id` 추출 후 `PostDetailClient`에 전달 |
| `src/app/posts/[id]/edit/page.tsx` | 동일 패턴으로 `PostEditClient`에 `id` 전달 |
| `src/app/profile/layout.tsx` | `dynamic` 설정 + `children` 전달 |
| `src/app/**/loading.tsx` | 라우트 전환 시 보여 줄 스켈레톤(서버에서 RSC로 렌더) |
| `src/components/scaffold/*-skeleton.tsx` | 스켈레톤 UI(인터랙션 없음 → 서버에 둬도 됨) |

**클라이언트 컴포넌트 예시 (파일에 `"use client"`)**

| 구역 | 파일 | 이유(대표) |
|------|------|------------|
| 페이지·폼 | `login/page.tsx`, `register/page.tsx`, `profile/page.tsx`, `posts/new/page.tsx` | `useActionState`, `signIn`, 세션·라우터 |
| 데이터 UI | `post-list-client.tsx`, `post-detail-client.tsx`, `post-edit-client.tsx`, `todo-list-client.tsx` | tRPC React 훅, `useSession`; 게시판 목록은 `useIntersectionInfiniteScroll` · 할 일은 React 19 **`useOptimistic`** 으로 완료 토글 낙관적 UI([13.9절](#139-할-일-목록과-react-19-useoptimistic-낙관적-ui)) |
| 전역 | `components/providers.tsx`, `trpc/react.tsx` | `QueryClientProvider`, tRPC `createTRPCReact` |
| 헤더 | `site-header.tsx` | `useSession`, 클라이언트 네비게이션 |
| 폼·업로드 | `forms/form-submit-button.tsx`, `posts/post-image-attachments.tsx` | `useFormStatus`, 파일 입력·미리보기 |
| 가드·경계 | `require-auth.tsx`, `error-boundary/query-error-boundary.tsx` | 훅·에러 경계 API |
| 에러 UI | `app/error.tsx`, `app/global-error.tsx`, 세그먼트 `error.tsx` | Next 규약상 **클라이언트 컴포넌트**여야 함 |
| UI 프리미티브(일부) | `components/ui/button.tsx`, `label.tsx`, `separator.tsx` | Radix/Base UI 등 **클라이언트 동작**이 필요한 조각 |

`Card`, `Input` 등 다른 `ui` 파일은 이 프로젝트에서 `"use client"`가 없어 **서버에서도 쓸 수 있는 경량 래퍼**로 두었고, 그 안에 클라이언트 전용 위젯을 넣으면 해당 서브트리만 클라이언트 경계가 생깁니다.

### 16.3 한 페이지 안에서의 조합 예 (`posts/[id]/page.tsx`)

`PostDetailPage`는 **서버** 컴포넌트(`async`, `params` 처리). 그 안에서 **클라이언트**인 `PostDetailClient`에 문자열 `id`만 넘깁니다. 이때 넘기는 props는 **직렬화 가능**해야 하며(문자열·숫자·일반 객체 JSON 등), 함수나 클래스 인스턴스를 그대로 넘기는 식은 피합니다.

### 16.4 Route Handler는 별개

`src/app/api/**/route.ts`, `uploads/[[...path]]/route.ts` 는 **RSC가 아니라 HTTP 핸들러**입니다. “서버에서만 돈다”는 점은 비슷하지만, 컴포넌트 트리의 서버/클라이언트 규칙과는 다른 축입니다.

---

## 17. 렌더링 전략 (CSR, SSR, SSG, RSC, 정적, ISR)

용어는 역사적으로 **Pages Router**와 **App Router**에서 조금씩 달리 쓰이기도 합니다. 여기서는 개념을 먼저 정리하고, 이 저장소에 어떻게 겹치는지만 적습니다. Next 공식의 큰 그림은 [Rendering](https://nextjs.org/docs/app/building-your-application/rendering) 문서를 참고하면 됩니다.

### 17.1 용어 정리

| 용어 | 보통의 의미 |
|------|-------------|
| **CSR (Client-Side Rendering)** | HTML/JS를 받은 뒤 **브라우저에서** React가 마운트되고, **데이터도 브라우저에서** `fetch` 등으로 가져온다. 초기 화면은 껍데기만 있고 내용은 나중에 채워지는 형태가 흔하다. |
| **SSR (Server-Side Rendering)** | (전통적 의미) **요청마다 서버가 HTML을 그려** 보내고, 클라이언트가 하이드레이션한다. **App Router**에서는 “페이지 전체가 한 덩어리 HTML로만”이라기보다, **RSC 페이로드 + 클라이언트 컴포넌트**가 섞인 **서버 주도 렌더**에 가깝다. |
| **SSG (Static Site Generation)** | **빌드 시점**에 페이지 산출물을 만들어 두고, 배포 후에는 그 결과를 재사용한다. “미리 찍어둔 HTML”에 가깝다. |
| **정적 렌더링 (Static rendering)** | Next(App Router) 용어로, 라우트를 **가능하면 빌드(또는 캐시) 시점에 정적으로** 만들어 두는 쪽. SSG와 맥락이 겹친다. |
| **ISR (Incremental Static Regeneration)** | 정적으로 생성해 둔 페이지를 **일정 시간(`revalidate`)마다** 또는 **온디맨드**로 백그라운드에서 갱신한다. “정적의 편의 + 어느 정도의 신선도”를 노리는 패턴. |
| **RSC (React Server Components)** | 컴포넌트 일부가 **서버에서만 실행**되고, 결과는 직렬화된 트리로 클라이언트에 전달된다. **클라이언트 번들에 안 실리는** 서버 UI·데이터 조합에 쓰인다. App Router의 기본 모델과 맞닿아 있다. |

### 17.2 이 프로젝트에 어떻게 걸려 있는가

**1) RSC + “서버에서의 껍데기”**  
`layout.tsx`, `posts/page.tsx`의 `Suspense`/`loading.tsx` 경계, `params` 처리 등 **서버 컴포넌트**가 먼저 실행된다([16절](#16-서버-컴포넌트와-클라이언트-컴포넌트-이-프로젝트-기준)). 이 부분은 **RSC 기반의 서버 렌더**다.

**2) 데이터는 대부분 CSR에 가깝게 (클라이언트 tRPC)**  
게시글 목록·상세·프로필 본문 등 **실제 DB 데이터**는 `PostListClient` 같은 **클라이언트 컴포넌트** 안에서 tRPC + TanStack Query로 가져온다. 즉 **화면의 “살”은 브라우저에서 네트워크 요청으로 채우는 패턴**이라, 전통적인 의미의 **CSR 쪽에 가깝다**. (첫 페인트 직후 스켈레톤 → 클라이언트에서 채움.)

**3) SSR과의 관계**  
사용자가 URL을 열 때마다 Next가 **동적 라우트**에 대해 서버에서 RSC 트리를 계산한다. 이는 “매 요청 서버가 관여한다”는 점에서 **SSR과 비슷한 체감**이 있지만, 본 앱은 **HTML 안에 글 목록이 이미 다 박혀 나온다**기보다는 **스켈레톤 + 클라이언트 데이터 패칭**이 중심이다.

**4) 정적 렌더 / SSG**  
`posts`, `posts/[id]` 등에는 **`export const dynamic = "force-dynamic"`**([15절](#15-export-const-dynamic--force-dynamic))이 걸려 있어, 해당 세그먼트를 **빌드 시 완전 정적 페이지로 고정**하는 방향은 쓰지 않는다. 루트 `page.tsx`의 `redirect("/posts")` 같은 아주 얇은 라우트는 Next가 정적으로 처리할 여지가 있으나, **게시판 본류는 “정적 SSG HTML” 모델이 아니다.**

**5) ISR**  
App Router에서 흔한 **`export const revalidate = 60`** 같은 세그먼트 단위 ISR 설정이나, `fetch(..., { next: { revalidate: … } })` 기반 갱신은 **이 저장소 코드에는 없다**. tRPC Route Handler의 `Cache-Control`에 `must-revalidate` 문자열이 들어가 있지만, 그건 **HTTP 캐시 헤더**이지 Next의 **ISR `revalidate` 옵션**과는 별개다([13절](#13-캐시-전략-tanstack-query--trpc-http)).

### 17.3 한 줄로 요약 (이 레포)

| 전략 | 이 프로젝트에서 |
|------|-----------------|
| **RSC / 서버 렌더** | 레이아웃·로딩·경계·`params` 등 **서버 컴포넌트 셸** |
| **CSR** | tRPC + TanStack Query로 **게시글·프로필 데이터 주입** |
| **정적 / SSG** | 게시판 핵심 라우트는 `force-dynamic`으로 **의도적 비사용** |
| **ISR** | **미사용** (필요 시 세그먼트 `revalidate` 또는 `fetch` 캐시 정책을 별도 도입) |

게시판 **목록의 첫 페이지 TanStack 캐시**는 [13.6절](#136-게시판-목록-서버-프리패치와-hydrationboundary)처럼 RSC에서 프리패치·hydrate 할 수 있다. 그와 별개로 **목록 HTML 자체를 RSC가 DB에서 그려 내려보내는 방식**(서비스 레이어만 호출하고 `PostListClient` 없이 목록 마크업을 서버에서 생성)은 다른 설계다. 상세·수정 등 나머지 라우트는 여전히 클라이언트 tRPC가 많다.

---

## 18. 리팩터링 메모 · 추후 학습·확장

학습용 레포이므로, “왜 이렇게 나눴나”와 “다음에 무엇을 공부하면 좋은가”를 한곳에 모아 둔다.

### 18.1 코드 쪽에서 한 정리 (예시)

| 항목 | 설명 |
|------|------|
| **무한 스크롤** | `IntersectionObserver` + `fetchNextPage` 로직을 `useIntersectionInfiniteScroll`(`src/hooks/use-intersection-infinite-scroll.ts`)으로 분리했다. 목록 UI는 쿼리 결과를 펼쳐 그리는 일에만 집중한다. |
| **페이지 크기 상수** | `POST_LIST_PAGE_SIZE`(`src/lib/post-list-config.ts`) — 클라이언트 `listInfinite`의 `limit` 과 주석으로 맞춰 두었다. 서버 기본값(20)과 다를 수 있으니 혼동 시 이 파일을 본다. |
| **Zod 4** | 이메일은 `z.email()`, UUID는 `z.uuid()` 등 [문자열 체인 대신 포맷 스키마](https://zod.dev)를 쓰는 방향으로 맞춰 두었다. 사용처·코드 조각은 [14.2절](#142-zod-검증). |

### 18.2 이어서 배우기 좋은 주제 (개념 로드맵)

아래는 **이 프로젝트에 아직 없거나 얕게만 있는** 주제다. 공식 문서·튜토리얼과 병행하면 좋다.

| 주제 | 왜 / 무엇을 |
|------|-------------|
| **가상 스크롤** | 목록이 매우 길어지면 DOM 노드 수가 커진다. `@tanstack/react-virtual` 등으로 **보이는 행만 마운트**하는 패턴을 익히면 성능 감각이 생긴다. |
| **낙관적 업데이트(Optimistic UI)** | **할 일 완료 체크**는 React 19 **`useOptimistic` + `startTransition`** ([13.9절](#139-할-일-목록과-react-19-useoptimistic-낙관적-ui)). 게시글 수정·삭제 등은 여전히 뮤테이션 성공 후 `invalidate` 중심이며, 같은 목적이라면 TanStack Query `onMutate` / `placeholderData` 패턴도 비교해 볼 수 있다. |
| **RSC에서 목록 HTML 직접 렌더** | 목록 **캐시** 프리패치는 [13.6절](#136-게시판-목록-서버-프리패치와-hydrationboundary) 참고. 추가로 서비스 레이어만 호출해 **RSC가 `<ul>`까지 그리는** 패턴과 비교해 보면 경계가 더 분명해진다. |
| **Server Actions만의 폼** | 현재는 `useActionState` + tRPC mutation 혼합. 순수 Server Action + `revalidatePath` 만으로 끝내는 패턴과 비교해 보면 경계 설계가 보인다. |
| **테스트** | 단위: Vitest + 컴포넌트/훅. E2E: Playwright로 로그인·글쓰기 플로우. tRPC는 `inferProcedureInput` 으로 입력 타입을 테스트에 재사용할 수 있다. |
| **스키마·계약** | OpenAPI/REST 문서 자동화, 또는 tRPC 외부 클라이언트(모바일)를 고려하면 입력 검증·버전 정책을 따로 정리하는 연습이 된다. |
| **실패·관측** | 구조화 로그(JSON), 요청 ID 전파, Sentry 등 APM. 학습용 `flowLog` 를 운영 관측으로 바꾸는 사고실험. |
| **인증 고도화** | OAuth 프로바이더, refresh 토큰, 2FA, 세션 고정 방지 등. NextAuth v5(Auth.js) 마이그레이션 이슈도 참고. |
| **DB·배포** | [§8 Drizzle](#8-데이터베이스)의 `db:push` 외에 **마이그레이션 파일** 기반 배포(`db:generate` → CI 적용), 연결 풀(`postgres` 옵션), 읽기 복제 등. |

### 18.3 보안·운영 (프로덕션 전에)

학습용 문구이지만 방향만 정리한다: **Rate limiting**(로그인·가입·업로드), **업로드 MIME/크기·경로 검증**, **쿠키 `Secure`/`SameSite`**, HTTPS, 비밀 로테이션, 백업. 파일은 지금 로컬 디스크이므로 S3· presigned URL 패턴도 별도 학습 가치가 있다.

---

## 라이선스 및 주의

학습용 예제입니다. 프로덕션에서는 `NEXTAUTH_SECRET`, HTTPS·쿠키 정책, rate limit, 마이그레이션, 파일 저장소(S3 등)를 검토하세요.
