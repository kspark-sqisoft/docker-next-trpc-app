import { isFlowLogEnabled } from "@/lib/flow-log";

let seq = 0;

export function nextHttpLogId(): number {
  return ++seq;
}

const DEFAULT_MAX = 4_000;
const LARGE_JSON = 3_500;

/** DevTools 에서만 %c 가 풀 컬러; Node 터미널은 ANSI */
function isBrowserRuntime(): boolean {
  return (
    typeof globalThis !== "undefined" &&
    typeof (globalThis as { document?: unknown }).document !== "undefined"
  );
}

const ANSI = {
  dim: "\x1b[90m",
  blue: "\x1b[34;1m",
  green: "\x1b[32;1m",
  yellow: "\x1b[33;1m",
  red: "\x1b[31;1m",
  reset: "\x1b[0m",
} as const;

const CSS = {
  tag: "color:#8b949e;font-weight:bold",
  req: "color:#58a6ff;font-weight:bold",
  res2xx: "color:#3fb950;font-weight:bold",
  res4xx: "color:#d29922;font-weight:bold",
  res5xx: "color:#f85149;font-weight:bold",
  err: "color:#f85149;font-weight:bold",
} as const;

function responseLabelStyle(status: number): { browser: string; ansi: string } {
  if (status >= 500) {
    return { browser: CSS.res5xx, ansi: ANSI.red };
  }
  if (status >= 400) {
    return { browser: CSS.res4xx, ansi: ANSI.yellow };
  }
  return { browser: CSS.res2xx, ansi: ANSI.green };
}

function logHttpLineStyled(
  tag: string,
  lineLabel: string,
  labelKind: "req" | "res" | "err",
  statusForRes?: number,
  extra?: unknown,
): void {
  if (!isFlowLogEnabled()) return;

  if (isBrowserRuntime()) {
    const labelStyle =
      labelKind === "req"
        ? CSS.req
        : labelKind === "err"
          ? CSS.err
          : responseLabelStyle(statusForRes ?? 0).browser;
    const format = `%c[flow:${tag}]%c ${lineLabel}`;
    const args: unknown[] = [format, CSS.tag, labelStyle];
    if (extra !== undefined) {
      args.push(extra);
    }
    console.log(...args);
    return;
  }

  const ansiLabel =
    labelKind === "req"
      ? ANSI.blue
      : labelKind === "err"
        ? ANSI.red
        : responseLabelStyle(statusForRes ?? 0).ansi;
  const prefix = `${ANSI.dim}[flow:${tag}]${ANSI.reset}`;
  const colored = `${ansiLabel}${lineLabel}${ANSI.reset}`;
  if (extra !== undefined) {
    console.log(`${prefix} ${colored}`, extra);
  } else {
    console.log(`${prefix} ${colored}`);
  }
}

export function previewString(s: string, max = DEFAULT_MAX): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max)}…(총 ${s.length}자)`;
}

function parseUrl(urlString: string): URL {
  return new URL(
    urlString.startsWith("http://") || urlString.startsWith("https://")
      ? urlString
      : `http://trpc.flow.local${urlString.startsWith("/") ? "" : "/"}${urlString}`,
  );
}

/** 모든 요청 URL의 쿼리스트링을 키·값으로 풀기 (input 은 너무 길면 짧게만) */
function decodeAllQueryParamsForLog(urlString: string): Record<string, string> | null {
  try {
    const u = parseUrl(urlString);
    const o: Record<string, string> = {};
    u.searchParams.forEach((v, k) => {
      if (k === "input" && v.length > 80) {
        try {
          const dec = decodeURIComponent(v);
          o[k] =
            previewString(dec, 220) +
            ` …(인코딩 길이 ${v.length}자, 구조는 아래 입력_풀이 참고)`;
        } catch {
          o[k] = previewString(v, 220) + ` …(전체 ${v.length}자)`;
        }
      } else {
        o[k] = v.length > 400 ? previewString(v, 400) : v;
      }
    });
    return Object.keys(o).length > 0 ? o : null;
  } catch {
    return null;
  }
}

/** base64(또는 url-safe) 문자열을 UTF-8 JSON 으로 해석 (커서 토큰용) */
function tryDecodeBase64Json(s: string): unknown {
  try {
    const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
    const normalized = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
    let json: string;
    if (typeof Buffer !== "undefined") {
      json = Buffer.from(normalized, "base64").toString("utf8");
    } else if (typeof atob !== "undefined") {
      json = atob(normalized);
    } else {
      return null;
    }
    return JSON.parse(json) as unknown;
  } catch {
    return null;
  }
}

