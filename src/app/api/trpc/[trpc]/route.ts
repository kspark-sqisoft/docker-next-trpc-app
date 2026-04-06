/**
 * tRPC HTTP 어댑터: /api/trpc 로 들어온 GET·POST 를 appRouter 로 넘긴다.
 */
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { createTRPCContext } from "@/server/trpc/context";
import { appRouter } from "@/server/trpc/root";

// App Router 가 넘기는 표준 Request 로 배치·스트리밍 처리
const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: createTRPCContext,
  });

export { handler as GET, handler as POST };
