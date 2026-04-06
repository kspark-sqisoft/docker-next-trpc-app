"use client";

import { useEffect, useRef, type RefObject } from "react";

type FetchNext = () => unknown | Promise<unknown>;

export type UseIntersectionInfiniteScrollOptions = {
  /** `getNextPageParam` 이 undefined 를 반환하면 false */
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: FetchNext;
  /** `IntersectionObserver` 의 `rootMargin` (예: 바닥 전에 미리 로드) */
  rootMargin?: string;
  threshold?: number;
  /** sentinel 이 교차할 때마다 (로깅 등). ref 로 최신만 쓰여 effect 재구독 없음 */
  onIntersect?: () => void;
};

/**
 * TanStack Query `useInfiniteQuery` / tRPC `useSuspenseInfiniteQuery` 와 짝지어
 * **끝 sentinel** 이 뷰포트에 들어올 때만 `fetchNextPage` 를 호출한다.
 *
 * 학습 포인트: 무한 스크롤 UI에서 **DOM 관찰(IntersectionObserver)** 과
 * **서버 커서 페이징** 을 분리하면 목록 컴포넌트는 “무엇을 그릴지”에만 집중할 수 있다.
 */
export function useIntersectionInfiniteScroll(
  options: UseIntersectionInfiniteScrollOptions,
): RefObject<HTMLDivElement | null> {
  const {
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    rootMargin = "200px",
    threshold = 0,
    onIntersect,
  } = options;

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const onIntersectRef = useRef(onIntersect);

  useEffect(() => {
    onIntersectRef.current = onIntersect;
  }, [onIntersect]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (!first?.isIntersecting) return;
        if (!hasNextPage || isFetchingNextPage) return;
        onIntersectRef.current?.();
        void fetchNextPage();
      },
      { root: null, rootMargin, threshold },
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, rootMargin, threshold]);

  return sentinelRef;
}
