/**
 * tRPC 요청 컨텍스트: NextAuth 세션 쿠키 → DB에서 최신 사용자 행을 다시 읽는다.
 * (JWT에만 의존하지 않고 탈퇴·변경 반영을 맞추기 위한 패턴)
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
  // App Router 요청의 세션 쿠키를 읽음
  const session = (await getServerSession(
    authOptions,
  )) as Session | null;
  if (!session?.user?.id) {
    flowLog("trpc-ctx", "세션 없음 → ctx.user = null");
    return { user: null };
  }
  // 세션의 id 로 DB 조회 → 없으면 로그아웃과 동일하게 취급
  const row = await findById(session.user.id);
  if (!row) {
    flowLog("trpc-ctx", "DB에 사용자 없음(세션만 있음) → ctx.user = null", {
      userId: session.user.id,
    });
    return { user: null };
  }
  flowLog("trpc-ctx", "ctx.user 로드 완료", { userId: row.id });
  // 비밀번호 해시 등 민감 필드 제거한 형태만 라우터에 노출
  return { user: toSafe(row) };
}
