/** Compact ops HUD — use on dashboards */

export function StatusStrip({
  items,
}: {
  items: { label: string; value: string; tone?: "ok" | "warn" | "danger" | "neutral" }[];
}) {
  return (
    <div className="aegis-hud flex flex-wrap gap-x-5 gap-y-2 rounded-md border border-white/[0.06] bg-[#0e1218]/80 px-4 py-2.5">
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-2">
          <span
            className={
              item.tone === "warn"
                ? "dot warn"
                : item.tone === "danger"
                  ? "dot danger"
                  : item.tone === "neutral"
                    ? "dot"
                    : "dot"
            }
            style={
              item.tone === "neutral"
                ? { background: "#5c6570", boxShadow: "none" }
                : undefined
            }
          />
          <span className="text-zinc-600">{item.label}</span>
          <span className="text-zinc-300">{item.value}</span>
        </span>
      ))}
    </div>
  );
}
