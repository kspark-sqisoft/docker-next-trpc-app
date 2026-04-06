/**
 * 로그인한 사용자 전용 프로필 API (NextAuth 세션과 별도로 DB 기준 me 제공)
 */
import { z } from "zod";
import { updateProfileName } from "@/server/services/users";
import { protectedProcedure, router } from "@/server/trpc/trpc";

export const authTrpcRouter = router({
  // DB 기준 현재 사용자(비밀번호 제외)
  me: protectedProcedure.query(({ ctx }) => ctx.user),

  updateName: protectedProcedure
    .input(z.object({ name: z.string().min(1).max(100) }))
    .mutation(({ ctx, input }) => updateProfileName(ctx.user.id, input.name)),
});
