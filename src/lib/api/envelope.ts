import { NextResponse } from "next/server";
import { STEALTH_ERRORS } from "@/lib/security-edge";

export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "RATE_LIMIT"
  | "SERVER";

export function apiOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true as const, data }, init);
}

export function apiErr(
  code: ApiErrorCode,
  message?: string,
  status?: number,
) {
  const map: Record<ApiErrorCode, { status: number; fallback: string }> = {
    UNAUTHORIZED: { status: 401, fallback: STEALTH_ERRORS.auth },
    FORBIDDEN: { status: 403, fallback: STEALTH_ERRORS.forbidden },
    NOT_FOUND: { status: 404, fallback: STEALTH_ERRORS.notFound },
    VALIDATION: { status: 400, fallback: STEALTH_ERRORS.validation },
    RATE_LIMIT: { status: 429, fallback: STEALTH_ERRORS.rateLimit },
    SERVER: { status: 500, fallback: STEALTH_ERRORS.server },
  };
  const m = map[code];
  return NextResponse.json(
    {
      ok: false as const,
      error: { code, message: message ?? m.fallback },
    },
    { status: status ?? m.status },
  );
}
