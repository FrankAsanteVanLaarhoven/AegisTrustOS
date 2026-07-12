import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";
import {
  Shield,
  FileCheck2,
  Workflow,
  Scale,
  Building2,
  Sparkles,
  EyeOff,
  Radar,
} from "lucide-react";

const layers = [
  {
    icon: Shield,
    title: "Identity & trust",
    body: "IDV vendor adapter, credential wallet, liveness, references, advisory risk signals, immutable audit trail.",
  },
  {
    icon: FileCheck2,
    title: "Category compliance",
    body: "UK-shaped checklists: RTW, DBS, SIA, safeguarding. Required evidence gates — never silent pass.",
  },
  {
    icon: Workflow,
    title: "Service orchestration",
    body: "Structured requests, explainable matching, NDA/contracts, bookings, service logs, reviews.",
  },
];

export default function HomePage() {
  return (
    <div>
      <section className="relative overflow-hidden border-b border-white/[0.06]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(232,119,34,0.12),_transparent_50%),radial-gradient(ellipse_at_bottom_left,_rgba(61,214,198,0.06),_transparent_45%)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28">
          <div className="aegis-hud mb-6">
            <span>
              <span className="dot" />
              Systems nominal
            </span>
            <span className="text-zinc-600">|</span>
            <span>London pilot</span>
            <span className="text-zinc-600">|</span>
            <span className="text-[#3dd6c6]">Stealth security enabled</span>
          </div>
          <Badge tone="gold">Aegis · Command surface · Hybrid agency + trust tech</Badge>
          <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-zinc-50 sm:text-5xl">
            Trust infrastructure for high-stakes human services
          </h1>
          <p className="mt-3 font-mono text-sm tracking-wide text-[#e87722]">
            Verified professionals. Human clearance.
          </p>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-zinc-400">
            <strong className="font-semibold text-zinc-100">Aegis</strong> is
            a trust-and-orchestration platform for high-stakes personal services:
            identity checks, role compliance, contracts, placements, and Trust
            &amp; Safety — so premium procurement feels as rigorous as enterprise
            vendor onboarding.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/register" className={buttonClass("primary", "lg")}>
              Enrol
            </Link>
            <Link href="/login" className={buttonClass("secondary", "lg")}>
              Secure access
            </Link>
            <Link href="/how-it-works" className={buttonClass("ghost", "lg")}>
              Protocol
            </Link>
          </div>
          <p className="mt-6 font-mono text-[11px] text-zinc-600">
            DEMO ACCESS · credential channel · password{" "}
            <code className="rounded border border-white/10 bg-[#141a22] px-1.5 py-0.5 text-zinc-400">
              aegis-demo
            </code>{" "}
            · ops@ / client@ / pa@aegis.demo
          </p>
        </div>
      </section>

      <section className="border-b border-white/[0.06] bg-[#0e1218]/50">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <div className="grid gap-8 md:grid-cols-2 md:items-center">
            <div>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#e87722]">
                Strategic posture
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-zinc-100">
                We sit on IDV rails. We own the vertical layer.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                Aegis does not try to out-build Trulioo or Socure on global
                document coverage or fraud ML. Those vendors are infrastructure.
                Our moat is role-specific clearance, UK compliance packs,
                human Trust &amp; Safety, and service orchestration.
              </p>
            </div>
            <Card>
              <CardBody className="space-y-3 text-sm text-zinc-400 font-mono text-xs leading-relaxed">
                <p>
                  <span className="text-[#3dd6c6]">USE</span>{" "}
                  <span className="text-zinc-500">//</span> IDV vendors for
                  KYC / liveness / document authenticity
                </p>
                <p>
                  <span className="text-[#e87722]">OWN</span>{" "}
                  <span className="text-zinc-500">//</span> wallet · matrices ·
                  AI triage · ops CLEAR · match · NDA · incidents
                </p>
                <p>
                  <span className="text-[#f85149]">NEVER</span>{" "}
                  <span className="text-zinc-500">//</span> auto-clear trust on
                  AI alone
                </p>
                <Link
                  href="/docs/architecture"
                  className="inline-block pt-1 text-[#3dd6c6] hover:underline"
                >
                  Hybrid architecture →
                </Link>
              </CardBody>
            </Card>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-zinc-100">Three layers</h2>
          <p className="mt-1 font-mono text-xs uppercase tracking-[0.12em] text-zinc-500">
            Moat = vertical trust — not listings, not raw IDV
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {layers.map((l) => (
            <Card key={l.title}>
              <CardBody className="space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md border border-[#e87722]/30 bg-[rgba(232,119,34,0.1)] text-[#e87722]">
                  <l.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-zinc-100">{l.title}</h3>
                <p className="text-sm leading-relaxed text-zinc-400">{l.body}</p>
              </CardBody>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-y border-white/[0.06] bg-[#0e1218]/40">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 md:grid-cols-2">
          <div>
            <div className="flex items-center gap-2 text-[#e87722]">
              <Sparkles className="h-4 w-4" />
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em]">
                AI posture
              </span>
            </div>
            <h2 className="mt-2 text-2xl font-semibold text-zinc-100">
              Humans adjudicate every clearance
            </h2>
            <p className="mt-3 text-zinc-400 leading-relaxed text-sm">
              Document checks, missing-item guidance, and match ranking support
              operators — they never auto-approve trust.{" "}
              <strong className="font-medium text-zinc-100">
                Clearance requires Trust &amp; Safety sign-off.
              </strong>
            </p>
          </div>
          <div>
            <div className="flex items-center gap-2 text-[#3dd6c6]">
              <Scale className="h-4 w-4" />
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em]">
                Launch order
              </span>
            </div>
            <h2 className="mt-2 text-2xl font-semibold text-zinc-100">
              Expand by risk tier
            </h2>
            <ol className="mt-3 space-y-2 text-sm text-zinc-400">
              <li>
                <Badge tone="success">Live</Badge>{" "}
                <strong className="text-zinc-200">Concierge</strong> — PA,
                chauffeur, travel, stylist, beauty, hospitality
              </li>
              <li>
                <Badge tone="warn">Scaffold</Badge>{" "}
                <strong className="text-zinc-200">Security</strong> — SIA-aware
                roles, waitlist
              </li>
              <li>
                <Badge tone="muted">Scaffold</Badge>{" "}
                <strong className="text-zinc-200">Care</strong> — safeguarding
                matrix only; no CQC claims
              </li>
              <li>
                <Badge tone="gold">Live / waitlist</Badge>{" "}
                <strong className="text-zinc-200">Robot helpers</strong> — AI
                safety governance + policy clearance (care-home waitlist)
              </li>
            </ol>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="mb-8 grid gap-4 md:grid-cols-2">
          <Card>
            <CardBody className="flex gap-4">
              <EyeOff className="h-6 w-6 shrink-0 text-[#3dd6c6]" />
              <div>
                <h3 className="font-semibold text-zinc-100">Stealth security</h3>
                <p className="mt-1 text-sm text-zinc-400 leading-relaxed">
                  Hardened headers, rate-limited auth, masked session display,
                  role-gated routes, generic failure surfaces, audit on every
                  login and clearance decision. Stack fingerprint minimised.
                </p>
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="flex gap-4">
              <Radar className="h-6 w-6 shrink-0 text-[#e87722]" />
              <div>
                <h3 className="font-semibold text-zinc-100">Command aesthetic</h3>
                <p className="mt-1 text-sm text-zinc-400 leading-relaxed">
                  Classification bars, mono telemetry, evidence-dense panels —
                  built for Trust &amp; Safety operators, not consumer marketplace
                  chrome.
                </p>
              </div>
            </CardBody>
          </Card>
        </div>

        <Card className="overflow-hidden border-[#e87722]/20 bg-gradient-to-br from-[#1a120c] to-[#0e1218]">
          <CardBody className="flex flex-col gap-6 p-8 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-4">
              <Building2 className="h-8 w-8 shrink-0 text-[#e87722]" />
              <div>
                <h2 className="text-xl font-semibold text-zinc-100">
                  Hybrid agency model
                </h2>
                <p className="mt-1 max-w-xl text-sm text-zinc-400">
                  Tech product + white-glove Trust &amp; Safety ops + marketplace
                  later. Premium placements and disputes handled by humans.
                </p>
              </div>
            </div>
            <Link href="/ops" className={buttonClass("primary", "md")}>
              Open ops console
            </Link>
          </CardBody>
        </Card>
      </section>
    </div>
  );
}
