import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const BASE = process.env.AEGIS_URL || "http://localhost:3010";
const OUT = path.resolve("browser-test-results");
fs.mkdirSync(OUT, { recursive: true });

const results = [];
function ok(name, detail = "") {
  results.push({ name, status: "pass", detail });
  console.log(`✓ ${name}${detail ? " — " + detail : ""}`);
}
function fail(name, detail = "") {
  results.push({ name, status: "fail", detail });
  console.error(`✗ ${name}${detail ? " — " + detail : ""}`);
}

async function shot(page, name) {
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

async function login(page, email, password = "aegis-demo") {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await Promise.all([
    page.waitForURL((u) => !u.pathname.includes("/login"), { timeout: 15000 }).catch(() => null),
    page.click('button[type="submit"]'),
  ]);
  await page.waitForTimeout(800);
}

async function signOut(page) {
  const btn = page.locator('button:has-text("Sign out")');
  if (await btn.count()) {
    await btn.first().click();
    await page.waitForTimeout(600);
  }
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  colorScheme: "dark",
});
const page = await context.newPage();
page.setDefaultTimeout(20000);

try {
  // 1. Landing
  const res = await page.goto(BASE + "/", { waitUntil: "networkidle" });
  if (res && res.ok()) ok("landing_status", String(res.status()));
  else fail("landing_status", res ? String(res.status()) : "no response");

  const body = await page.textContent("body");
  if (body?.includes("RESTRICTED") || body?.includes("Restricted")) ok("classification_bar");
  else fail("classification_bar", "RESTRICTED not found");

  if (body?.includes("Trust infrastructure") || body?.includes("Aegis")) ok("hero_copy");
  else fail("hero_copy");

  if (body?.toLowerCase().includes("stealth") || body?.includes("SECURE") || body?.includes("IDV"))
    ok("stealth_or_positioning_copy");
  else fail("stealth_or_positioning_copy");

  await shot(page, "01-landing");

  // Security headers via API
  const health = await page.request.get(`${BASE}/api/v1/health`);
  const healthJson = await health.json();
  if (health.ok() && healthJson?.ok && healthJson?.data?.db) ok("api_v1_health", JSON.stringify(healthJson.data.status));
  else fail("api_v1_health", JSON.stringify(healthJson));

  const version = await page.request.get(`${BASE}/api/v1/version`);
  const verJson = await version.json();
  if (version.ok() && verJson?.data?.invariants?.length) ok("api_v1_version", verJson.data.api);
  else fail("api_v1_version");

  // 2. Ops login
  await login(page, "ops@aegis.demo");
  if (page.url().includes("/ops") || page.url().includes("/admin") || (await page.textContent("body"))?.includes("Trust"))
    ok("ops_login_redirect", page.url());
  else fail("ops_login_redirect", page.url());

  await page.goto(`${BASE}/ops`, { waitUntil: "networkidle" });
  const opsBody = await page.textContent("body");
  if (opsBody?.includes("Trust") || opsBody?.includes("queue") || opsBody?.includes("Queue") || opsBody?.includes("Review"))
    ok("ops_dashboard");
  else fail("ops_dashboard", opsBody?.slice(0, 200));
  await shot(page, "02-ops-dashboard");

  await page.goto(`${BASE}/ops/kpis`, { waitUntil: "networkidle" });
  if ((await page.textContent("body"))?.includes("KPI") || (await page.textContent("body"))?.includes("vetting") || (await page.textContent("body"))?.includes("Booking"))
    ok("ops_kpis");
  else fail("ops_kpis");
  await shot(page, "03-ops-kpis");

  await page.goto(`${BASE}/ops/audit`, { waitUntil: "networkidle" });
  if ((await page.textContent("body"))?.includes("Audit") || (await page.textContent("body"))?.includes("event"))
    ok("ops_audit");
  else fail("ops_audit");
  await shot(page, "04-ops-audit");

  await signOut(page);

  // 3. Client
  await login(page, "client@aegis.demo");
  await page.goto(`${BASE}/client`, { waitUntil: "networkidle" });
  const clientBody = await page.textContent("body");
  if (clientBody?.includes("Client") || clientBody?.includes("request") || clientBody?.includes("Request") || clientBody?.includes("Booking"))
    ok("client_dashboard");
  else fail("client_dashboard", clientBody?.slice(0, 200));
  await shot(page, "05-client-dashboard");

  await page.goto(`${BASE}/client/requests/new`, { waitUntil: "networkidle" });
  if (await page.locator('form, select[name="categoryId"], input[name="title"]').count())
    ok("client_new_request_form");
  else fail("client_new_request_form");
  await shot(page, "06-client-new-request");

  await signOut(page);

  // 4. Provider
  await login(page, "pa@aegis.demo");
  await page.goto(`${BASE}/provider`, { waitUntil: "networkidle" });
  const provBody = await page.textContent("body");
  if (provBody?.includes("Provider") || provBody?.includes("wallet") || provBody?.includes("VERIFIED") || provBody?.includes("credential"))
    ok("provider_dashboard");
  else fail("provider_dashboard", provBody?.slice(0, 200));
  await shot(page, "07-provider-dashboard");

  await page.goto(`${BASE}/provider/wallet`, { waitUntil: "networkidle" });
  const walletBody = await page.textContent("body");
  if (walletBody?.includes("Credential") || walletBody?.includes("wallet") || walletBody?.includes("IDV"))
    ok("provider_wallet");
  else fail("provider_wallet");
  if (walletBody?.includes("Payouts") || walletBody?.includes("Connect") || walletBody?.includes("payout"))
    ok("provider_connect_payouts");
  else fail("provider_connect_payouts");
  await shot(page, "08-provider-wallet");

  await signOut(page);

  // 5. Public passport + member ratings
  await context.clearCookies();
  const passRes = await page.goto(`${BASE}/passport/sam-okonkwo-pa`, {
    waitUntil: "networkidle",
  });
  const passBody = await page.textContent("body");
  if (passRes?.ok() && (passBody?.includes("Member ratings") || passBody?.includes("rating") || passBody?.includes("★")))
    ok("passport_member_ratings");
  else fail("passport_member_ratings", passBody?.slice(0, 160));
  await shot(page, "09-passport-ratings");

  // 6. Unauth protected route
  const unauth = await page.goto(`${BASE}/ops`, { waitUntil: "networkidle" });
  if (page.url().includes("/login")) ok("protected_route_redirect");
  else fail("protected_route_redirect", page.url());

  // 7. Categories public
  await page.goto(`${BASE}/categories`, { waitUntil: "networkidle" });
  if ((await page.textContent("body"))?.includes("Personal Assistant") || (await page.textContent("body"))?.includes("Chauffeur"))
    ok("categories_page");
  else fail("categories_page");
  await shot(page, "10-categories");

  // 8. IDV webhook endpoint rejects invalid JSON body gracefully
  const wh = await page.request.post(`${BASE}/api/v1/idv/webhook`, {
    data: { noSession: true },
  });
  const whJson = await wh.json().catch(() => ({}));
  if (!wh.ok() || whJson?.ok === false) ok("idv_webhook_validation");
  else fail("idv_webhook_validation", JSON.stringify(whJson));

} catch (e) {
  fail("uncaught", e.message);
  await shot(page, "99-error").catch(() => null);
} finally {
  await browser.close();
}

const passed = results.filter((r) => r.status === "pass").length;
const failed = results.filter((r) => r.status === "fail").length;
const summary = { passed, failed, results, out: OUT };
fs.writeFileSync(path.join(OUT, "summary.json"), JSON.stringify(summary, null, 2));
console.log("\n=== SUMMARY ===");
console.log(JSON.stringify(summary, null, 2));
process.exit(failed > 0 ? 1 : 0);
