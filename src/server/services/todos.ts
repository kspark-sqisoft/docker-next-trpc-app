/**
 * 할 일 DB: 목록·생성·완료 토글·삭제 (본인 데이터만)
 */
import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { todos } from "@/server/db/schema";
import { TRPCError } from "@trpc/server";

export type TodoListItem = {
  id: string;
  title: string;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export async function listTodosForUser(userId: string): Promise<TodoListItem[]> {
  const rows = await db.query.todos.findMany({
    where: eq(todos.userId, userId),
    orderBy: [asc(todos.completed), desc(todos.createdAt)],
  });
  return rows.map((t) => ({
    id: t.id,
    title: t.title,
    completed: t.completed,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  }));
}

export async function createTodo(
  input: { title: string },
  userId: string,
): Promise<TodoListItem> {
  const [row] = await db
    .insert(todos)
    .values({
      title: input.title,
      userId,
    })
    .returning();
  return {
    id: row.id,
    title: row.title,
    completed: row.completed,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function toggleTodoCompleted(
  id: string,
  userId: string,
): Promise<TodoListItem> {
  const row = await db.query.todos.findFirst({
    where: and(eq(todos.id, id), eq(todos.userId, userId)),
  });
  if (!row) {
    throw new TRPCError({ code: "NOT_FOUND", message: "할 일을 찾을 수 없습니다." });
  }
  const next = !row.completed;
  await db
    .update(todos)
    .set({ completed: next, updatedAt: new Date() })
    .where(and(eq(todos.id, id), eq(todos.userId, userId)));
  return {
    id: row.id,
    title: row.title,
    completed: next,
    createdAt: row.createdAt,
    updatedAt: new Date(),
  };
}

export async function removeTodo(id: string, userId: string): Promise<void> {
  const row = await db.query.todos.findFirst({
    where: and(eq(todos.id, id), eq(todos.userId, userId)),
  });
  if (!row) {
    throw new TRPCError({ code: "NOT_FOUND", message: "할 일을 찾을 수 없습니다." });
  }
  await db.delete(todos).where(and(eq(todos.id, id), eq(todos.userId, userId)));
}
