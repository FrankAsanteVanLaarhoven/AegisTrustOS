import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { formatDate, parseJsonArray } from "@/lib/utils";
import {
  updateProviderProfile,
  runIdvCheck,
} from "@/lib/actions";
import { AegisPassportCard } from "@/components/trust/AegisPassportCard";

export const dynamic = "force-dynamic";

export default async function ProviderDashboard() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "PROVIDER" && session.user.role !== "ADMIN") {
    redirect("/");
  }

  const profile = await db.providerProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      credentials: true,
      categories: { include: { category: true } },
      idvChecks: { orderBy: { createdAt: "desc" }, take: 3 },
      passport: true,
      bookings: {
        orderBy: { scheduledStart: "desc" },
        take: 5,
        include: { request: true },
      },
    },
  });

  if (!profile) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <p>No provider profile. Register as a provider.</p>
      </div>
    );
  }

  const skills = parseJsonArray(profile.skillsJson).join(", ");

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">Provider console</h1>
          <p className="text-sm text-zinc-500">
            {session.user.name} · {profile.city}
            {profile.area ? ` · ${profile.area}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge
            tone={
              profile.overallStatus === "VERIFIED"
                ? "success"
                : profile.overallStatus === "IN_REVIEW"
                  ? "warn"
                  : "muted"
            }
          >
            {profile.overallStatus}
          </Badge>
          <Badge tone="gold">Advisory risk {profile.riskScore}/100</Badge>
        </div>
      </div>

      {profile.passport?.status === "ACTIVE" ? (
        <AegisPassportCard
          passport={profile.passport}
          providerName={session.user.name}
          city={profile.city}
        />
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Link href="/provider/verify" className={buttonClass("primary", "sm")}>
          Verify identity
        </Link>
        <Link href="/provider/wallet" className={buttonClass("secondary", "sm")}>
          Credential wallet
        </Link>
        <Link href="/provider/categories" className={buttonClass("secondary", "sm")}>
          Categories
        </Link>
        <Link href="/provider/bookings" className={buttonClass("secondary", "sm")}>
          Bookings
        </Link>
        <Link href="/provider/onboarding" className={buttonClass("ghost", "sm")}>
          Onboarding guide
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Profile"
            subtitle="London pilot defaults applied"
          />
          <CardBody>
            <form action={updateProviderProfile} className="space-y-3">
              <label className="block text-sm">
                <span className="text-zinc-400">Bio</span>
                <textarea
                  name="bio"
                  defaultValue={profile.bio ?? ""}
                  rows={4}
                  className="mt-1 w-full rounded-xl border border-white/10 px-3 py-2 text-sm"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm">
                  <span className="text-zinc-400">City</span>
                  <input
                    name="city"
                    defaultValue={profile.city}
                    className="mt-1 w-full rounded-xl border border-white/10 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-zinc-400">Area</span>
                  <input
                    name="area"
                    defaultValue={profile.area ?? ""}
                    className="mt-1 w-full rounded-xl border border-white/10 px-3 py-2 text-sm"
                  />
                </label>
              </div>
              <label className="block text-sm">
                <span className="text-zinc-400">Skills (comma-separated)</span>
                <input
                  name="skills"
                  defaultValue={skills}
                  className="mt-1 w-full rounded-xl border border-white/10 px-3 py-2 text-sm"
                />
              </label>
              <button type="submit" className={buttonClass("primary", "sm")}>
                Save profile
              </button>
            </form>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Trust snapshot" subtitle="AI advisory · human clearance required" />
          <CardBody className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl bg-[#141a22] p-3">
                <p className="text-2xl font-semibold text-zinc-100">
                  {profile.credentials.length}
                </p>
                <p className="text-xs text-zinc-500">Credentials</p>
              </div>
              <div className="rounded-xl bg-[#141a22] p-3">
                <p className="text-2xl font-semibold text-zinc-100">
                  {profile.categories.filter((c) => c.status === "VERIFIED").length}
                </p>
                <p className="text-xs text-zinc-500">Verified cats</p>
              </div>
              <div className="rounded-xl bg-[#141a22] p-3">
                <p className="text-2xl font-semibold text-zinc-100">
                  {profile.idvChecks[0]?.status ?? "—"}
                </p>
                <p className="text-xs text-zinc-500">Latest IDV</p>
              </div>
            </div>
            <form action={runIdvCheck}>
              <button type="submit" className={buttonClass("secondary", "sm")}>
                Run mock IDV / liveness
              </button>
            </form>
            <ul className="space-y-2 text-sm">
              {profile.categories.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between rounded-lg border border-white/[0.06] px-3 py-2"
                >
                  <span>{c.category.name}</span>
                  <Badge
                    tone={
                      c.status === "VERIFIED"
                        ? "success"
                        : c.status === "WAITLIST"
                          ? "warn"
                          : "muted"
                    }
                  >
                    {c.status} · {c.trustTier}
                  </Badge>
                </li>
              ))}
              {!profile.categories.length ? (
                <li className="text-zinc-500">
                  No categories yet.{" "}
                  <Link href="/provider/categories" className="text-zinc-100 underline">
                    Apply
                  </Link>
                </li>
              ) : null}
            </ul>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Recent bookings" />
        <CardBody>
          {profile.bookings.length === 0 ? (
            <p className="text-sm text-zinc-500">No bookings yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {profile.bookings.map((b) => (
                <li key={b.id} className="flex justify-between py-3 text-sm">
                  <div>
                    <p className="font-medium text-zinc-100">{b.request.title}</p>
                    <p className="text-zinc-500">
                      {formatDate(b.scheduledStart)} · {b.location}
                    </p>
                  </div>
                  <Badge tone="navy">{b.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
