/**
 * Node-side security utilities (crypto available).
 * Edge middleware must import from security-edge only.
 */

export {
  STEALTH_ERRORS,
  SECURITY_HEADERS,
  PROTECTED_PREFIXES,
  isProtectedPath,
  allowedRolesForPath,
  rateLimit,
  maskEmail,
  maskId,
  SESSION_COOKIE,
} from "@/lib/security-edge";

import { createHash, randomBytes, timingSafeEqual } from "crypto";

export function fingerprintSignal(parts: string[]): string {
  return createHash("sha256")
    .update(parts.filter(Boolean).join("|"))
    .digest("hex")
    .slice(0, 16);
}

export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) {
    timingSafeEqual(ba, ba);
    return false;
  }
  return timingSafeEqual(ba, bb);
}

export function generateCsrfToken(): string {
  return randomBytes(24).toString("base64url");
}
