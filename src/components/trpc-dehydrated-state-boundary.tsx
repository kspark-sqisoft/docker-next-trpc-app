"use client";

/**
 * RSC에서 `createServerSideHelpers().dehydrate()` 한 값을 넘긴다.
 * tRPC가 superjson으로 감싼 DehydratedState 이므로 클라이언트에서 한 번 푼 뒤 TanStack `HydrationBoundary`에 넣는다.
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
