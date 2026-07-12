/**
 * Cron-friendly credential expiry sweep.
 * Usage: npx tsx scripts/expiry-sweep.ts
 */
import { runCredentialExpirySweep } from "../src/lib/services/expiry-service";

async function main() {
  const report = await runCredentialExpirySweep({ notify: true });
  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
