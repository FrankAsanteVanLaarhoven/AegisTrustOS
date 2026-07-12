import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { buttonClass } from "@/components/ui/button";
import { Shield, Lock } from "lucide-react";
import { maskEmail } from "@/lib/security-edge";

export async function SiteHeader() {
  const session = await auth();
  const role = session?.user?.role;

  const appLinks =
    role === "PROVIDER"
      ? [
          { href: "/provider", label: "Provider" },
          { href: "/provider/verify", label: "Identity" },
        ]
      : role === "CLIENT"
        ? [{ href: "/client", label: "Client" }]
        : role === "OPS"
          ? [{ href: "/ops", label: "Trust & Safety" }]
          : role === "ADMIN"
            ? [
                { href: "/admin", label: "Admin" },
                { href: "/ops", label: "T&S" },
              ]
            : [];

  return (
    <>
      <div className="aegis-class-bar">
        Aegis // Restricted · Controlled access · All actions audited
      </div>
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#07090d]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2.5 group">
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
            <nav className="hidden items-center gap-5 text-xs font-mono uppercase tracking-[0.1em] text-zinc-500 md:flex">
              <Link href="/how-it-works" className="hover:text-[#3dd6c6] transition">
                How it works
              </Link>
              <Link href="/categories" className="hover:text-[#3dd6c6] transition">
                Categories
              </Link>
              <Link href="/verticals/security" className="hover:text-[#3dd6c6] transition">
                Security
              </Link>
              <Link href="/verticals/care" className="hover:text-[#3dd6c6] transition">
                Care
              </Link>
              {appLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="text-[#e87722] hover:text-[#f08a3a] transition"
                >
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            {session?.user ? (
              <>
                <div className="aegis-hud hidden sm:flex">
                  <span>
                    <span className="dot" />
                    SECURE
                  </span>
                  <span className="text-zinc-600">|</span>
                  <span className="text-zinc-400">{session.user.role}</span>
                  <span className="text-zinc-600">|</span>
                  <span className="flex items-center gap-1 text-zinc-500">
                    <Lock className="h-3 w-3" />
                    {maskEmail(session.user.email)}
                  </span>
                </div>
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
              </>
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
          <Link href="/how-it-works" className="hover:text-[#3dd6c6]">
            How it works
          </Link>
          <Link href="/categories" className="hover:text-[#3dd6c6]">
            Categories
          </Link>
          <Link href="/login" className="hover:text-[#3dd6c6]">
            Access
          </Link>
        </div>
      </div>
    </footer>
  );
}
