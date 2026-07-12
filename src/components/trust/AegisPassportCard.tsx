import { Badge } from "@/components/ui/badge";
import { Shield } from "lucide-react";
import { formatDate, parseJsonArray } from "@/lib/utils";

export function AegisPassportCard({
  passport,
  providerName,
  city,
}: {
  passport: {
    passportNumber: string;
    publicSlug: string;
    status: string;
    tier: string;
    verifiedCategoriesJson: string;
    issuedAt: Date | string;
    expiresAt: Date | string;
  };
  providerName: string;
  city?: string | null;
}) {
  const cats = parseJsonArray(passport.verifiedCategoriesJson);

  return (
    <div className="relative overflow-hidden rounded-xl border border-[#e87722]/35 bg-gradient-to-br from-[#1a140c] via-[#0e1218] to-[#0a1620] p-6 shadow-[0_0_40px_rgba(232,119,34,0.12)]">
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[#e87722]/10 blur-2xl" />
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#e87722]/40 bg-[rgba(232,119,34,0.12)] text-[#e87722]">
            <Shield className="h-5 w-5" />
          </span>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#e87722]">
              Aegis Passport
            </p>
            <p className="text-lg font-semibold text-zinc-50">{providerName}</p>
            {city ? <p className="text-xs text-zinc-500">{city}</p> : null}
          </div>
        </div>
        <Badge tone={passport.status === "ACTIVE" ? "success" : "danger"}>
          {passport.status}
        </Badge>
      </div>
      <div className="mt-6 grid gap-3 font-mono text-xs sm:grid-cols-2">
        <div>
          <p className="text-zinc-600 uppercase tracking-wider">Number</p>
          <p className="mt-0.5 text-[#3dd6c6]">{passport.passportNumber}</p>
        </div>
        <div>
          <p className="text-zinc-600 uppercase tracking-wider">Trust tier</p>
          <p className="mt-0.5 text-zinc-200">{passport.tier}</p>
        </div>
        <div>
          <p className="text-zinc-600 uppercase tracking-wider">Issued</p>
          <p className="mt-0.5 text-zinc-300">{formatDate(passport.issuedAt)}</p>
        </div>
        <div>
          <p className="text-zinc-600 uppercase tracking-wider">Expires</p>
          <p className="mt-0.5 text-zinc-300">{formatDate(passport.expiresAt)}</p>
        </div>
      </div>
      {cats.length ? (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {cats.map((c) => (
            <Badge key={c} tone="navy">
              {c}
            </Badge>
          ))}
        </div>
      ) : null}
      <p className="mt-5 text-[10px] leading-relaxed text-zinc-600">
        Platform trust badge only — not a government identity document. Issued
        after identity evidence, category checks, and human Trust &amp; Safety
        clearance.
      </p>
      <p className="mt-2 font-mono text-[10px] text-zinc-600">
        Public ref: /passport/{passport.publicSlug}
      </p>
    </div>
  );
}
