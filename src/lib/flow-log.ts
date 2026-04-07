/**
 * 학습용: 브라우저·서버 콘솔에서 요청·UI 흐름을 따라가기 위한 로그.
 * - 기본: NODE_ENV === "development" 일 때만 출력
 * - 끄기: NEXT_PUBLIC_DEBUG_FLOW=0 (또는 false) — dev에서도 flowLog·actionLog·http-request-log·trpc.server 로그 전부 비활성
 * - 켜기(강제): NEXT_PUBLIC_DEBUG_FLOW=1 — production 빌드에서도 출력
 */
export function isFlowLogEnabled(): boolean {
  const flag = process.env.NEXT_PUBLIC_DEBUG_FLOW;
  if (flag === "0" || flag === "false") return false;
  if (flag === "1") return true;
  return process.env.NODE_ENV === "development";
}

export function flowLog(tag: string, message: string, extra?: unknown): void {
  if (!isFlowLogEnabled()) return;
  const prefix = `[flow:${tag}]`;
  if (extra !== undefined) {
    console.log(prefix, message, extra);
  } else {
    console.log(prefix, message);
  }
}

/**
 * 버튼·폼 제출·파일 선택 등 **사용자가 직접 유발한 동작**만.
 * 콘솔 필터 `user-action` 으로 HTTP `[flow:…]` / tRPC 로그와 출처를 맞추기 쉽게 한다.
 */
export function actionLog(
  source: string,
  message: string,
  extra?: Record<string, unknown>,
): void {
  if (!isFlowLogEnabled()) return;
  const prefix = `[user-action:${source}]`;
  if (extra !== undefined && Object.keys(extra).length > 0) {
    console.log(prefix, message, extra);
  } else {
    console.log(prefix, message);
  }
}
