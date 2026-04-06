# docker-next-trpc-app

Next.js 16(App Router) + **React 19**, **NextAuth.js**, **tRPC 11**, **Drizzle ORM**, **PostgreSQL**, **TanStack Query**, **shadcn/ui**, **Tailwind CSS v4** 로 만든 학습용 풀스택 보드입니다.

참고한 레거시 스택: `docker_app`(NestJS + Vite + TypeORM)의 **로그인·게시글 CRUD·이미지 업로드** 를 유사한 UX로 옮겼습니다. 인증은 **NextAuth.js Credentials + JWT 세션 쿠키**로 단순화했습니다.

---

## 목차

1. [아키텍처 개요](#1-아키텍처-개요)
2. [로딩·에러 처리 (Suspense / error boundary)](#2-로딩에러-처리-suspense--error-boundary)
3. [docker_app 과의 대응](#3-docker_app-과의-대응)
4. [로컬 개발 (Docker 없이)](#4-로컬-개발-docker-없이)
5. [Docker: 개발 모드](#5-docker-개발-모드)
6. [Docker: 릴리즈 모드](#6-docker-릴리즈-모드)
7. [환경 변수](#7-환경-변수)
8. [데이터베이스](#8-데이터베이스)
9. [주요 요청 흐름](#9-주요-요청-흐름)
10. [프로젝트 구조](#10-프로젝트-구조)
11. [브라우저에서 세션 쿠키 확인](#11-브라우저에서-세션-쿠키-확인)
12. [tRPC 주소 설정과 사용](#12-trpc-주소-설정과-사용)

---

## 1. 아키텍처 개요

- **UI**: App Router + 클라이언트에서 TanStack Query(`@trpc/react-query`)와 **`useSuspenseQuery`** 로 데이터를 가져옵니다.
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

데이터가 많은 라우트(`posts`, `posts/[id]`, `profile`, `posts/[id]/edit`)는 **`export const dynamic = 'force-dynamic'`** 으로 빌드 시 정적 프리렌더에서 tRPC fetch 오류를 피합니다. tRPC 클라이언트는 서버에서 **`NEXT_PUBLIC_APP_URL`**(또는 `VERCEL_URL`) 기준 **절대 URL**로 `/api/trpc` 를 호출합니다.

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
| TypeORM 엔티티 | Drizzle `users`, `posts` |

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

### 4.4 DB만 Docker, Next는 로컬 (`npm run dev`)

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

---

## 8. 데이터베이스

- 스키마: `src/server/db/schema.ts`
- `npm run db:push` / `db:generate` / `db:studio`
- **테스트 글 시드** (`scripts/seed-random-posts.ts`): DB에 사용자가 **최소 1명** 있어야 합니다(먼저 회원가입). 기본 **20개** 랜덤 제목·본문을 `users` 의 첫 번째 행을 작성자로 넣습니다.
  - Docker 앱 컨테이너에서: `docker compose -f docker-compose.dev.yml exec app npm run db:seed:posts`
  - 호스트에서(DB만 Docker·`DB_HOST=localhost`): `npm run db:seed:posts`
  - 개수: `SEED_POST_COUNT=50 npm run db:seed:posts` (상한 500)

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

```
src/
  app/                    # 페이지, loading/error, Route Handlers
  components/
    error-boundary/       # QueryErrorBoundary (react-error-boundary)
    scaffold/             # PageShell, 스켈레톤들
  lib/                    # env, auth-options, auth-api
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

**환경 변수**: `NEXT_PUBLIC_APP_URL` 을 앱이 노출하는 실제 URL 과 맞추면 SSR·Docker·리버스 프록시에서 404/잘못된 호스트를 줄일 수 있다. (§7, §4.4 참고)

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

## 라이선스 및 주의

학습용 예제입니다. 프로덕션에서는 `NEXTAUTH_SECRET`, HTTPS·쿠키 정책, rate limit, 마이그레이션, 파일 저장소(S3 등)를 검토하세요.
