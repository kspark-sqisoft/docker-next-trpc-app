/**
 * NextAuth 캐치올 라우트: 로그인·로그아웃·세션 등 /api/auth/* 요청 처리
 */
import NextAuth from "next-auth/next";
import { authOptions } from "@/lib/auth-options";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
