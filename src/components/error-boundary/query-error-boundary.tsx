"use client";

import { useQueryErrorResetBoundary } from "@tanstack/react-query";
import { ErrorBoundary, type FallbackProps } from "react-error-boundary";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { actionLog, flowLog } from "@/lib/flow-log";

function QueryErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  // tRPC·fetch 에러 객체 타입이 달라서 안전하게 문자열만 추출
  const message =
    error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
  return (
    <Alert variant="destructive" className="my-4">
      <AlertTitle>문제가 발생했습니다</AlertTitle>
      <AlertDescription className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-sm">{message}</span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            actionLog("query-boundary", "클릭: 다시 시도");
            flowLog("query-boundary", "resetErrorBoundary");
            resetErrorBoundary();
          }}
        >
          다시 시도
        </Button>
      </AlertDescription>
    </Alert>
  );
}

export function QueryErrorBoundary({ children }: { children: React.ReactNode }) {
  // "다시 시도" 시 React Query 의 에러 상태도 같이 초기화
  const { reset } = useQueryErrorResetBoundary();
  return (
    <ErrorBoundary
      FallbackComponent={QueryErrorFallback}
      onReset={() => {
        flowLog("query-boundary", "ErrorBoundary onReset → TanStack Query reset");
        reset();
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
