#!/usr/bin/env node
/**
 * Vercel / production build:
 * 1. Switch Prisma provider from DATABASE_URL (postgres → postgresql)
 * 2. prisma generate
 * 3. prisma db push (best-effort — never blocks the build)
 * 4. next build
 *
 * Cron / expiry: use GitHub Actions cd-jobs.yml (Hobby Vercel has no cron).
 */
import { spawnSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function run(cmd, args, opts = {}) {
  console.log(`$ ${cmd} ${args.join(" ")}`);
  const r = spawnSync(cmd, args, {
    cwd: root,
    stdio: "inherit",
    env: process.env,
    shell: process.platform === "win32",
    ...opts,
  });
  return r.status ?? 1;
}

function runOrExit(cmd, args) {
  const code = run(cmd, args);
  if (code !== 0) process.exit(code);
}

runOrExit("node", ["scripts/set-prisma-provider.mjs"]);
runOrExit("npx", ["prisma", "generate"]);

const dbUrl = process.env.DATABASE_URL ?? "";
const isPostgres =
  dbUrl.startsWith("postgres://") || dbUrl.startsWith("postgresql://");

if (isPostgres && process.env.SKIP_DB_PUSH !== "1") {
  console.log("[aegis] Syncing schema to Postgres (db push, best-effort)…");
  const code = run("npx", [
    "prisma",
    "db",
    "push",
    "--skip-generate",
    "--accept-data-loss",
  ]);
  if (code !== 0) {
    console.warn(
      "[aegis] db push failed — continuing build. Run `npx prisma db push` against DATABASE_URL after deploy.",
    );
  }
} else if (!isPostgres) {
  console.log(
    "[aegis] No Postgres DATABASE_URL — build with SQLite client. Set DATABASE_URL on Vercel for production data.",
  );
}

const buildCode = run("npx", ["next", "build"]);
if (buildCode !== 0) process.exit(buildCode);

console.log("[aegis] build:deploy complete");
