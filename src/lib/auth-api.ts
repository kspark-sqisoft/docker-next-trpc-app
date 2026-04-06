import { fetchWithFlowLog } from "@/lib/http-request-log";

export type SafeUserJson = {
  id: string;
  email: string;
  name: string;
  profileImageUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

type FetchError = Error & { status: number };

// HTTP 상태 코드를 붙여 던져 호출부에서 구분 가능하게 함
function throwHttpError(res: Response, message: string): never {
  const err = new Error(message) as FetchError;
  err.status = res.status;
  throw err;
}

async function parseErrorMessage(
  res: Response,
  fallback: string,
): Promise<string> {
  try {
    const body = (await res.json()) as { message?: string | string[] };
    const m = body.message;
    if (Array.isArray(m)) return m.join(", ");
    if (typeof m === "string") return m;
  } catch {
    /* ignore */
  }
  return fallback;
}

export async function registerUser(input: {
  email: string;
  password: string;
  name: string;
}): Promise<{ user: SafeUserJson }> {
  const res = await fetchWithFlowLog(
    "/api/auth/register",
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
    "rest-auth",
  );
  if (!res.ok) {
    throwHttpError(
      res,
      await parseErrorMessage(res, "회원가입에 실패했습니다."),
    );
  }
  return res.json() as Promise<{ user: SafeUserJson }>;
}

// 글 작성 중 첨부: 응답의 url 을 DB imageUrls 에 넣음
export async function uploadPostImage(file: File): Promise<{ url: string }> {
  const body = new FormData();
  body.append("file", file);
  const res = await fetchWithFlowLog(
    "/api/upload/post-image",
    {
      method: "POST",
      credentials: "include",
      body,
    },
    "rest-upload-post-image",
  );
  if (!res.ok) {
    throwHttpError(
      res,
      await parseErrorMessage(res, "이미지 업로드에 실패했습니다."),
    );
  }
  return res.json() as Promise<{ url: string }>;
}

// 프로필 이미지 저장 후 갱신된 사용자 JSON
export async function uploadAvatar(file: File): Promise<SafeUserJson> {
  const body = new FormData();
  body.append("file", file);
  const res = await fetchWithFlowLog(
    "/api/upload/avatar",
    {
      method: "POST",
      credentials: "include",
      body,
    },
    "rest-upload-avatar",
  );
  if (!res.ok) {
    throwHttpError(
      res,
      await parseErrorMessage(res, "이미지 업로드에 실패했습니다."),
    );
  }
  return res.json() as Promise<SafeUserJson>;
}
