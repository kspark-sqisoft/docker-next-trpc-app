/**
 * RSC(서버 컴포넌트)에서 게시판 첫 페이지를 **미리** TanStack Query 캐시 형태로 채운 뒤,
 * **dehydrate** 한 스냅샷을 클라이언트에 넘기기 위한 헬퍼.
 *
 * 공식 가이드의 `getQueryClient` + `trpc.*.queryOptions` + `prefetchQuery` 패턴과 목적은 같다.
 * 이 레포는 `@trpc/react-query/server` 의 **`createServerSideHelpers`** 로 같은 일을 한다
 * (가이드에도 서버 헬퍼 방식이 문서화되어 있음).
 *
 * ## 흐름
 * 1. `createTRPCContext()` — HTTP Route와 동일한 규칙으로 `ctx` 생성(비로그인이면 user null).
 * 2. `createServerSideHelpers({ router: appRouter, ctx, transformer: superjson })`
 * 3. `prefetchInfinite(post.listInfinite, …)` — 서버 측 QueryClient에 첫 페이지 적재.
 * 4. `helpers.dehydrate()` — 클라이언트 `HydrationBoundary`에 넘길 직렬화 상태.
 *
 * 클라이언트 `TrpcProvider` 의 `dehydrate/hydrate` 가 superjson 이므로 여기서도 동일 transformer 필수.
 *
 * @see https://trpc.io/docs/client/tanstack-react-query/server-components
 * @see README §13.6
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

  return helpers.dehydrate() as unknown as SuperJSONResult;
}
