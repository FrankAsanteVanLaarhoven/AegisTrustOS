import Link from "next/link";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { auth, signIn } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { UserRole } from "@prisma/client";

export default async function RegisterPage() {
  const session = await auth();
  if (session?.user) redirect("/");

  async function registerAction(formData: FormData) {
    "use server";
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "")
      .toLowerCase()
      .trim();
    const password = String(formData.get("password") ?? "");
    const role = String(formData.get("role") ?? "CLIENT") as UserRole;
    if (!name || !email || password.length < 6) {
      redirect("/register?error=invalid");
    }
    if (role !== "CLIENT" && role !== "PROVIDER") {
      redirect("/register?error=role");
    }
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) redirect("/register?error=exists");

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await db.user.create({
      data: { name, email, passwordHash, role },
    });

    if (role === "PROVIDER") {
      await db.providerProfile.create({
        data: { userId: user.id, city: "London", overallStatus: "DRAFT" },
      });
    } else {
      await db.clientProfile.create({
        data: { userId: user.id, city: "London", clientRiskTier: "STANDARD" },
      });
    }

    await writeAudit({
      actorId: user.id,
      entityType: "User",
      entityId: user.id,
      action: "REGISTER",
      payload: { role },
    });

    await signIn("credentials", {
      email,
      password,
      redirectTo: role === "PROVIDER" ? "/provider" : "/client",
    });
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <Card>
        <CardHeader title="Create account" subtitle="Join the London pilot" />
        <CardBody>
          <form action={registerAction} className="space-y-4">
            <label className="block text-sm">
              <span className="mb-1 block text-zinc-400">Full name</span>
              <input
                name="name"
                required
                className="w-full rounded-xl border border-white/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#c4a35a]/40"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-zinc-400">Email</span>
              <input
                name="email"
                type="email"
                required
                className="w-full rounded-xl border border-white/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#c4a35a]/40"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-zinc-400">Password</span>
              <input
                name="password"
                type="password"
                minLength={6}
                required
                className="w-full rounded-xl border border-white/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#c4a35a]/40"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-zinc-400">I am a…</span>
              <select
                name="role"
                className="w-full rounded-xl border border-white/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#c4a35a]/40"
                defaultValue="CLIENT"
              >
                <option value="CLIENT">Client (book services)</option>
                <option value="PROVIDER">Provider (offer services)</option>
              </select>
            </label>
            <Button type="submit" className="w-full">
              Create account
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-zinc-500">
            Already registered?{" "}
            <Link href="/login" className="font-medium text-zinc-100">
              Sign in
            </Link>
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
