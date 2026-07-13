import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { buttonClass } from "@/components/ui/button";
import { Shield, Lock } from "lucide-react";
import { maskEmail } from "@/lib/security-edge";

const PUBLIC_LINKS = [
  { href: "/pilot", label: "Pilot" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/categories", label: "Categories" },
  { href: "/verticals/security", label: "Security" },
  { href: "/verticals/care", label: "Care" },
  { href: "/verticals/robots", label: "Robots" },
] as const;

/** Always-visible console shortcuts (auth gates on the page). */
const CONSOLE_LINKS = [
  { href: "/provider", label: "Provider" },
  { href: "/provider/verify", label: "Identity" },
  { href: "/provider/wallet", label: "Wallet" },
  { href: "/provider/bookings", label: "Bookings" },
  { href: "/client", label: "Client" },
  { href: "/ops", label: "Ops" },
] as const;

function NavLink({
  href,
  label,
  accent,
}: {
  href: string;
  label: string;
  accent?: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        accent
          ? "text-[#e87722] hover:text-[#f08a3a] transition whitespace-nowrap"
          : "hover:text-[#3dd6c6] transition whitespace-nowrap"
      }
    >
      {label}
    </Link>
  );
}

export async function SiteHeader() {
  let session: {
    user?: { role?: string; email?: string | null; name?: string | null };
  } | null = null;
  try {
    session = await auth();
  } catch {
    session = null;
  }
  const role = session?.user?.role;
  const signedIn = Boolean(session?.user);

  return (
    <>
      <div className="aegis-class-bar">
        Aegis // Restricted · Controlled access · All actions audited
      </div>
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#07090d]/95 backdrop-blur-xl">
        {/* Top row: brand + session HUD — always shows SECURE */}
        <div className="mx-auto flex min-h-14 max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-2 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5 group shrink-0">
            <span className="flex h-8 w-8 items-center justify-center rounded-md border border-[#e87722]/40 bg-[rgba(232,119,34,0.12)] text-[#e87722] shadow-[0_0_16px_rgba(232,119,34,0.15)]">
              <Shield className="h-4 w-4" />
            </span>
            <span className="tracking-tight">
              <span className="font-semibold text-zinc-100">Aegis</span>{" "}
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500">
                Trust OS
              </span>
            </span>
          </Link>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* SECURE status always visible */}
            <div className="aegis-hud flex">
              <span>
                <span className="dot" />
                SECURE
              </span>
              <span className="text-zinc-600">|</span>
              <span className="text-zinc-400">
                {signedIn ? String(role ?? "USER") : "PUBLIC"}
              </span>
              {signedIn && session?.user?.email ? (
                <>
                  <span className="text-zinc-600">|</span>
                  <span className="flex items-center gap-1 text-zinc-500">
                    <Lock className="h-3 w-3" />
                    {maskEmail(session.user.email)}
                  </span>
                </>
              ) : null}
            </div>

            {signedIn ? (
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button type="submit" className={buttonClass("secondary", "sm")}>
                  Sign out
                </button>
              </form>
            ) : (
              <>
                <Link href="/login" className={buttonClass("ghost", "sm")}>
                  Access
                </Link>
                <Link href="/register" className={buttonClass("primary", "sm")}>
                  Enrol
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Second row: all destinations always visible (wraps on small screens) */}
        <div className="border-t border-white/[0.04]">
          <div className="mx-auto max-w-7xl px-4 py-2 sm:px-6">
            <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] font-mono uppercase tracking-[0.1em] text-zinc-500 sm:text-xs">
              {PUBLIC_LINKS.map((l) => (
                <NavLink key={l.href} href={l.href} label={l.label} />
              ))}
              <span className="hidden h-3 w-px bg-white/10 sm:inline-block" aria-hidden />
              {CONSOLE_LINKS.map((l) => (
                <NavLink
                  key={l.href}
                  href={l.href}
                  label={l.label}
                  accent
                />
              ))}
            </nav>
          </div>
        </div>
      </header>
    </>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-white/[0.06] bg-[#07090d]/80">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-10 text-xs text-zinc-500 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#e87722]">
            Aegis Trust OS
          </p>
          <p className="mt-2 max-w-md leading-relaxed text-zinc-500">
            Trust infrastructure for high-stakes human services. Verified
            professionals · human clearance · audited actions. Not a substitute
            for regulated agency registration or legal advice.
          </p>
          <p className="mt-3 font-mono text-[10px] text-zinc-600 tracking-wider">
            CLASSIFICATION: RESTRICTED · AUDIT: ENABLED
          </p>
        </div>
        <div className="flex flex-wrap gap-4 font-mono text-[10px] uppercase tracking-[0.12em]">
          <Link href="/pilot" className="hover:text-[#3dd6c6]">
            London pilot
          </Link>
          <Link href="/provider" className="hover:text-[#e87722]">
            Provider
          </Link>
          <Link href="/provider/verify" className="hover:text-[#e87722]">
            Identity
          </Link>
          <Link href="/categories" className="hover:text-[#3dd6c6]">
            Categories
          </Link>
          <Link href="/legal/terms" className="hover:text-[#3dd6c6]">
            Terms
          </Link>
          <Link href="/legal/privacy" className="hover:text-[#3dd6c6]">
            Privacy
          </Link>
          <Link href="/login" className="hover:text-[#3dd6c6]">
            Access
          </Link>
        </div>
      </div>
    </footer>
  );
}
