/**
 * 게시판 목록 무한 스크롤 — 클라이언트 `post.listInfinite` 의 `limit` 과 맞출 것.
 */
export const POST_LIST_PAGE_SIZE = 10;

/** 서버 프리패치·클라이언트 `useSuspenseInfiniteQuery` 가 같은 규칙을 써야 캐시가 이어진다. */
export function postListInfiniteGetNextPageParam(last: {
  nextCursor: string | null;
}): string | undefined {
  return last.nextCursor ?? undefined;
}

