#!/usr/bin/env node
/**
 * Vercel / production build:
 * 1. Switch Prisma to postgresql when DATABASE_URL is Postgres
 * 2. prisma generate
 * 3. prisma db push (schema sync — pilot; replace with migrate deploy later)
 * 4. next build
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
  if (r.status !== 0) process.exit(r.status ?? 1);
}

run("node", ["scripts/set-prisma-provider.mjs"]);

run("npx", ["prisma", "generate"]);

const dbUrl = process.env.DATABASE_URL ?? "";
const isPostgres =
  dbUrl.startsWith("postgres://") || dbUrl.startsWith("postgresql://");

if (isPostgres && process.env.SKIP_DB_PUSH !== "1") {
  console.log("[aegis] Syncing schema to Postgres (db push)…");
  run("npx", ["prisma", "db", "push", "--skip-generate", "--accept-data-loss"]);
} else if (!isPostgres) {
  console.log(
    "[aegis] DATABASE_URL is not Postgres — skipping db push (local/sqlite build)",
  );
}

run("npx", ["next", "build"]);