/**
 * 배치 셀 `{ json, meta? }` (superjson) → 프로시저 인자 의미.
 * `json:null` + `meta.values:["undefined"]` 는 인자 없는 query 가 흔한 형태.
 */
export function humanizeTrpcProcedureInputCell(cell: unknown): unknown {
  if (
    cell === null ||
    typeof cell !== "object" ||
    Array.isArray(cell) ||
    !("json" in cell)
  ) {
    return cell;
  }
  const c = cell as {
    json: unknown;
    meta?: { values?: unknown[]; v?: number; [key: string]: unknown };
  };
  const { json, meta } = c;

  const voidUndefined =
    json === null &&
    meta != null &&
    typeof meta === "object" &&
    Array.isArray(meta.values) &&
    meta.values.includes("undefined");

  if (voidUndefined) {
    return {
      kind: "void",
      meaning: "no input (undefined); superjson uses null+json.meta",
      superjson: { values: meta!.values, v: meta!.v },
    };
  }

  const shaped = humanizeTrpcInputJson(json);
  const metaObj = meta && typeof meta === "object" ? (meta as object) : null;
  const metaKeys = metaObj ? Object.keys(metaObj) : [];
  if (metaKeys.length > 0) {
    return {
      kind: "value+meta",
      input: shaped,
      superjsonMeta: meta,
    };
  }
  return shaped;
}

/** tRPC HTTP: `input` 안의 superjson 셀 `{ json, meta? }` 를 풀고 커서는 base64 해석 */
function humanizeTrpcInputJson(json: unknown): unknown {
  if (json === null || typeof json !== "object" || Array.isArray(json)) {
    return json;
  }
  const o = { ...(json as Record<string, unknown>) };
  if (typeof o.cursor === "string" && o.cursor.length > 8) {
    const decoded = tryDecodeBase64Json(o.cursor);
    if (decoded != null) {
      o.cursor = {
        _설명: "base64(JSON) 커서 → 디코드",
        rawPreview: previewString(o.cursor, 48),
        decoded,
      };
    }
  }
  return o;
}

function humanizeTrpcBatchInputParam(parsed: unknown): unknown {
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return parsed;
  }
  const batch = parsed as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [idx, cell] of Object.entries(batch)) {
    if (idx.startsWith("_")) {
      out[idx] = cell;
      continue;
    }
    if (
      cell !== null &&
      typeof cell === "object" &&
      !Array.isArray(cell) &&
      "json" in cell
    ) {
      out[`호출[${idx}]`] = humanizeTrpcProcedureInputCell(cell);
    } else {
      out[idx] = cell;
    }
  }
  return out;
}

/**
 * GET /api/trpc/post.xxx?batch=1&input=…
 */
export function decodeTrpcGetUrlForLog(urlString: string): Record<string, unknown> | null {
  if (!urlString.includes("/api/trpc")) return null;
  const upper = urlString.toUpperCase();
  if (!upper.includes("INPUT=") && !urlString.includes("input=")) return null;

  try {
    const u = parseUrl(urlString);
    const pathMatch = u.pathname.match(/\/api\/trpc\/(.+)$/);
    const procSegment = pathMatch?.[1] ?? "";
    const procedures = procSegment.split(",").filter(Boolean);
    const batch = u.searchParams.get("batch");
    const inputEnc = u.searchParams.get("input");

    const result: Record<string, unknown> = {
      프로시저: procedures.length > 0 ? procedures : "(경로에서 추출 실패)",
      batch,
    };

    if (inputEnc != null) {
      result.input_URI디코드_앞부분 = previewString(
        decodeURIComponent(inputEnc),
        200,
      );
      try {
        const parsed: unknown = JSON.parse(decodeURIComponent(inputEnc));
        result.input_JSON_해석 = humanizeTrpcBatchInputParam(parsed);
      } catch (e) {
        result.input_JSON_파싱실패 = e instanceof Error ? e.message : String(e);
      }
    }

    return result;
  } catch (e) {
    return {
      _오류: "URL 파싱 실패",
      message: e instanceof Error ? e.message : String(e),
      urlPreview: previewString(urlString, 120),
    };
  }
}

