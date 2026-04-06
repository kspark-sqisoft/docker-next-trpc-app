/**
 * tRPC 코어: 모든 라우터가 공유하는 팩토리.
 * - superjson: Date 등 타입이 클라이언트·서버 간 그대로 오간다.
 * - context 타입(TRPCContext)은 요청마다 createTRPCContext()로 채운다.
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
