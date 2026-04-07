/**
 * tRPC 요청 컨텍스트 팩토리 — HTTP 요청 **한 번**마다 `fetchRequestHandler` 가 호출한다.
 *
 * ## 역할
 * - 공식 가이드는 `createTRPCContext({ headers })` 처럼 **Headers** 를 넘겨 인증하는 예가 많다.
 * - 이 프로젝트는 NextAuth 의 `getServerSession(authOptions)` 가 App Router 환경에서
 *   요청 쿠키를 읽어 주므로, 별도 인자 없이 **현재 요청의 세션**을 조회한다.
 * - 세션의 `user.id` 로 DB를 다시 읽어 `SafeUser` 만 `ctx.user` 에 넣는다
 *   (JWT 만으로는 탈퇴·DB 변경이 반영되지 않을 수 있어서).
 *
 * ## 호출 위치
 * - `app/api/trpc/[trpc]/route.ts` 의 `createContext: createTRPCContext`
 * - RSC 프리패치: `prefetch-post-list.ts` 에서 `createServerSideHelpers({ ctx: await createTRPCContext() })`
 *
 * ## 반환 타입
 * - `TRPCContext` — 라우터 전체에서 `ctx.user` 로 접근. 비로그인이면 `null`.
 *
 * @see https://trpc.io/docs/client/nextjs/app-router-setup (Create the API route handler · createContext)
 */
import type { Session } from "next-auth";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { flowLog } from "@/lib/flow-log";
import { findById, toSafe, type SafeUser } from "@/server/services/users";

export type TRPCContext = {
  user: SafeUser | null;
};

export async function createTRPCContext(): Promise<TRPCContext> {
  const session = (await getServerSession(
    authOptions,
  )) as Session | null;
  if (!session?.user?.id) {
    flowLog("trpc-ctx", "세션 없음 → ctx.user = null");
    return { user: null };
  }
  const row = await findById(session.user.id);
  if (!row) {
    flowLog("trpc-ctx", "DB에 사용자 없음(세션만 있음) → ctx.user = null", {
      userId: session.user.id,
    });
    return { user: null };
  }
  flowLog("trpc-ctx", "ctx.user 로드 완료", { userId: row.id });
  return { user: toSafe(row) };
}
