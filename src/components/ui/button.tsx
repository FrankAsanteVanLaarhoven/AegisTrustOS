import { cn } from "@/lib/utils";

const variants = {
  primary:
    "bg-[#e87722] text-[#0a0c10] hover:bg-[#f08a3a] border border-transparent shadow-[0_0_20px_rgba(232,119,34,0.2)] font-semibold",
  secondary:
    "bg-[#0e1218]/[0.04] text-zinc-100 border border-white/10 hover:bg-[#0e1218]/[0.08] hover:border-white/20",
  gold:
    "bg-[#e87722] text-[#0a0c10] hover:bg-[#f08a3a] border border-transparent font-semibold",
  ghost:
    "bg-transparent text-zinc-400 hover:text-zinc-100 hover:bg-[#0e1218]/[0.04] border border-transparent",
  danger:
    "bg-[rgba(248,81,73,0.15)] text-[#f85149] hover:bg-[rgba(248,81,73,0.25)] border border-[rgba(248,81,73,0.35)]",
};

const sizes = {
  sm: "px-3 py-1.5 text-xs rounded-md",
  md: "px-4 py-2 text-sm rounded-md",
  lg: "px-5 py-2.5 text-sm rounded-md",
};

export function buttonClass(
  variant: keyof typeof variants = "primary",
  size: keyof typeof sizes = "md",
  className?: string,
) {
  return cn(
    "inline-flex items-center justify-center gap-2 font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e87722]/40 disabled:opacity-40 disabled:pointer-events-none tracking-wide",
    variants[variant],
    sizes[size],
    className,
  );
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
}) {
  return (
    <button className={buttonClass(variant, size, className)} {...props}>
      {children}
    </button>
  );
}
