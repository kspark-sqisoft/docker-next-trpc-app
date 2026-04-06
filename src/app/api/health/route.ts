import { jsonOk } from "@/lib/http-json";

export async function GET() {
  return jsonOk({ ok: true as const });
}
