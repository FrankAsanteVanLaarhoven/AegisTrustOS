import { getIdvProvider } from "@/lib/idv/provider";
import { applyIdvWebhookResult } from "@/lib/services/idv-service";
import { apiOk, apiErr } from "@/lib/api/envelope";
import { log } from "@/lib/observability/logger";

export const dynamic = "force-dynamic";

/**
 * Vendor-agnostic IDV webhook.
 * Auth: IDV_WEBHOOK_SECRET via X-Aegis-Idv-Secret or HMAC X-Aegis-Idv-Signature.
 *
 * Mock body example:
 * { "sessionId": "mock_…", "status": "PASSED", "livenessScore": 0.95 }
 */
export async function POST(req: Request) {
  const rawBody = await req.text();
  const idv = getIdvProvider();

  if (!idv.parseWebhook) {
    return apiErr("SERVER", "IDV provider does not support webhooks");
  }

  let payload;
  try {
    payload = await idv.parseWebhook(req.headers, rawBody);
  } catch (e) {
    log.warn("idv_webhook_auth_failed", {
      error: e instanceof Error ? e.message : "unknown",
    });
    return apiErr("UNAUTHORIZED", "Invalid webhook signature");
  }

  if (!payload) {
    return apiErr("VALIDATION", "Unrecognised webhook payload");
  }

  const check = await applyIdvWebhookResult({
    externalRef: payload.externalRef,
    status: payload.status,
    livenessScore: payload.livenessScore,
    raw: payload.raw,
  });

  if (!check) {
    return apiErr("NOT_FOUND", "No IDV check for session");
  }

  return apiOk({
    checkId: check.id,
    status: check.status,
    externalRef: payload.externalRef,
  });
}
