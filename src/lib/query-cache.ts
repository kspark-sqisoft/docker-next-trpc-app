import { isTRPCClientError } from "@trpc/client";

/** 기본 신선도: 이 시간 안에는 포커스/마운트만으로는 네트워크 재요청 없음 */
export const STALE_DEFAULT_MS = 60_000;

/** 게시판 무한 스크롤: 목록은 뮤테이션에서 invalidate, 약간 길게 두어 스크롤·탭 이동 시 요청 감소 */
export const STALE_POST_LIST_MS = 60_000;

/** 글 단건: 상세·편집 진입 시 짧은 구간 내 재방문 시 재사용 */
export const STALE_POST_DETAIL_MS = 2 * 60_000;

/** 로그인 사용자 프로필: 세션과 함께 쓰이며 이름/아바타 변경 시 invalidate */
export const STALE_AUTH_ME_MS = 60_000;

/** 할 일 목록: 생성·토글·삭제 시 invalidate, 탭 이동 시 재요청 완화 */
export const STALE_TODO_LIST_MS = 60_000;

/** 비활성 쿼리 메모리 보관(기본) */
export const GC_TIME_DEFAULT_MS = 15 * 60_000;

/** 무한 스크롤 누적 데이터: 뒤로가기 시 이전 페이지까지 유지 */
export const GC_TIME_INFINITE_MS = 30 * 60_000;

const NO_RETRY_HTTP = new Set([400, 401, 403, 404, 409, 422]);

/**
 * tRPC 클라이언트 오류는 코드가 명확할 때 재시도하지 않음(깜빡임·부하 방지).
 * 네트워크/5xx 등은 소수 회만 재시도.
 */
export function queryRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= 2) return false;
  if (isTRPCClientError(error)) {
    const http = error.data?.httpStatus;
    if (typeof http === "number" && NO_RETRY_HTTP.has(http)) return false;
    const code = error.data?.code;
    if (
      code === "UNAUTHORIZED" ||
      code === "FORBIDDEN" ||
      code === "NOT_FOUND" ||
      code === "BAD_REQUEST" ||
      code === "CONFLICT" ||
      code === "PRECONDITION_FAILED"
    ) {
      return false;
    }
  }
  return true;
}
