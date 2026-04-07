/**
 * tRPC 서버 코어 팩토리 (공식 가이드의 `trpc/init.ts` 에 해당).
 *
 * ## 적용 순서에서의 위치
 * 1. `createTRPCContext` 가 요청마다 `ctx` 를 채움 (`context.ts`)
 * 2. 이 파일의 `initTRPC.context<TRPCContext>().create(...)` 로 **t** 인스턴스 생성
 * 3. `t.router` / `t.procedure` 만으로 하위 라우터(`routers/post.ts` 등)를 조립
 * 4. `appRouter` 는 `root.ts` 에서 `router({ post, auth, … })` 로 합쳐짐
 * 5. `fetchRequestHandler` 가 HTTP 요청마다 `createContext` → 프로시저 실행
 *
 * ## initTRPC 가 하는 일
 * - **컨텍스트 타입**을 제네릭으로 고정해, 모든 프로시저의 `ctx` 가 타입 안전해진다.
 * - `create({ transformer: superjson })` 로 왕복 직렬화 규칙을 서버·클라이언트와 맞춘다.
 * - `errorFormatter` 로 클라이언트가 읽기 쉬운 `message` 형태를 통일할 수 있다.
 *
 * ## export 되는 것
 * - `router` — `t.router` 와 동일. 서브 라우터를 합칠 때 사용.
 * - `publicProcedure` — 인증 없이 호출 가능한 프로시저 시작점.
 * - `protectedProcedure` — `ctx.user` 가 없으면 TRPCError UNAUTHORIZED.
 *
 * @see https://trpc.io/docs/client/nextjs/app-router-setup
 */
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TRPCContext } from "./context";

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
  // 클라이언트에서 shape.data.message 로 일관된 메시지 사용
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        message: error.message,
      },
    };
  },
});

export const router = t.router;
/** 인증 없이 호출 가능 (목록·상세 조회 등) */
export const publicProcedure = t.procedure;

/** 미들웨어: ctx.user 가 없으면 401. 통과 시 user 는 non-null 로 좁혀진다. */
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "로그인이 필요합니다." });
  }
  return next({
    ctx: { ...ctx, user: ctx.user },
  });
});
