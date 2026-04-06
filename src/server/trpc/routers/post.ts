/**
 * 게시글 도메인 라우터.
 * - list / byId: 공개
 * - create / update / delete: 로그인 필요(protected), 서비스 레이어에서 작성자 검증
 */
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createPost,
  decodePostListCursor,
  findAllForList,
  findListPage,
  findOne,
  removePost,
  updatePost,
} from "@/server/services/posts";
import { protectedProcedure, publicProcedure, router } from "@/server/trpc/trpc";

const uuid = z.string().uuid();

/**
 * 무한 스크롤에서 2페이지부터만 인위 지연(학습용: 로딩 UI·네트워크 확인).
 * LIST_INFINITE_LEARNING_DELAY_MS 가 있으면 우선(0 이면 끔). 없으면 development 에서만 800ms.
 */
function listInfiniteLearningDelayMs(): number {
  const raw = process.env.LIST_INFINITE_LEARNING_DELAY_MS;
  if (raw !== undefined && raw !== "") {
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) return 0;
    return Math.min(n, 30_000);
  }
  return process.env.NODE_ENV === "development" ? 800 : 0;
}

export const postRouter = router({
  // 전체 목록(시드·관리용 등; UI 는 listInfinite 사용)
  list: publicProcedure.query(() => findAllForList()),

  /** 커서 기반 페이지 (무한 스크롤). cursor 는 이전 응답의 nextCursor 문자열. */
  listInfinite: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(20),
        cursor: z.string().nullable().optional(),
      }),
    )
    .query(async ({ input }) => {
      const decoded =
        input.cursor != null && input.cursor !== ""
          ? decodePostListCursor(input.cursor)
          : undefined;
      if (input.cursor != null && input.cursor !== "" && decoded == null) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "잘못된 커서입니다." });
      }
      // 학습용: 두 번째 페이지부터 응답 전 지연
      if (decoded != null) {
        const ms = listInfiniteLearningDelayMs();
        if (ms > 0) {
          await new Promise<void>((r) => setTimeout(r, ms));
        }
      }
      return findListPage({ limit: input.limit, cursor: decoded });
    }),

  /** 단건: 없으면 NOT_FOUND */
  byId: publicProcedure.input(z.object({ id: uuid })).query(async ({ input }) => {
    const post = await findOne(input.id);
    if (!post) {
      throw new TRPCError({ code: "NOT_FOUND", message: "글을 찾을 수 없습니다." });
    }
    return post;
  }),

  // ctx.user.id 를 authorId 로 저장
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(200),
        content: z.string().min(1),
        imageUrls: z.array(z.string()).max(5).optional(),
      }),
    )
    .mutation(({ ctx, input }) =>
      createPost(
        {
          title: input.title,
          content: input.content,
          imageUrls: input.imageUrls,
        },
        ctx.user.id,
      ),
    ),

  update: protectedProcedure
    .input(
      z.object({
        id: uuid,
        title: z.string().min(1).max(200).optional(),
        content: z.string().min(1).optional(),
        imageUrls: z.array(z.string()).max(5).optional(),
      }),
    )
    .mutation(({ ctx, input }) =>
      updatePost(
        input.id,
        {
          title: input.title,
          content: input.content,
          imageUrls: input.imageUrls,
        },
        ctx.user.id,
      ),
    ),

  // 첨부 파일 디스크 삭제 포함
  delete: protectedProcedure
    .input(z.object({ id: uuid }))
    .mutation(({ ctx, input }) => removePost(input.id, ctx.user.id)),
});
