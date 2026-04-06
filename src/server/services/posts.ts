/**
 * 게시글 DB·디스크 연동: CRUD + 이미지 URL에 대응하는 posts/ 파일 삭제
 */
import { unlink } from "node:fs/promises";
import { join } from "node:path";
import { and, desc, eq, lt, or } from "drizzle-orm";
import { uploadsRoot } from "@/lib/env";
import { db } from "@/server/db";
import { posts } from "@/server/db/schema";
import { TRPCError } from "@trpc/server";

const POST_IMAGE_PUBLIC_PREFIX = "/uploads/posts/";

export type PostListItem = {
  id: string;
  title: string;
  createdAt: Date;
  authorId: string | null;
  authorName: string | null;
};

export type PostDetail = PostListItem & {
  content: string;
  updatedAt: Date;
  imageUrls: string[];
};

function diskPathForPostImageUrl(url: string): string | null {
  if (!url.startsWith(POST_IMAGE_PUBLIC_PREFIX)) return null;
  const name = url.slice(POST_IMAGE_PUBLIC_PREFIX.length);
  if (!name || name.includes("..") || name.includes("/")) return null;
  return join(uploadsRoot(), "posts", name);
}

async function unlinkPostImageFile(url: string): Promise<void> {
  const p = diskPathForPostImageUrl(url);
  if (!p) return;
  try {
    await unlink(p);
  } catch {
    /* ignore */
  }
}

const MAX_POST_IMAGES = 5;

export function sanitizeImageUrls(raw: string[] | undefined | null): string[] {
  if (raw == null) return [];
  if (!Array.isArray(raw)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "imageUrls 는 배열이어야 합니다.",
    });
  }
  if (raw.length > MAX_POST_IMAGES) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `이미지는 최대 ${MAX_POST_IMAGES}장까지 첨부할 수 있습니다.`,
    });
  }
  const seen = new Set<string>();
  for (const u of raw) {
    if (typeof u !== "string" || !u.startsWith(POST_IMAGE_PUBLIC_PREFIX)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "허용되지 않은 이미지 경로입니다.",
      });
    }
    const name = u.slice(POST_IMAGE_PUBLIC_PREFIX.length);
    if (!name || name.includes("..") || name.includes("/")) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "허용되지 않은 이미지 경로입니다.",
      });
    }
    if (seen.has(u)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "중복된 이미지 경로가 있습니다.",
      });
    }
    seen.add(u);
  }
  return [...seen];
}

