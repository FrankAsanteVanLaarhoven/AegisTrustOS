import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiOk, apiErr } from "@/lib/api/envelope";
import { getContainer } from "@/lib/container";
import { writeAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return apiErr("UNAUTHORIZED");
  if (session.user.role !== "CLIENT" && session.user.role !== "ADMIN") {
    return apiErr("FORBIDDEN");
  }

  const client = await db.clientProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!client && session.user.role === "CLIENT") return apiErr("NOT_FOUND");

  let body: {
    amountPence?: number;
    bookingId?: string;
    providerId?: string;
    description?: string;
  };
  try {
    body = await req.json();
  } catch {
    return apiErr("VALIDATION");
  }

  const amountPence = Number(body.amountPence ?? 0);
  if (!amountPence || amountPence < 100) {
    return apiErr("VALIDATION", "amountPence must be ≥ 100");
  }

  const { payments } = getContainer();
  const intent = await payments.createIntent({
    amountPence,
    clientId: client?.id ?? session.user.id,
    bookingId: body.bookingId,
    providerId: body.providerId,
    description: body.description ?? "Aegis service booking",
  });

  await writeAudit({
    actorId: session.user.id,
    entityType: "PaymentIntent",
    entityId: intent.id,
    action: "PAYMENT_INTENT_CREATE",
    payload: { amountPence, bookingId: body.bookingId },
  });

  return apiOk(intent);
}
