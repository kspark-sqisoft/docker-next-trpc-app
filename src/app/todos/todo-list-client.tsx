"use client";

import { Trash2 } from "lucide-react";
import type { inferRouterOutputs } from "@trpc/server";
import { useCallback, useOptimistic, useState, startTransition } from "react";
import type { AppRouter } from "@/server/trpc/root";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageShell } from "@/components/scaffold/page-shell";
import { actionLog, flowLog } from "@/lib/flow-log";
import { GC_TIME_INFINITE_MS, STALE_TODO_LIST_MS } from "@/lib/query-cache";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";

type TodoRow = inferRouterOutputs<AppRouter>["todo"]["list"][number];
type ToggleOptimistic = { id: string; completed: boolean };

export function TodoListClient() {
  const [title, setTitle] = useState("");
  const utils = api.useUtils();

  const [todos] = api.todo.list.useSuspenseQuery(undefined, {
    staleTime: STALE_TODO_LIST_MS,
    gcTime: GC_TIME_INFINITE_MS,
  });

  const [optimisticTodos, setOptimisticCompleted] = useOptimistic(
    todos,
    (current: TodoRow[], action: ToggleOptimistic): TodoRow[] =>
      current.map((t) =>
        t.id === action.id ? { ...t, completed: action.completed } : t,
      ),
  );

  const createMut = api.todo.create.useMutation({
    onSuccess: async () => {
      await utils.todo.list.invalidate();
    },
  });

  const toggleMut = api.todo.toggleCompleted.useMutation({
    onSuccess: async () => {
      await utils.todo.list.invalidate();
    },
    onError: async () => {
      await utils.todo.list.invalidate();
    },
  });

  const deleteMut = api.todo.delete.useMutation({
    onSuccess: async () => {
      await utils.todo.list.invalidate();
    },
  });

  const onAdd = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const t = title.trim();
      if (!t || createMut.isPending) return;
      actionLog("todos", "할 일 추가 제출", { titleLen: t.length });
      flowLog("todos", "todo.create");
      createMut.mutate(
        { title: t },
        {
          onSuccess: () => {
            setTitle("");
          },
        },
      );
    },
    [title, createMut],
  );

  return (
    <PageShell
      title="할 일"
      description="로그인한 계정에만 보이는 목록입니다 · 완료는 체크로 토글합니다"
    >
      <form onSubmit={onAdd} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1 space-y-2">
          <Label htmlFor="todo-title">새 할 일</Label>
          <Input
            id="todo-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="내용을 입력하세요"
            maxLength={500}
            disabled={createMut.isPending}
            autoComplete="off"
          />
        </div>
        <Button type="submit" disabled={createMut.isPending || !title.trim()}>
          {createMut.isPending ? "추가 중…" : "등록"}
        </Button>
      </form>

      {createMut.isError ? (
        <p className="text-destructive text-sm" role="alert">
          {createMut.error.message}
        </p>
      ) : null}

      {optimisticTodos.length === 0 ? (
        <p className="text-muted-foreground mt-6 text-sm">
          등록된 할 일이 없습니다. 위에서 추가해 보세요.
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {optimisticTodos.map((todo) => (
            <li key={todo.id}>
              <Card
                className={cn(
                  "transition-[box-shadow,background-color,border-color] duration-200 ease-out",
                  todo.completed && "border-muted bg-muted/30",
                )}
              >
                <CardHeader className="flex flex-row items-center gap-3 space-y-0 py-4">
                  <input
                    type="checkbox"
                    checked={todo.completed}
                    disabled={
                      toggleMut.isPending && toggleMut.variables?.id === todo.id
                    }
                    onChange={() => {
                      const next = !todo.completed;
                      actionLog("todos", "완료 토글", {
                        id: todo.id,
                        next,
                      });
                      flowLog("todos", "todo.toggleCompleted (useOptimistic)");
                      startTransition(() => {
                        setOptimisticCompleted({ id: todo.id, completed: next });
                      });
                      toggleMut.mutate({ id: todo.id });
                    }}
                    className="border-input text-primary focus-visible:ring-ring size-4 shrink-0 rounded border shadow-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label={todo.completed ? "완료 취소" : "완료로 표시"}
                  />
                  <div className="min-w-0 flex-1">
                    <CardTitle
                      className={cn(
                        "text-base font-medium",
                        todo.completed &&
                          "text-muted-foreground line-through decoration-muted-foreground",
                      )}
                    >
                      {todo.title}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {new Date(todo.createdAt).toLocaleString("ko-KR")}
                    </CardDescription>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive shrink-0"
                    disabled={
                      deleteMut.isPending && deleteMut.variables?.id === todo.id
                    }
                    aria-label="삭제"
                    onClick={() => {
                      actionLog("todos", "삭제 클릭", { id: todo.id });
                      flowLog("todos", "todo.delete");
                      deleteMut.mutate({ id: todo.id });
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </CardHeader>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
