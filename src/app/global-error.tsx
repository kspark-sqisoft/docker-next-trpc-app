"use client";

import { actionLog } from "@/lib/flow-log";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ko">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 font-sans">
        <h1 className="text-xl font-semibold">앱 전역 오류</h1>
        <p className="text-destructive max-w-md text-center text-sm">
          {error.message}
        </p>
        <button
          type="button"
          className="rounded-md border px-4 py-2 text-sm"
          onClick={() => {
            actionLog("error-global", "클릭: 다시 시도 (global-error)");
            reset();
          }}
        >
          다시 시도
        </button>
      </body>
    </html>
  );
}
