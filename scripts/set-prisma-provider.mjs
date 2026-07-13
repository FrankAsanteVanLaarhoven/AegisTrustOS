#!/usr/bin/env node
/**
 * Set Prisma datasource provider for deploy builds.
 * Usage:
 *   node scripts/set-prisma-provider.mjs postgresql
 *   node scripts/set-prisma-provider.mjs sqlite
 *   PRISMA_PROVIDER=postgresql node scripts/set-prisma-provider.mjs
 *
 * Auto: if DATABASE_URL starts with postgres, use postgresql.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.join(__dirname, "..", "prisma", "schema.prisma");

function detectProvider() {
  const arg = process.argv[2];
  if (arg === "postgresql" || arg === "postgres" || arg === "sqlite") {
    return arg === "postgres" ? "postgresql" : arg;
  }
  if (process.env.PRISMA_PROVIDER === "postgresql" || process.env.PRISMA_PROVIDER === "sqlite") {
    return process.env.PRISMA_PROVIDER;
  }
  const url = process.env.DATABASE_URL ?? "";
  if (url.startsWith("postgres://") || url.startsWith("postgresql://")) {
    return "postgresql";
  }
  return "sqlite";
}

const provider = detectProvider();
let schema = fs.readFileSync(schemaPath, "utf8");
if (!/provider\s*=\s*"(sqlite|postgresql)"/.test(schema)) {
  console.error("Could not find datasource provider in schema.prisma");
  process.exit(1);
}
schema = schema.replace(
  /provider\s*=\s*"(sqlite|postgresql)"/,
  `provider = "${provider}"`,
);
fs.writeFileSync(schemaPath, schema);
console.log(`[aegis] prisma datasource provider → ${provider}`);
