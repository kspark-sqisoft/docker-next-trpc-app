/**
 * Next 서버(터미널) 전용 tRPC 인입 로그.
 * `util.inspect` 로 중첩 객체를 펼치고, 배치·superjson(void) 의미를 구조화한다.
 * — 클라이언트는 import 하지 말 것 (route.ts 만 사용).
 */
import { inspect } from "node:util";
import { isFlowLogEnabled } from "@/lib/flow-log";
import { humanizeTrpcProcedureInputCell, previewString } from "@/lib/http-request-log";

const SERVER_TRPC_BODY_MAX_BYTES = 2_000_000;

const ANSI = {
  dim: "\x1b[90m",
  cyan: "\x1b[36;1m",
  reset: "\x1b[0m",
} as const;

function parseUrl(urlString: string): URL {
  return new URL(
    urlString.startsWith("http://") || urlString.startsWith("https://")
      ? urlString
      : `http://trpc.flow.local${urlString.startsWith("/") ? "" : "/"}${urlString}`,
  );
}

function extractProcedures(urlString: string): string[] {
  try {
    const u = parseUrl(urlString);
    const m = u.pathname.match(/\/api\/trpc\/(.+)$/);
    if (!m?.[1]) return [];
    return m[1].split(",").filter(Boolean);
  } catch {
    return [];
  }
}

function buildCallsFromBatchPayload(
  parsedBatch: Record<string, unknown>,
  procedures: string[],
): Array<{
  batchIndex: number;
  procedure: string | null;
  input: unknown;
}> {
  const numericKeys = Object.keys(parsedBatch)
    .filter((k) => /^\d+$/.test(k))
    .sort((a, b) => Number(a) - Number(b));
  return numericKeys.map((k) => {
    const i = Number(k);
    const cell = parsedBatch[k];
    return {
      batchIndex: i,
      procedure: procedures[i] ?? null,
      input: humanizeTrpcProcedureInputCell(cell),
    };
  });
}

function buildGetDebugRecord(url: string): {
  headline: string;
  record: Record<string, unknown>;
} | null {
  if (!url.includes("/api/trpc")) return null;
  let pathname = "/api/trpc";
  try {
    pathname = parseUrl(url).pathname;
  } catch {
    /* keep */
  }
  const procedures = extractProcedures(url);
  const u = parseUrl(url);
  const batch = u.searchParams.get("batch");
  const inputEnc = u.searchParams.get("input");

  const record: Record<string, unknown> = {
    transport: {
      protocol: "tRPC over HTTP",
      method: "GET",
      pathname,
      wireFormat:
        "Path = procedure(s); query batch + input (URI-encoded JSON, superjson per slot)",
    },
    routing: {
      procedures,
      batch: batch ?? null,
      note: "Correlates with the raw access-log line (percent-encoded input=…)",
    },
  };

  if (inputEnc != null) {
    try {
      const decoded = decodeURIComponent(inputEnc);
      const parsed = JSON.parse(decoded) as Record<string, unknown>;
      record.parsedInput = {
        decodedCharLength: decoded.length,
        decodedPreview: previewString(decoded, 320),
        batchCalls: buildCallsFromBatchPayload(parsed, procedures),
      };
    } catch (e) {
      record.parsedInput = {
        error: e instanceof Error ? e.message : String(e),
        rawPreview: previewString(inputEnc, 160),
      };
    }
  } else {
    record.parsedInput = { note: "no `input` query param" };
  }

  const procLabel = procedures.length ? procedures.join(", ") : "—";
  const headline = `GET  ${pathname}  [${procLabel}]  batch=${batch ?? "—"}`;

  return { headline, record };
}

function emitTrpcServerBlock(
  headline: string,
  record: Record<string, unknown>,
): void {
  if (!isFlowLogEnabled()) return;
  const banner = `${ANSI.dim}[trpc.server]${ANSI.reset} ${ANSI.cyan}${headline}${ANSI.reset}`;
  const body = inspect(record, {
    depth: 16,
    colors: true,
    maxArrayLength: 40,
    breakLength: 100,
    compact: false,
    sorted: true,
  });
  console.log(`${banner}\n${body}\n`);
}

export function logTrpcServerIncomingGet(url: string): void {
  if (!isFlowLogEnabled()) return;
  const built = buildGetDebugRecord(url);
  if (!built) return;
  emitTrpcServerBlock(built.headline, built.record);
}

export async function captureTrpcServerPostLogSnapshot(
  req: Request,
): Promise<{ headline: string; record: Record<string, unknown> } | null> {
  if (!isFlowLogEnabled()) return null;
  const url = req.url;
  if (!url.includes("/api/trpc")) return null;
  if ((req.method || "").toUpperCase() !== "POST") return null;

  let pathname = "/api/trpc";
  try {
    pathname = parseUrl(url).pathname;
  } catch {
    /* keep */
  }
  const procedures = extractProcedures(url);

  let parsedBody: unknown;
  try {
    const text = await req.clone().text();
    if (text.length > SERVER_TRPC_BODY_MAX_BYTES) {
      parsedBody = {
        tooLargeBytes: text.length,
        preview: previewString(text, 400),
      };
    } else if (text) {
      try {
        const parsed = JSON.parse(text) as Record<string, unknown>;
        parsedBody = {
          decodedCharLength: text.length,
          decodedPreview: previewString(text, 320),
          batchCalls: buildCallsFromBatchPayload(parsed, procedures),
        };
      } catch (e) {
        parsedBody = {
          jsonParseError: e instanceof Error ? e.message : String(e),
          preview: previewString(text, 400),
        };
      }
    } else {
      parsedBody = { note: "empty body" };
    }
  } catch (e) {
    parsedBody = {
      readError: e instanceof Error ? e.message : String(e),
    };
  }

  const procLabel = procedures.length ? procedures.join(", ") : "—";
  const headline = `POST ${pathname}  [${procLabel}]`;

  return {
    headline,
    record: {
      transport: {
        protocol: "tRPC over HTTP",
        method: "POST",
        pathname,
        wireFormat: "JSON body — one superjson cell per batch index",
      },
      routing: {
        procedures,
        note: "Correlates with the raw POST access-log line above",
      },
      parsedBody,
    },
  };
}

export function logTrpcServerPostFromSnapshot(
  headline: string,
  record: Record<string, unknown>,
): void {
  emitTrpcServerBlock(headline, record);
}
