/**
 * 게시판 `post.listInfinite` 첫 페이지를 서버에서 TanStack Query 캐시에 넣고 dehydrate 할 때 쓴다.
 * @see README §13.6 (Prefetch 개념 · HydrationBoundary · 코드 조각)
 */
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

  // tRPC `dehydrate()` 는 전체 스냅샷을 superjson 으로 한 번 감싼 값을 반환한다.
  return helpers.dehydrate() as unknown as SuperJSONResult;
}
