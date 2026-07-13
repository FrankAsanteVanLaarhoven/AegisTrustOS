import { db } from "@/lib/db";
import { getEnv } from "@/config/env";

export const dynamic = "force-dynamic";

/**
 * Prometheus text exposition format.
 * Scrape: /api/v1/metrics
 */
export async function GET() {
  const env = getEnv();
  const lines: string[] = [];

  const help = (name: string, text: string) => {
    lines.push(`# HELP ${name} ${text}`);
    lines.push(`# TYPE ${name} gauge`);
  };

  let dbUp = 0;
  try {
    await db.$queryRaw`SELECT 1`;
    dbUp = 1;
  } catch {
    dbUp = 0;
  }

  help("aegis_up", "1 if process is serving metrics");
  lines.push("aegis_up 1");

  help("aegis_db_up", "1 if database responds to SELECT 1");
  lines.push(`aegis_db_up ${dbUp}`);

  help("aegis_info", "Build metadata");
  lines.push("# TYPE aegis_info gauge");
  const ver = (env.APP_VERSION ?? "0.1.0").replace(/"/g, "");
  lines.push(
    `aegis_info{version="${ver}",idv="${env.IDV_VENDOR}",payments="${env.PAYMENTS_BACKEND}",notify="${env.NOTIFY_BACKEND}"} 1`,
  );

  // Domain gauges (best-effort; skip on error)
  try {
    const [
      providers,
      verified,
      openIncidents,
      pendingIdv,
      queuedNotify,
      pilotLeads,
      bookingsCompleted,
      reviews,
    ] = await Promise.all([
      db.providerProfile.count(),
      db.providerProfile.count({ where: { overallStatus: "VERIFIED" } }),
      db.incident.count({
        where: { status: { in: ["OPEN", "INVESTIGATING", "ESCALATED"] } },
      }),
      db.idvCheck.count({ where: { status: "PENDING" } }),
      db.notificationOutbox.count({ where: { status: "QUEUED" } }),
      db.pilotLead.count(),
      db.booking.count({ where: { status: "COMPLETED" } }),
      db.review.count(),
    ]);

    help("aegis_providers_total", "Provider profiles");
    lines.push(`aegis_providers_total ${providers}`);

    help("aegis_providers_verified", "Verified providers");
    lines.push(`aegis_providers_verified ${verified}`);

    help("aegis_incidents_open", "Open/investigating/escalated incidents");
    lines.push(`aegis_incidents_open ${openIncidents}`);

    help("aegis_idv_pending", "Pending IDV checks");
    lines.push(`aegis_idv_pending ${pendingIdv}`);

    help("aegis_notify_queued", "Queued notifications");
    lines.push(`aegis_notify_queued ${queuedNotify}`);

    help("aegis_pilot_leads_total", "Pilot pipeline leads");
    lines.push(`aegis_pilot_leads_total ${pilotLeads}`);

    help("aegis_bookings_completed", "Completed bookings");
    lines.push(`aegis_bookings_completed ${bookingsCompleted}`);

    help("aegis_reviews_total", "Member ratings");
    lines.push(`aegis_reviews_total ${reviews}`);
  } catch {
    help("aegis_metrics_domain_error", "1 if domain metrics failed");
    lines.push("aegis_metrics_domain_error 1");
  }

  const body = lines.join("\n") + "\n";
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; version=0.0.4; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
