import { getEnv } from "@/config/env";
import { getFeatures } from "@/config/features";
import { apiOk } from "@/lib/api/envelope";

export async function GET() {
  const env = getEnv();
  return apiOk({
    name: "aegis-trust-os",
    version: env.APP_VERSION ?? "0.1.0",
    api: "v1",
    features: getFeatures(),
    invariants: [
      "human_clearance_required_for_verified",
      "ai_advisory_only",
      "hybrid_idv_adapter",
    ],
  });
}
