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
  list: protectedProcedure.query(({ ctx }) => {
    console.log("[todoRouter]프로시저 todo.list 호출");
    return listTodosForUser(ctx.user.id);
  }),

  create: protectedProcedure
    .input(z.object({ title: z.string().min(1).max(500) }))
    .mutation(({ ctx, input }) => {
      console.log("[todoRouter]프로시저 todo.create 호출");
      return createTodo({ title: input.title }, ctx.user.id);
    }),

  toggleCompleted: protectedProcedure
    .input(z.object({ id: todoIdSchema }))
    .mutation(({ ctx, input }) => {
      console.log("[todoRouter]프로시저 todo.toggleCompleted 호출");
      return toggleTodoCompleted(input.id, ctx.user.id);
    }),

  delete: protectedProcedure
    .input(z.object({ id: todoIdSchema }))
    .mutation(({ ctx, input }) => {
      console.log("[todoRouter]프로시저 todo.delete 호출");
      return removeTodo(input.id, ctx.user.id);
    }),
});
