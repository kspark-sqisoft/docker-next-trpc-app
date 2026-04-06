import { NextResponse } from "next/server";

export function jsonError(message: string, status: number) {
  return NextResponse.json({ message }, { status });
}

export function jsonOk<T>(body: T, init?: ResponseInit) {
  return NextResponse.json(body, init);
}