export function decodeTrpcPostBodyForLog(bodyString: string): unknown {
  try {
    const parsed: unknown = JSON.parse(bodyString);
    return humanizeTrpcBatchInputParam(parsed);
  } catch (e) {
    return {
      _오류: "POST 본문 JSON 파싱 실패",
      message: e instanceof Error ? e.message : String(e),
      앞부분: previewString(bodyString, 200),
    };
  }
}

function unwrapSuperjsonDataCell(d: unknown): unknown {
  if (d !== null && typeof d === "object" && !Array.isArray(d) && "json" in d) {
    const cell = d as { json: unknown; meta?: unknown };
    const hasMeta =
      cell.meta != null &&
      typeof cell.meta === "object" &&
      Object.keys(cell.meta as object).length > 0;
    return {
      _설명: hasMeta
        ? "superjson: json 은 직렬화된 값, meta 에 Date 등 복원 힌트"
        : "superjson json 래핑",
      값: limitLargeJsonForLog(cell.json),
      ...(hasMeta ? { meta_있음: true } : {}),
    };
  }
  return limitLargeJsonForLog(d);
}

function limitLargeJsonForLog(v: unknown): unknown {
  try {
    const s = JSON.stringify(v);
    if (s.length <= LARGE_JSON) return v;
    return {
      _알림: `JSON이 큼(${s.length}자)`,
      미리보기: previewString(s, LARGE_JSON),
    };
  } catch {
    return v;
  }
}

function humanizeTrpcResponseItem(item: unknown): unknown {
  if (item === null || typeof item !== "object" || Array.isArray(item)) {
    return item;
  }
  const o = item as Record<string, unknown>;
  if ("error" in o) {
    const err = o.error;
    return {
      유형: "오류",
      error: limitLargeJsonForLog(err),
    };
  }
  if ("result" in o && o.result !== null && typeof o.result === "object") {
    const r = o.result as Record<string, unknown>;
    if ("data" in r) {
      return {
        유형: "성공",
        data: unwrapSuperjsonDataCell(r.data),
      };
    }
    return { 유형: "result", result: limitLargeJsonForLog(o.result) };
  }
  return limitLargeJsonForLog(o);
}

/** tRPC /api/trpc 응답 JSON → 배치면 항목별로 풀기 */
function decodeTrpcResponseBodyForLog(bodyText: string): unknown {
  try {
    const parsed: unknown = JSON.parse(bodyText);
    if (Array.isArray(parsed)) {
      return {
        _설명: "배치 응답: 배열 인덱스 = 위 요청의 호출[0], 호출[1]… 와 대응",
        항목들: Object.fromEntries(
          parsed.map((item, i) => [`응답[${i}]`, humanizeTrpcResponseItem(item)]),
        ),
      };
    }
    return humanizeTrpcResponseItem(parsed);
  } catch (e) {
    return {
      _오류: "JSON 파싱 실패",
      message: e instanceof Error ? e.message : String(e),
      앞부분: previewString(bodyText, 240),
    };
  }
}

/** REST JSON 응답(회원가입·업로드 등) */
function decodeRestResponseForLog(bodyText: string): unknown {
  try {
    const parsed: unknown = JSON.parse(bodyText);
    return limitLargeJsonForLog(parsed);
  } catch {
    return { _설명: "JSON 아님", 텍스트앞부분: previewString(bodyText, 400) };
  }
}

function decodeResponseForLog(bodyText: string, url: string): unknown {
  const u = url.toLowerCase();
  if (u.includes("/api/trpc")) {
    return decodeTrpcResponseBodyForLog(bodyText);
  }
  if (
    bodyText.trim().startsWith("{") ||
    bodyText.trim().startsWith("[")
  ) {
    return decodeRestResponseForLog(bodyText);
  }
  return previewString(bodyText, DEFAULT_MAX);
}

/** JSON 문자열이면 password 등 민감 키는 마스킹 후 길이 제한 */
export function sanitizeJsonBodyString(input: string): string {
  try {
    const v = JSON.parse(input) as unknown;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const o = { ...(v as Record<string, unknown>) };
      for (const k of Object.keys(o)) {
        if (/password|passwd|secret|token/i.test(k)) {
          o[k] = "[REDACTED]";
        }
      }
      return previewString(JSON.stringify(o));
    }
  } catch {
    /* fallthrough */
  }
  return previewString(input);
}

