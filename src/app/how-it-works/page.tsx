import { Card, CardBody } from "@/components/ui/card";

const steps = [
  {
    n: "01",
    title: "Provider onboarding",
    body: "Create profile, select categories, upload credentials, complete camera ID capture and liveness.",
  },
  {
    n: "02",
    title: "Compliance pack",
    body: "Category checklists show missing items with links to official registration forms (DBS, SIA, RTW, etc.).",
  },
  {
    n: "03",
    title: "Live verification interview",
    body: "Optional face-to-face video session with Trust & Safety for final confidence before clearance.",
  },
  {
    n: "04",
    title: "Human Trust & Safety review",
    body: "OPS reviews evidence, IDV, and interview outcome, records rationale, then CLEAR for a category.",
  },
  {
    n: "05",
    title: "Aegis Passport",
    body: "Fully cleared providers receive a platform trust badge visible to employers — not a government ID.",
  },
  {
    n: "06",
    title: "Client request & booking",
    body: "Structured brief, explainable shortlist, NDA/contracts, booking, service logs, reviews.",
  },
];

export default function HowItWorksPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-semibold text-zinc-100">How Aegis works</h1>
      <p className="mt-3 text-zinc-400 leading-relaxed">
        A managed trust platform with hybrid agency ops — not an open marketplace
        from day one. Verticals expand by risk: household and lifestyle first,
        then security, then care.
      </p>
      <div className="mt-10 space-y-4">
        {steps.map((s) => (
          <Card key={s.n}>
            <CardBody className="flex gap-4">
              <span className="font-mono text-sm text-[#e87722]">{s.n}</span>
              <div>
                <h2 className="font-semibold text-zinc-100">{s.title}</h2>
                <p className="mt-1 text-sm text-zinc-400 leading-relaxed">{s.body}</p>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
      <p className="mt-10 rounded-xl border border-[#e87722]/25 bg-[rgba(232,119,34,0.06)] px-4 py-3 text-sm text-zinc-400">
        <strong className="text-zinc-200">Disclaimer:</strong> Aegis facilitates
        evidence collection and human review. It does not replace CQC registration,
        SIA employment law advice, or solicitor-drafted contracts.
      </p>
    </div>
  );
}