export async function findAllForList(): Promise<PostListItem[]> {
  const rows = await db.query.posts.findMany({
    orderBy: [desc(posts.createdAt)],
    with: { author: true },
  });
  return rows.map((p) => ({
    id: p.id,
    title: p.title,
    createdAt: p.createdAt,
    authorId: p.authorId,
    authorName: p.author?.name ?? null,
  }));
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** ORDER BY created_at DESC, id DESC 기준 다음 페이지 (더 오래된 글) */
export async function findListPage(params: {
  limit: number;
  cursor?: { createdAt: Date; id: string };
}): Promise<{ items: PostListItem[]; nextCursor: string | null }> {
  // 한 건 더 읽어 hasMore 판별
  const take = Math.min(50, Math.max(1, params.limit)) + 1;
  const cursor = params.cursor;

  // (created_at, id) 복합 키로 안정적인 이전 페이지 경계
  const where =
    cursor != null
      ? or(
          lt(posts.createdAt, cursor.createdAt),
          and(eq(posts.createdAt, cursor.createdAt), lt(posts.id, cursor.id)),
        )
      : undefined;

  const rows = await db.query.posts.findMany({
    where,
    orderBy: [desc(posts.createdAt), desc(posts.id)],
    limit: take,
    with: { author: true },
  });

  const hasMore = rows.length > params.limit;
  const slice = hasMore ? rows.slice(0, params.limit) : rows; // 넘친 한 행은 버림
  const items: PostListItem[] = slice.map((p) => ({
    id: p.id,
    title: p.title,
    createdAt: p.createdAt,
    authorId: p.authorId,
    authorName: p.author?.name ?? null,
  }));

  const last = items[items.length - 1];
  const nextCursor =
    hasMore && last != null
      ? Buffer.from(
          JSON.stringify({ t: last.createdAt.toISOString(), i: last.id }),
          "utf8",
        ).toString("base64url")
      : null;

  return { items, nextCursor };
}

export function decodePostListCursor(
  encoded: string | null | undefined,
): { createdAt: Date; id: string } | undefined {
  if (encoded == null || encoded === "") return undefined;
  try {
    const raw = Buffer.from(encoded, "base64url").toString("utf8");
    const o = JSON.parse(raw) as { t?: unknown; i?: unknown };
    if (typeof o.t !== "string" || typeof o.i !== "string") return undefined;
    if (!UUID_RE.test(o.i)) return undefined;
    const createdAt = new Date(o.t);
    if (Number.isNaN(createdAt.getTime())) return undefined;
    return { createdAt, id: o.i };
  } catch {
    return undefined;
  }
}

export async function findOne(id: string): Promise<PostDetail | null> {
  const post = await db.query.posts.findFirst({
    where: eq(posts.id, id),
    with: { author: true },
  });
  if (!post) return null;
  const urls = Array.isArray(post.imageUrls) ? post.imageUrls : [];
  return {
    id: post.id,
    title: post.title,
    content: post.content,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    authorId: post.authorId,
    authorName: post.author?.name ?? null,
    imageUrls: urls,
  };
}

export async function createPost(
  input: { title: string; content: string; imageUrls?: string[] },
  authorId: string,
): Promise<PostDetail> {
  const imageUrls = sanitizeImageUrls(input.imageUrls);
  const [saved] = await db
    .insert(posts)
    .values({
      title: input.title,
      content: input.content,
      authorId,
      imageUrls,
    })
    .returning();
  const detail = await findOne(saved.id);
  if (!detail) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  return detail;
}

export async function updatePost(
  id: string,
  input: { title?: string; content?: string; imageUrls?: string[] },
  userId: string,
): Promise<PostDetail> {
  if (
    input.title === undefined &&
    input.content === undefined &&
    input.imageUrls === undefined
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "수정할 제목·내용 또는 첨부 이미지가 필요합니다.",
    });
  }
  const post = await db.query.posts.findFirst({ where: eq(posts.id, id) });
  if (!post) {
    throw new TRPCError({ code: "NOT_FOUND", message: "글을 찾을 수 없습니다." });
  }
  if (!post.authorId || post.authorId !== userId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "본인이 작성한 글만 수정할 수 있습니다.",
    });
  }
  const nextTitle = input.title ?? post.title;
  const nextContent = input.content ?? post.content;
  let nextUrls = Array.isArray(post.imageUrls) ? post.imageUrls : [];
  if (input.imageUrls !== undefined) {
    const next = sanitizeImageUrls(input.imageUrls);
    const prev = Array.isArray(post.imageUrls) ? post.imageUrls : [];
    const removed = prev.filter((u) => !next.includes(u));
    await Promise.all(removed.map((u) => unlinkPostImageFile(u)));
    nextUrls = next;
  }
  await db
    .update(posts)
    .set({
      title: nextTitle,
      content: nextContent,
      imageUrls: nextUrls,
      updatedAt: new Date(),
    })
    .where(eq(posts.id, id));
  const detail = await findOne(id);
  if (!detail) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  return detail;
}

export async function removePost(id: string, userId: string): Promise<void> {
  const post = await db.query.posts.findFirst({ where: eq(posts.id, id) });
  if (!post) {
    throw new TRPCError({ code: "NOT_FOUND", message: "글을 찾을 수 없습니다." });
  }
  if (!post.authorId || post.authorId !== userId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "본인이 작성한 글만 삭제할 수 있습니다.",
    });
  }
  const urls = Array.isArray(post.imageUrls) ? post.imageUrls : [];
  await Promise.all(urls.map((u) => unlinkPostImageFile(u)));
  await db.delete(posts).where(and(eq(posts.id, id), eq(posts.authorId, userId)));
}
