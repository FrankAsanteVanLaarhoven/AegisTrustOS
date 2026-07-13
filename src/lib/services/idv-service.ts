import { db } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import type { IdvResult, IdvSession } from "@/lib/idv/provider";
import { getIdvProvider } from "@/lib/idv/provider";
import { log } from "@/lib/observability/logger";
import type { IdvStatus, IdvVendor } from "@prisma/client";

function mapVendor(v: IdvSession["vendor"]): IdvVendor {
  if (v === "TRULIOO") return "TRULIOO";
  if (v === "SOCURE") return "SOCURE";
  if (v === "MOCK") return "MOCK";
  return "OTHER";
}

function mapStatus(s: IdvResult["status"]): IdvStatus {
  if (s === "PASSED") return "PASSED";
  if (s === "FAILED") return "FAILED";
  if (s === "EXPIRED") return "EXPIRED";
  return "PENDING";
}

/**
 * Start an IDV check for a provider and persist a PENDING IdvCheck
 * keyed by vendor externalRef for later webhook completion.
 */
export async function startProviderIdv(input: {
  providerProfileId: string;
  fullName: string;
  email: string;
  dateOfBirth?: string;
  actorId?: string;
}) {
  const idv = getIdvProvider();
  const session = await idv.startCheck({
    fullName: input.fullName,
    email: input.email,
    dateOfBirth: input.dateOfBirth,
  });

  // Mock vendor resolves synchronously; live vendors stay PENDING for webhooks.
  let result: IdvResult | null = null;
  if (session.vendor === "MOCK" || session.status !== "PENDING") {
    result = await idv.getResult(session.sessionId);
  }

  const check = await db.idvCheck.create({
    data: {
      providerProfileId: input.providerProfileId,
      vendor: mapVendor(session.vendor),
      externalRef: session.sessionId,
      status: result ? mapStatus(result.status) : "PENDING",
      livenessScore: result?.livenessScore ?? null,
      completedAt: result && result.status !== "PENDING" ? new Date() : null,
      rawResultJson: JSON.stringify(result?.raw ?? { session, awaitingWebhook: !result }),
    },
  });

  if (input.actorId) {
    await writeAudit({
      actorId: input.actorId,
      entityType: "IdvCheck",
      entityId: check.id,
      action: "IDV_STARTED",
      payload: {
        vendor: session.vendor,
        externalRef: session.sessionId,
        status: check.status,
      },
      eventType: "provider.idv_started",
    });
  }

  return { check, session, result };
}

/**
 * Apply a vendor webhook / poll result to an existing IdvCheck by externalRef.
 * Idempotent for terminal statuses.
 */
export async function applyIdvWebhookResult(input: {
  externalRef: string;
  status: IdvResult["status"];
  livenessScore?: number | null;
  raw?: Record<string, unknown>;
  actorId?: string;
}) {
  const check = await db.idvCheck.findFirst({
    where: { externalRef: input.externalRef },
    orderBy: { createdAt: "desc" },
  });
  if (!check) {
    log.warn("idv_webhook_unknown_ref", { externalRef: input.externalRef });
    return null;
  }

  if (check.status === "PASSED" || check.status === "FAILED") {
    // Already terminal — ignore duplicate callbacks
    return check;
  }

  const status = mapStatus(input.status);
  const prev = (() => {
    try {
      return JSON.parse(check.rawResultJson) as Record<string, unknown>;
    } catch {
      return {};
    }
  })();

  const updated = await db.idvCheck.update({
    where: { id: check.id },
    data: {
      status,
      livenessScore: input.livenessScore ?? check.livenessScore,
      completedAt: status === "PENDING" ? null : new Date(),
      rawResultJson: JSON.stringify({
        ...prev,
        webhook: input.raw ?? {},
        webhookAppliedAt: new Date().toISOString(),
      }),
    },
  });

  await writeAudit({
    actorId: input.actorId,
    entityType: "IdvCheck",
    entityId: updated.id,
    action: "IDV_WEBHOOK",
    payload: {
      externalRef: input.externalRef,
      status: updated.status,
      livenessScore: updated.livenessScore,
    },
    eventType: "provider.idv_webhook",
  });

  log.info("idv_webhook_applied", {
    checkId: updated.id,
    status: updated.status,
  });

  return updated;
}
