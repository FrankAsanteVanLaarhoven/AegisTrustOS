import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { getEnv } = await import("@/config/env");
    const { getFeatures } = await import("@/config/features");
    const env = getEnv();
    return NextResponse.json({
      ok: true as const,
      data: {
        name: "aegis-trust-os",
        version: env.APP_VERSION ?? "0.1.0",
        api: "v1",
        insecureMode: env.insecureMode,
        warnings: env.envWarnings,
        features: getFeatures(),
        invariants: [
          "human_clearance_required_for_verified",
          "ai_advisory_only",
          "hybrid_idv_adapter",
          "dual_control_critical_categories",
          "encrypted_evidence_at_rest",
          "webhook_auth_required_in_production",
        ],
        surfaces: {
          idvWebhook: "/api/v1/idv/webhook",
          paymentsWebhook: "/api/v1/payments/webhook",
          pilotExport: "/api/v1/ops/pilot/export",
          pilotPublic: "/pilot",
          legalTerms: "/legal/terms",
          legalPrivacy: "/legal/privacy",
        },
      },
    });
  } catch (e) {
    return NextResponse.json({
      ok: true as const,
      data: {
        name: "aegis-trust-os",
        version: "0.1.0",
        api: "v1",
        error: e instanceof Error ? e.message : "unknown",
        features: {},
        invariants: [],
      },
    });
  }
}
