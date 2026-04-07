/**
 * 애플리케이션 **루트 tRPC 라우터** (`appRouter`).
 *
 * ## 의미
 * - 공식 예시의 `trpc/routers/_app.ts` 에서 `createTRPCRouter({ hello: … })` 하던 것과 같다.
 * - 도메인별로 쪼갠 `postRouter`, `authTrpcRouter`, `todoRouter` 를
 *   `router({ post: …, auth: … })` 로 **한 트리**로 묶는다.
 *
 * ## 타입 공유
 * - `export type AppRouter = typeof appRouter` 가 클라이언트 `createTRPCReact<AppRouter>()`
 *   와 서버 `createServerSideHelpers` 의 **단일 진실 공급원**이 된다.
 *
 * ## 순서 상 위치
 * `initTRPC`(`trpc.ts`) → 각 `routers/*.ts` 가 `router()` 로 서브트리 정의 → **여기서 merge**.
 *
 * @see https://trpc.io/docs/client/nextjs/app-router-setup
 */
import { authTrpcRouter } from "@/server/trpc/routers/auth-trpc";
import { postRouter } from "@/server/trpc/routers/post";
import { todoRouter } from "@/server/trpc/routers/todo";
import { router } from "@/server/trpc/trpc";

export const appRouter = router({
  post: postRouter,
  todo: todoRouter,
  auth: authTrpcRouter,
});

export type AppRouter = typeof appRouter;
