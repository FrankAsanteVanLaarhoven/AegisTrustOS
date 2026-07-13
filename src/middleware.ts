import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import {
  SECURITY_HEADERS,
  isProtectedPath,
  allowedRolesForPath,
  rateLimit,
  STEALTH_ERRORS,
  SESSION_COOKIE,
} from "@/lib/security-edge";
import { upstashRateLimit } from "@/lib/adapters/rate-limit/upstash";

function applySecurityHeaders(res: NextResponse) {
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
    if (v) res.headers.set(k, v);
  }
  res.headers.delete("x-powered-by");
  res.headers.delete("X-Powered-By");
  return res;
}

async function limit(
  key: string,
  limitN: number,
  windowMs: number,
): Promise<{ ok: boolean; remaining: number; resetAt: number }> {
  if (
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    try {
      return await upstashRateLimit({ key, limit: limitN, windowMs });
    } catch {
      /* fall through to memory */
    }
  }
  return rateLimit({ key, limit: limitN, windowMs });
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Cron / webhooks: skip session gate (route handlers verify secrets)
  if (
    pathname === "/api/v1/ops/expiry" ||
    pathname.startsWith("/api/v1/idv/webhook") ||
    pathname.startsWith("/api/v1/payments/webhook") ||
    pathname === "/api/v1/health" ||
    pathname === "/api/v1/ready" ||
    pathname === "/api/v1/metrics"
  ) {
    const res = NextResponse.next();
    return applySecurityHeaders(res);
  }

  if (
    pathname.startsWith("/api/auth") ||
    pathname === "/login" ||
    pathname === "/register"
  ) {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";
    const rl = await limit(
      `auth:${ip}:${pathname}`,
      pathname.startsWith("/api/auth") ? 30 : 40,
      60_000,
    );
    if (!rl.ok) {
      const res = NextResponse.json(
        { error: STEALTH_ERRORS.rateLimit },
        { status: 429 },
      );
      res.headers.set("Retry-After", "60");
      return applySecurityHeaders(res);
    }
  }

  {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";
    const rl = await limit(`global:${ip}`, 300, 60_000);
    if (!rl.ok) {
      const res = new NextResponse(STEALTH_ERRORS.rateLimit, { status: 429 });
      return applySecurityHeaders(res);
    }
  }

  if (isProtectedPath(pathname)) {
    const token = await getToken({
      req,
      secret: process.env.AUTH_SECRET,
      cookieName: SESSION_COOKIE,
      secureCookie: process.env.NODE_ENV === "production",
    });

    const uid = token?.sub ?? (token as { id?: string } | null)?.id;
    if (!uid) {
      if (pathname.startsWith("/api/")) {
        return applySecurityHeaders(
          NextResponse.json({ error: STEALTH_ERRORS.auth }, { status: 401 }),
        );
      }
      const login = new URL("/login", req.url);
      login.searchParams.set("next", pathname);
      return applySecurityHeaders(NextResponse.redirect(login));
    }

    const role = String(token?.role ?? "");
    const allowed = allowedRolesForPath(pathname);
    if (allowed && !allowed.includes(role)) {
      if (pathname.startsWith("/api/")) {
        return applySecurityHeaders(
          NextResponse.json(
            { error: STEALTH_ERRORS.forbidden },
            { status: 403 },
          ),
        );
      }
      return applySecurityHeaders(NextResponse.redirect(new URL("/", req.url)));
    }
  }

  const res = NextResponse.next();
  res.headers.set(
    "X-Request-Id",
    req.headers.get("x-request-id") ??
      `aeg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`,
  );
  return applySecurityHeaders(res);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
