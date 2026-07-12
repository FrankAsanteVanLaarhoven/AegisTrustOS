import { Badge } from "@/components/ui/badge";
import { parseJsonObject } from "@/lib/utils";

type Field = {
  key: string;
  value: string;
  confidence?: number;
  valid?: boolean;
  validatedConfidence?: number;
  errors?: string[];
};

type ExtractionPayload = {
  engine?: string;
  documentKind?: string;
  overallConfidence?: number;
  requiresManualReview?: boolean;
  reasons?: string[];
  fields?: Field[];
  disclaimer?: string;
  ocr?: ExtractionPayload;
  rawText?: string;
};

function normalize(raw: string | null | undefined): ExtractionPayload | null {
  if (!raw) return null;
  const parsed = parseJsonObject<ExtractionPayload>(raw);
  // Camera path nests under ocr
  if (parsed.ocr?.fields) return parsed.ocr;
  if (parsed.fields) return parsed;
  // Legacy flat hints { siaNumber: "..." }
  const keys = Object.keys(parsed).filter(
    (k) => !["source", "checkId", "storageKey"].includes(k),
  );
  if (!keys.length) return null;
  if (!parsed.fields) {
    return {
      engine: "legacy-hints",
      documentKind: "UNKNOWN",
      overallConfidence: 0.7,
      requiresManualReview: true,
      fields: keys.map((k) => ({
        key: k,
        value: String((parsed as Record<string, unknown>)[k] ?? ""),
        confidence: 0.7,
        valid: true,
      })),
      reasons: ["legacy extraction format"],
    };
  }
  return parsed;
}

export function ExtractedFields({
  extractedJson,
  compact,
}: {
  extractedJson: string | null | undefined;
  compact?: boolean;
}) {
  const data = normalize(extractedJson);
  if (!data?.fields?.length && !data?.documentKind) {
    return (
      <p className="text-xs text-zinc-600">No extraction data.</p>
    );
  }

  return (
    <div className={compact ? "mt-1 space-y-1" : "mt-2 space-y-2"}>
      <div className="flex flex-wrap gap-1.5">
        {data.documentKind ? (
          <Badge tone="navy">{data.documentKind}</Badge>
        ) : null}
        {typeof data.overallConfidence === "number" ? (
          <Badge
            tone={
              data.overallConfidence >= 0.75
                ? "success"
                : data.overallConfidence >= 0.5
                  ? "warn"
                  : "danger"
            }
          >
            conf {(data.overallConfidence * 100).toFixed(0)}%
          </Badge>
        ) : null}
        {data.requiresManualReview ? (
          <Badge tone="warn">manual review</Badge>
        ) : (
          <Badge tone="muted">validation ok</Badge>
        )}
        {data.engine ? (
          <Badge tone="muted">{data.engine}</Badge>
        ) : null}
      </div>
      <ul className="space-y-1 font-mono text-[11px] text-zinc-400">
        {(data.fields ?? []).map((f) => (
          <li key={f.key} className="flex flex-wrap gap-x-2">
            <span className="text-zinc-600">{f.key}</span>
            <span className={f.valid === false ? "text-[#f85149]" : "text-zinc-200"}>
              {f.value}
            </span>
            {typeof f.confidence === "number" ? (
              <span className="text-zinc-600">
                {(f.confidence * 100).toFixed(0)}%
              </span>
            ) : null}
            {f.valid === false ? (
              <span className="text-[#f85149]">
                invalid{f.errors?.length ? `: ${f.errors.join(", ")}` : ""}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
      {data.reasons?.length ? (
        <ul className="list-disc pl-4 text-[10px] text-zinc-600">
          {data.reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      ) : null}
      {data.disclaimer ? (
        <p className="text-[10px] text-zinc-600 italic">{data.disclaimer}</p>
      ) : null}
    </div>
  );
}
