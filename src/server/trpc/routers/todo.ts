/**
 * 할 일 라우터. 목록·생성·완료 토글·삭제는 모두 로그인 필요.
 */
import { z } from "zod";
import {
  createTodo,
  listTodosForUser,
  removeTodo,
  toggleTodoCompleted,
} from "@/server/services/todos";
import { protectedProcedure, router } from "@/server/trpc/trpc";

const todoIdSchema = z.uuid();

export const todoRouter = router({
  list: protectedProcedure.query(({ ctx }) => listTodosForUser(ctx.user.id)),

  create: protectedProcedure
    .input(z.object({ title: z.string().min(1).max(500) }))
    .mutation(({ ctx, input }) => createTodo({ title: input.title }, ctx.user.id)),

  toggleCompleted: protectedProcedure
    .input(z.object({ id: todoIdSchema }))
    .mutation(({ ctx, input }) => toggleTodoCompleted(input.id, ctx.user.id)),

  delete: protectedProcedure
    .input(z.object({ id: todoIdSchema }))
    .mutation(({ ctx, input }) => removeTodo(input.id, ctx.user.id)),
});
