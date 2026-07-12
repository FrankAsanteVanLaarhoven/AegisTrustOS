import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signIn } from "@/lib/auth";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, Shield } from "lucide-react";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const session = await auth();
  if (session?.user) {
    redirect(roleHome(session.user.role));
  }
  const sp = await searchParams;

  async function loginAction(formData: FormData) {
    "use server";
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const next = String(formData.get("next") ?? "");
    try {
      await signIn("credentials", {
        email,
        password,
        redirectTo: next && next.startsWith("/") ? next : "/api/auth/post-login",
      });
    } catch (e) {
      throw e;
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-16 sm:px-6">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-md border border-[#e87722]/40 bg-[rgba(232,119,34,0.12)] text-[#e87722]">
          <Shield className="h-6 w-6" />
        </div>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
          Secure channel · TLS · Rate-limited
        </p>
      </div>
      <Card>
        <CardHeader
          title="Access control"
          subtitle="Aegis Trust OS · credential authentication"
        />
        <CardBody>
          <form action={loginAction} className="space-y-4">
            <input type="hidden" name="next" value={sp.next ?? ""} />
            <label className="block text-sm">
              <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">
                Identity
              </span>
              <input
                name="email"
                type="email"
                required
                autoComplete="username"
                defaultValue="ops@aegis.demo"
                className="w-full px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">
                Credential
              </span>
              <input
                name="password"
                type="password"
                required
                autoComplete="current-password"
                defaultValue="aegis-demo"
                className="w-full px-3 py-2 text-sm"
              />
            </label>
            {sp.error ? (
              <p className="flex items-center gap-2 font-mono text-xs text-[#f85149]">
                <Lock className="h-3 w-3" />
                Authentication failed.
              </p>
            ) : null}
            <Button type="submit" className="w-full">
              Authenticate
            </Button>
          </form>
          <p className="mt-4 text-center text-xs text-zinc-500">
            No clearance?{" "}
            <Link href="/register" className="text-[#3dd6c6] hover:underline">
              Enrol
            </Link>
          </p>
        </CardBody>
      </Card>
      <div className="rounded-lg border border-white/[0.06] bg-[#0e1218] p-4 font-mono text-[10px] leading-relaxed text-zinc-500">
        <p className="text-[#e87722] tracking-[0.14em] uppercase mb-2">
          Demo channels · password aegis-demo
        </p>
        <ul className="space-y-1">
          <li>ops@aegis.demo — Trust &amp; Safety</li>
          <li>client@aegis.demo — VIP client</li>
          <li>pa@aegis.demo — Verified PA</li>
          <li>driver@aegis.demo — Verified chauffeur</li>
          <li>admin@aegis.demo — Admin</li>
        </ul>
        <p className="mt-3 text-zinc-600">
          Failed attempts are audited. Stack fingerprints suppressed.
        </p>
      </div>
    </div>
  );
}

function roleHome(role: string) {
  switch (role) {
    case "PROVIDER":
      return "/provider";
    case "CLIENT":
      return "/client";
    case "OPS":
      return "/ops";
    case "ADMIN":
      return "/admin";
    default:
      return "/";
  }
}
