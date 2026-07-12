/**
 * Edge-safe security helpers (no Node crypto).
 * Used by middleware.
 */

export const STEALTH_ERRORS = {
  auth: "Authentication failed.",
  forbidden: "Access denied.",
  notFound: "Resource not found.",
  rateLimit: "Too many requests. Try again later.",
  validation: "Invalid request.",
  server: "Service temporarily unavailable.",
} as const;

export const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  "X-DNS-Prefetch-Control": "off",
  "Permissions-Policy":
    "camera=(self), microphone=(self), geolocation=(), payment=(), usb=(), interest-cohort=()",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
  "X-Permitted-Cross-Domain-Policies": "none",
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join("; "),
};

export const PROTECTED_PREFIXES = [
  "/provider",
  "/client",
  "/ops",
  "/admin",
  "/api/providers",
  "/api/credentials",
  "/api/trust",
  "/api/match",
  "/api/contracts",
  "/api/bookings",
  "/api/requests",
  "/api/incidents",
  "/api/kpi",
];

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export function allowedRolesForPath(pathname: string): string[] | null {
  if (pathname.startsWith("/ops")) return ["OPS", "ADMIN"];
  if (pathname.startsWith("/admin")) return ["ADMIN"];
  if (pathname.startsWith("/provider")) return ["PROVIDER", "ADMIN"];
  if (pathname.startsWith("/client")) return ["CLIENT", "ADMIN"];
  return null;
}

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function rateLimit(input: {
  key: string;
  limit: number;
  windowMs: number;
}): { ok: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  let b = buckets.get(input.key);
  if (!b || now >= b.resetAt) {
    b = { count: 0, resetAt: now + input.windowMs };
    buckets.set(input.key, b);
  }
  b.count += 1;
  return {
    ok: b.count <= input.limit,
    remaining: Math.max(0, input.limit - b.count),
    resetAt: b.resetAt,
  };
}

/** Mask email without crypto */
export function maskEmail(email: string | null | undefined): string {
  if (!email || !email.includes("@")) return "•••";
  const [user, domain] = email.split("@");
  if (user.length <= 2) return `••@${domain}`;
  return `${user.slice(0, 2)}•••@${domain}`;
}

export function maskId(value: string | null | undefined, visible = 4): string {
  if (!value) return "••••";
  if (value.length <= visible) return "•".repeat(value.length);
  return `${"•".repeat(Math.max(0, value.length - visible))}${value.slice(-visible)}`;
}

export const SESSION_COOKIE =
  process.env.NODE_ENV === "production"
    ? "__Secure-aegis.session-token"
    : "aegis.session-token";
