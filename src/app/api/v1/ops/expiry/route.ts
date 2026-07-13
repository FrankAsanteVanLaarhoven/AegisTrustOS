import { auth } from "@/lib/auth";
import { apiOk, apiErr } from "@/lib/api/envelope";
import {
  listExpiringCredentials,
  runCredentialExpirySweep,
} from "@/lib/services/expiry-service";
import { safeEqual } from "@/lib/security";

export const dynamic = "force-dynamic";

/**
 * Authorize OPS session or CRON_SECRET (Vercel cron / GitHub Actions).
 * Headers: Authorization: Bearer <secret>  or  X-Aegis-Cron: <secret>
 */
async function authorizeCronOrOps(req: Request): Promise<
  | { ok: true; actor: string }
  | { ok: false; response: Response }
> {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authz = req.headers.get("authorization") ?? "";
    const bearer = authz.startsWith("Bearer ") ? authz.slice(7) : "";
    const header = req.headers.get("x-aegis-cron") ?? "";
    // Vercel Cron sends Authorization: Bearer <CRON_SECRET> when configured
    if (
      (bearer && safeEqual(bearer, cronSecret)) ||
      (header && safeEqual(header, cronSecret))
    ) {
      return { ok: true, actor: "cron" };
    }
  }

  const session = await auth();
  if (!session?.user) {
    return { ok: false, response: apiErr("UNAUTHORIZED") };
  }
  if (session.user.role !== "OPS" && session.user.role !== "ADMIN") {
    return { ok: false, response: apiErr("FORBIDDEN") };
  }
  return { ok: true, actor: session.user.id };
}

export async function GET(req: Request) {
  const authz = await authorizeCronOrOps(req);
  if (!authz.ok) return authz.response;

  const rows = await listExpiringCredentials(90);
  return apiOk({
    count: rows.length,
    credentials: rows.map((c) => ({
      id: c.id,
      title: c.title,
      type: c.type,
      status: c.verificationStatus,
      expiresAt: c.expiresAt,
      provider: c.provider.user.name,
      providerId: c.providerId,
    })),
  });
}

export async function POST(req: Request) {
  const authz = await authorizeCronOrOps(req);
  if (!authz.ok) return authz.response;

  const report = await runCredentialExpirySweep({ notify: true });
  return apiOk({ ...report, actor: authz.actor });
}
