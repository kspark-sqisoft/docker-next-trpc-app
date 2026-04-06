/**
 * 앱 전체 tRPC 라우터 트리. 클라이언트의 api.post.* / api.auth.* 타입이 여기서 나온다.
 */
import { authTrpcRouter } from "@/server/trpc/routers/auth-trpc";
import { postRouter } from "@/server/trpc/routers/post";
import { todoRouter } from "@/server/trpc/routers/todo";
import { router } from "@/server/trpc/trpc";

export const appRouter = router({
  post: postRouter, // 게시글 CRUD·무한목록
  todo: todoRouter, // 할 일 목록·생성·완료 토글·삭제
  auth: authTrpcRouter, // 프로필 me·이름 변경
});

export type AppRouter = typeof appRouter;