export function describeRequestBody(
  opts: RequestInit | undefined,
): string | undefined {
  const b = opts?.body;
  if (b == null) return undefined;
  if (typeof b === "string") {
    return sanitizeJsonBodyString(b);
  }
  if (typeof FormData !== "undefined" && b instanceof FormData) {
    const keys: string[] = [];
    const files: string[] = [];
    b.forEach((val, k) => {
      keys.push(k);
      if (typeof File !== "undefined" && val instanceof File) {
        files.push(`${k}:File(${val.name}, ${val.size}b, ${val.type || "?"})`);
      }
    });
    return `[FormData 키: ${keys.join(", ") || "(empty)"}${files.length ? ` | ${files.join("; ")}` : ""}]`;
  }
  return `[${Object.prototype.toString.call(b)}]`;
}

function extractTrpcProceduresFromPath(urlString: string): string[] | null {
  try {
    const u = parseUrl(urlString);
    const m = u.pathname.match(/\/api\/trpc\/(.+)$/);
    if (!m?.[1]) return null;
    return m[1].split(",").filter(Boolean);
  } catch {
    return null;
  }
}

function buildRequestReadable(
  url: string,
  method: string,
  init?: RequestInit,
): Record<string, unknown> {
  const m = (method || "GET").toUpperCase();
  const out: Record<string, unknown> = {
    method: m,
    url,
  };

  const query = decodeAllQueryParamsForLog(url);
  if (query) {
    out.쿼리파라미터 = query;
  }

  const procs = extractTrpcProceduresFromPath(url);
  if (procs?.length) {
    out.경로_프로시저 = procs;
  }

  if (init) {
    const desc = describeRequestBody(init);
    if (desc !== undefined) {
      out.본문_요약문자열 = desc;
    }
  }

  if (url.includes("/api/trpc")) {
    if (m === "GET") {
      const g = decodeTrpcGetUrlForLog(url);
      if (g) {
        out.입력_풀이_GET = g;
      }
    } else if (m === "POST" && init?.body != null && typeof init.body === "string") {
      out.입력_풀이_POST_JSON = decodeTrpcPostBodyForLog(init.body);
    }
  } else if (m === "POST" && init?.body != null && typeof init.body === "string") {
    try {
      const raw = init.body;
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const safe = { ...parsed };
      for (const k of Object.keys(safe)) {
        if (/password|passwd|secret|token/i.test(k)) {
          safe[k] = "[REDACTED]";
        }
      }
      out.본문_JSON_풀이 = limitLargeJsonForLog(safe);
    } catch {
      out.본문_JSON_풀이 = `(JSON 아님) ${previewString(init.body, 300)}`;
    }
  }

  return out;
}

export function logHttpRequest(
  tag: string,
  id: number,
  data: { url: string; method: string; init?: RequestInit },
): void {
  const readable = buildRequestReadable(data.url, data.method, data.init);
  logHttpLineStyled(tag, `요청 #${id}`, "req", undefined, {
    알아보기: readable,
  });
}

export function logHttpResponse(
  tag: string,
  id: number,
  data: {
    url: string;
    status: number;
    statusText: string;
    ok: boolean;
    bodyText: string;
  },
): void {
  const decoded = decodeResponseForLog(data.bodyText, data.url);
  logHttpLineStyled(
    tag,
    `응답 #${id}  HTTP ${data.status} ${data.statusText}`,
    "res",
    data.status,
    {
      status: data.status,
      statusText: data.statusText,
      ok: data.ok,
      본문_원문_미리보기: previewString(data.bodyText, DEFAULT_MAX),
      응답_풀이: decoded,
    },
  );
}

export function logHttpFetchFailure(
  tag: string,
  id: number,
  message: string,
): void {
  logHttpLineStyled(tag, `응답 #${id} (fetch 실패)`, "err", undefined, {
    message,
  });
}

export async function fetchWithFlowLog(
  url: string,
  init: RequestInit,
  tag: string,
): Promise<Response> {
  const id = nextHttpLogId();
  logHttpRequest(tag, id, {
    url,
    method: (init.method as string) ?? "GET",
    init,
  });
  try {
    const res = await fetch(url, init);
    const bodyText = await res.clone().text();
    logHttpResponse(tag, id, {
      url,
      status: res.status,
      statusText: res.statusText,
      ok: res.ok,
      bodyText,
    });
    return res;
  } catch (e) {
    logHttpFetchFailure(
      tag,
      id,
      e instanceof Error ? e.message : String(e),
    );
    throw e;
  }
}
