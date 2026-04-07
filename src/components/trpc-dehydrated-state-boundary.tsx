"use client";

/**
 * 서버(`prefetch-post-list.ts`)가 `createServerSideHelpers().dehydrate()` 로 만든 스냅샷을
 * 클라이언트 TanStack Query 캐시에 **주입**하는 경계.
 *
 * tRPC는 superjson으로 한 번 더 감싼 형태를 반환하므로, 여기서 `deserialize` 후
 * `HydrationBoundary`에 넣으면 `TrpcProvider`의 `hydrate.deserializeData` 와 일관된다.
 *
 * @see https://trpc.io/docs/client/tanstack-react-query/server-components
 */
import {
  HydrationBoundary,
  type DehydratedState,
} from "@tanstack/react-query";
import superjson, { type SuperJSONResult } from "superjson";

export function TrpcDehydratedStateBoundary({
  dehydratedState,
  children,
}: {
  dehydratedState: SuperJSONResult;
  children: React.ReactNode;
}) {
  const state = superjson.deserialize(dehydratedState) as DehydratedState;
  return <HydrationBoundary state={state}>{children}</HydrationBoundary>;
}
