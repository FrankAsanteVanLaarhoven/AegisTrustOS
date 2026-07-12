import { auth } from "@/lib/auth";
import { apiOk, apiErr } from "@/lib/api/envelope";
import {
  listExpiringCredentials,
  runCredentialExpirySweep,
} from "@/lib/services/expiry-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) return apiErr("UNAUTHORIZED");
  if (session.user.role !== "OPS" && session.user.role !== "ADMIN") {
    return apiErr("FORBIDDEN");
  }

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

export async function POST() {
  const session = await auth();
  if (!session?.user) return apiErr("UNAUTHORIZED");
  if (session.user.role !== "OPS" && session.user.role !== "ADMIN") {
    return apiErr("FORBIDDEN");
  }

  const report = await runCredentialExpirySweep({ notify: true });
  return apiOk(report);
}
