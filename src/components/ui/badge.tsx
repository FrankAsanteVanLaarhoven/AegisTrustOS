import { cn } from "@/lib/utils";

const tones: Record<string, string> = {
  default:
    "bg-[#0e1218]/5 text-zinc-300 border-white/10",
  gold:
    "bg-[rgba(232,119,34,0.12)] text-[#e87722] border-[rgba(232,119,34,0.35)]",
  navy:
    "bg-[rgba(61,214,198,0.1)] text-[#3dd6c6] border-[rgba(61,214,198,0.3)]",
  success:
    "bg-[rgba(63,185,80,0.12)] text-[#3fb950] border-[rgba(63,185,80,0.3)]",
  warn:
    "bg-[rgba(210,153,34,0.12)] text-[#d29922] border-[rgba(210,153,34,0.3)]",
  danger:
    "bg-[rgba(248,81,73,0.12)] text-[#f85149] border-[rgba(248,81,73,0.35)]",
  muted:
    "bg-[#0e1218]/[0.03] text-zinc-500 border-white/10",
};

export function Badge({
  children,
  tone = "default",
  className,
}: {
  children: React.ReactNode;
  tone?: keyof typeof tones;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] font-mono",
        tones[tone] ?? tones.default,
        className,
      )}
    >
      {children}
    </span>
  );
}
