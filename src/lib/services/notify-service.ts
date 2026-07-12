import { getContainer } from "@/lib/container";
import { db } from "@/lib/db";
import { log } from "@/lib/observability/logger";

export async function notifyUser(input: {
  userId?: string | null;
  email?: string | null;
  subject: string;
  body: string;
  templateKey?: string;
  meta?: Record<string, unknown>;
}) {
  let to = input.email ?? null;
  if (!to && input.userId) {
    const u = await db.user.findUnique({ where: { id: input.userId } });
    to = u?.email ?? null;
  }
  if (!to) {
    log.warn("notify_skip_no_recipient", { subject: input.subject });
    return null;
  }

  const { notify } = getContainer();
  return notify.send({
    channel: "email",
    to,
    subject: input.subject,
    body: input.body,
    templateKey: input.templateKey,
    meta: input.meta,
  });
}

export async function notifyTrustCleared(providerUserId: string, categorySlug?: string | null) {
  return notifyUser({
    userId: providerUserId,
    subject: "Aegis — category clearance confirmed",
    body: [
      "Your Trust & Safety review is complete.",
      categorySlug ? `Category: ${categorySlug}` : null,
      "An Aegis Passport may have been issued or refreshed on your profile.",
      "Sign in to view your passport and available bookings.",
    ]
      .filter(Boolean)
      .join("\n"),
    templateKey: "trust.cleared",
    meta: { categorySlug },
  });
}

export async function notifyBookingCreated(input: {
  clientUserId: string;
  providerUserId: string;
  title: string;
  bookingId: string;
}) {
  await notifyUser({
    userId: input.clientUserId,
    subject: "Aegis — booking confirmed",
    body: `Your booking "${input.title}" is confirmed (ref ${input.bookingId}).`,
    templateKey: "booking.created",
    meta: { bookingId: input.bookingId },
  });
  await notifyUser({
    userId: input.providerUserId,
    subject: "Aegis — new assignment",
    body: `You have a new booking: "${input.title}" (ref ${input.bookingId}).`,
    templateKey: "booking.assigned",
    meta: { bookingId: input.bookingId },
  });
}

export async function notifyIncident(input: {
  summary: string;
  severity: string;
  providerUserId?: string | null;
  opsEmails?: string[];
}) {
  const ops =
    input.opsEmails ??
    (
      await db.user.findMany({
        where: { role: { in: ["OPS", "ADMIN"] } },
        select: { email: true },
      })
    ).map((u) => u.email);

  for (const email of ops) {
    await notifyUser({
      email,
      subject: `Aegis incident [${input.severity}]`,
      body: input.summary,
      templateKey: "incident.opened",
      meta: { severity: input.severity },
    });
  }

  if (input.providerUserId) {
    await notifyUser({
      userId: input.providerUserId,
      subject: "Aegis — incident under review",
      body: `An incident was opened that may affect your status: ${input.summary}`,
      templateKey: "incident.provider",
    });
  }
}

export async function notifyPassportSuspended(providerUserId: string, reason: string) {
  return notifyUser({
    userId: providerUserId,
    subject: "Aegis Passport suspended",
    body: `Your Aegis Passport has been suspended. Reason: ${reason}. Contact Trust & Safety.`,
    templateKey: "passport.suspended",
  });
}

export async function notifyExpiringCredential(input: {
  providerUserId: string;
  title: string;
  expiresAt: Date;
}) {
  return notifyUser({
    userId: input.providerUserId,
    subject: "Aegis — credential expiring soon",
    body: `Credential "${input.title}" expires on ${input.expiresAt.toISOString().slice(0, 10)}. Upload a renewal to keep clearance active.`,
    templateKey: "credential.expiring",
  });
}
