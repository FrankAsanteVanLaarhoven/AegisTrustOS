import { Badge } from "@/components/ui/badge";
import type { MemberRatingSummary } from "@/lib/services/ratings-service";
import { formatDate } from "@/lib/utils";

export function StarDisplay({
  value,
  max = 5,
}: {
  value: number | null | undefined;
  max?: number;
}) {
  if (value == null) {
    return <span className="text-xs text-zinc-600">No ratings yet</span>;
  }
  const full = Math.round(value);
  return (
    <span className="inline-flex items-center gap-1 font-mono text-xs">
      <span className="text-[#e87722]">
        {"★".repeat(Math.min(max, Math.max(0, full)))}
        <span className="text-zinc-600">
          {"★".repeat(Math.max(0, max - full))}
        </span>
      </span>
      <span className="text-zinc-300">{value.toFixed(1)}</span>
    </span>
  );
}

export function MemberRatingBadge({
  average,
  count,
}: {
  average: number | null | undefined;
  count?: number;
}) {
  if (average == null || !count) {
    return <Badge tone="muted">unrated</Badge>;
  }
  return (
    <Badge tone="gold">
      ★ {average.toFixed(1)}
      {count != null ? ` (${count})` : ""}
    </Badge>
  );
}

export function MemberRatingCard({
  title,
  summary,
}: {
  title: string;
  summary: MemberRatingSummary;
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#0e1218]/80 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#e87722]">
          {title}
        </p>
        <MemberRatingBadge average={summary.average} count={summary.count} />
      </div>
      <div className="mt-2">
        <StarDisplay value={summary.average} />
        {summary.count > 0 ? (
          <p className="mt-0.5 text-[10px] text-zinc-600">
            {summary.count} public rating{summary.count === 1 ? "" : "s"}
          </p>
        ) : null}
      </div>
      {(summary.reliability != null ||
        summary.professionalism != null ||
        summary.communication != null) && (
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[10px]">
          <div className="rounded-md border border-white/[0.06] px-1 py-2">
            <p className="text-zinc-600">Reliability</p>
            <p className="text-zinc-200">{summary.reliability?.toFixed(1) ?? "—"}</p>
          </div>
          <div className="rounded-md border border-white/[0.06] px-1 py-2">
            <p className="text-zinc-600">Professional</p>
            <p className="text-zinc-200">
              {summary.professionalism?.toFixed(1) ?? "—"}
            </p>
          </div>
          <div className="rounded-md border border-white/[0.06] px-1 py-2">
            <p className="text-zinc-600">Communication</p>
            <p className="text-zinc-200">
              {summary.communication?.toFixed(1) ?? "—"}
            </p>
          </div>
        </div>
      )}
      {summary.recent.length > 0 ? (
        <ul className="mt-3 space-y-2 border-t border-white/[0.06] pt-3">
          {summary.recent.map((r, i) => (
            <li key={i} className="text-xs text-zinc-400">
              <span className="text-[#e87722]">{"★".repeat(r.rating)}</span>{" "}
              <span className="text-zinc-500">{r.authorName}</span>
              {r.body ? <span className="text-zinc-300"> — {r.body}</span> : null}
              <span className="block text-[10px] text-zinc-600">
                {formatDate(r.createdAt)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
