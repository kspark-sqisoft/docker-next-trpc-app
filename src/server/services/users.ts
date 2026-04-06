/**
 * 사용자 CRUD·toSafe(비밀번호 제외 응답용). NextAuth authorize·tRPC context 가 공통 사용.
 */
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { users, type User } from "@/server/db/schema";

export type SafeUser = {
  id: string;
  email: string;
  name: string;
  profileImageUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export function toSafe(user: User): SafeUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    profileImageUrl: user.profileImageUrl ?? null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function createUser(data: {
  email: string;
  passwordHash: string;
  name: string;
}) {
  const [row] = await db
    .insert(users)
    .values({
      email: data.email.toLowerCase().trim(),
      passwordHash: data.passwordHash,
      name: data.name.trim(),
      profileImageUrl: null,
      refreshTokenHash: null,
    })
    .returning();
  return row;
}

export async function findByEmailWithSecrets(email: string) {
  return db.query.users.findFirst({
    where: eq(users.email, email.toLowerCase().trim()),
  });
}

export async function findById(id: string) {
  return db.query.users.findFirst({
    where: eq(users.id, id),
  });
}

export async function findByRefreshHash(hash: string) {
  return db.query.users.findFirst({
    where: eq(users.refreshTokenHash, hash),
  });
}

export async function setRefreshTokenHash(userId: string, hash: string | null) {
  await db
    .update(users)
    .set({ refreshTokenHash: hash, updatedAt: new Date() })
    .where(eq(users.id, userId));
}

export async function updateProfileName(userId: string, name: string) {
  await db
    .update(users)
    .set({ name: name.trim(), updatedAt: new Date() })
    .where(eq(users.id, userId));
  const user = await findById(userId);
  if (!user) throw new Error("User not found");
  return toSafe(user);
}

export async function setProfileImageUrl(
  userId: string,
  profileImageUrl: string | null,
) {
  await db
    .update(users)
    .set({ profileImageUrl, updatedAt: new Date() })
    .where(eq(users.id, userId));
  const user = await findById(userId);
  if (!user) throw new Error("User not found");
  return toSafe(user);
}
