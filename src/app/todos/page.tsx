import { Suspense } from "react";
import { QueryErrorBoundary } from "@/components/error-boundary/query-error-boundary";
import { RequireAuth } from "@/components/require-auth";
import { TodoListSkeleton } from "@/components/scaffold/todo-list-skeleton";
import { flowLog } from "@/lib/flow-log";
import { TodoListClient } from "./todo-list-client";

export const dynamic = "force-dynamic";

export default function TodosPage() {
  flowLog("rsc-todos", "TodosPage → RequireAuth + Suspense + TodoListClient");
  return (
    <RequireAuth>
      <QueryErrorBoundary>
        <Suspense fallback={<TodoListSkeleton />}>
          <TodoListClient />
        </Suspense>
      </QueryErrorBoundary>
    </RequireAuth>
  );
}
