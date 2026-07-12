import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { addCredential, runIdvCheck } from "@/lib/actions";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const TYPES = [
  "ID",
  "RTW",
  "PROOF_OF_ADDRESS",
  "LICENCE",
  "CERTIFICATE",
  "REFERENCE",
  "DBS",
  "SIA",
  "INSURANCE",
  "SAFEGUARDING",
  "MEDICATION",
  "OTHER",
] as const;

export default async function WalletPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "PROVIDER") redirect("/");

  const profile = await db.providerProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      credentials: { orderBy: { createdAt: "desc" } },
      idvChecks: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });
  if (!profile) redirect("/provider");

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-10 sm:px-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-100">Credential wallet</h1>
        <p className="text-sm text-zinc-500">
          Upload evidence for category compliance. Verification status is set by
          Trust &amp; Safety — not by AI alone.
        </p>
      </div>

      <Card>
        <CardHeader title="Add credential" />
        <CardBody>
          <form action={addCredential} className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-zinc-400">Type</span>
              <select
                name="type"
                className="mt-1 w-full rounded-xl border border-white/10 px-3 py-2 text-sm"
                defaultValue="ID"
              >
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-zinc-400">Title</span>
              <input
                name="title"
                required
                placeholder="e.g. Passport"
                className="mt-1 w-full rounded-xl border border-white/10 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-400">Issuer</span>
              <input
                name="issuer"
                className="mt-1 w-full rounded-xl border border-white/10 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-400">Number / ref</span>
              <input
                name="number"
                className="mt-1 w-full rounded-xl border border-white/10 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="text-zinc-400">Notes (AI may extract hints)</span>
              <textarea
                name="notes"
                rows={2}
                className="mt-1 w-full rounded-xl border border-white/10 px-3 py-2 text-sm"
              />
            </label>
            <div className="sm:col-span-2">
              <button type="submit" className={buttonClass("primary", "sm")}>
                Add to wallet
              </button>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Wallet contents"
          action={
            <form action={runIdvCheck}>
              <button type="submit" className={buttonClass("secondary", "sm")}>
                Run mock IDV
              </button>
            </form>
          }
        />
        <CardBody>
          <ul className="divide-y divide-slate-100">
            {profile.credentials.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <p className="font-medium text-zinc-100">
                    {c.title}{" "}
                    <span className="text-xs font-normal text-zinc-500">{c.type}</span>
                  </p>
                  <p className="text-xs text-zinc-500">
                    {c.issuer ?? "—"} · added {formatDate(c.createdAt)}
                  </p>
                </div>
                <Badge
                  tone={
                    c.verificationStatus === "VERIFIED"
                      ? "success"
                      : c.verificationStatus === "AI_FLAGGED"
                        ? "warn"
                        : "muted"
                  }
                >
                  {c.verificationStatus}
                </Badge>
              </li>
            ))}
            {!profile.credentials.length ? (
              <li className="py-4 text-sm text-zinc-500">No credentials yet.</li>
            ) : null}
          </ul>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="IDV history"
          subtitle="Mock vendor today · production: Trulioo/Socure-class via IdvProvider adapter"
        />
        <CardBody>
          <ul className="space-y-2 text-sm">
            {profile.idvChecks.map((c) => (
              <li
                key={c.id}
                className="flex justify-between rounded-lg border border-white/[0.06] px-3 py-2"
              >
                <span>
                  {c.vendor} · liveness {c.livenessScore ?? "—"}
                </span>
                <Badge tone={c.status === "PASSED" ? "success" : "warn"}>{c.status}</Badge>
              </li>
            ))}
            {!profile.idvChecks.length ? (
              <li className="text-zinc-500">No IDV checks yet.</li>
            ) : null}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
