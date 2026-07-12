import { auth } from "@/lib/auth";
import { apiOk, apiErr } from "@/lib/api/envelope";
import { maskEmail } from "@/lib/security-edge";
import { getUserPartnerMemberships } from "@/lib/tenancy";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) return apiErr("UNAUTHORIZED");

  const memberships = await getUserPartnerMemberships(session.user.id);

  return apiOk({
    id: session.user.id,
    name: session.user.name,
    role: session.user.role,
    emailMasked: maskEmail(session.user.email),
    // Full email only for self endpoint over authenticated channel
    email: session.user.email,
    partners: memberships.map((m) => ({
      id: m.partnerOrg.id,
      slug: m.partnerOrg.slug,
      name: m.partnerOrg.name,
      role: m.role,
      type: m.partnerOrg.type,
    })),
  });
}
