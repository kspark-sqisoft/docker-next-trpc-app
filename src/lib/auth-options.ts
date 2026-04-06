/**
 * NextAuth 설정: Credentials + JWT 세션.
 * - authorize: DB 비밀번호 해시 검증 후 User 객체 반환(실패 시 null).
 * - jwt / session: 토큰·세션 객체에 id·이름·이미지를 싣는다. update 트리거로 클라이언트 세션 갱신 지원.
 */
import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { findByEmailWithSecrets } from "@/server/services/users";

const secret =
  process.env.NEXTAUTH_SECRET ??
  process.env.AUTH_SECRET ??
  "dev_only_nextauth_secret_min_32_chars_long!!";

export const authOptions: NextAuthOptions = {
  secret,
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60,
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Credentials",
      credentials: {
        email: { label: "이메일", type: "email" },
        password: { label: "비밀번호", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email;
        const password = credentials?.password;
        if (!email || !password || typeof email !== "string" || typeof password !== "string") {
          return null;
        }
        const user = await findByEmailWithSecrets(email);
        if (!user) return null;
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.profileImageUrl ?? undefined,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.sub = user.id;
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image ?? null;
      }
      if (trigger === "update" && session) {
        if (typeof session.name === "string") {
          token.name = session.name;
        }
        if (session.image !== undefined) {
          token.picture = session.image;
        }
      }
      return token;
    },
    /** 브라우저에 노출되는 session.user 구성 */
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.email = (token.email as string) ?? session.user.email ?? "";
        session.user.name = (token.name as string) ?? session.user.name ?? "";
        session.user.image =
          (token.picture as string | null | undefined) ?? null;
      }
      return session;
    },
  },
};
