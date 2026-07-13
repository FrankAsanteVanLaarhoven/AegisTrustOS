import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { MemberRatingCard } from "@/components/trust/MemberRating";
import { getClientRatingSummary } from "@/lib/services/ratings-service";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ClientDashboard() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "CLIENT" && session.user.role !== "ADMIN") {
    redirect("/");
  }

  const client = await db.clientProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      requests: {
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { category: true, matches: true },
      },
      bookings: {
        orderBy: { scheduledStart: "desc" },
        take: 5,
        include: { request: true, provider: { include: { user: true } } },
      },
    },
  });

  if (!client) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <p>No client profile.</p>
      </div>
    );
  }

  const clientRatings = await getClientRatingSummary(client.id);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">Client console</h1>
          <p className="text-sm text-zinc-500">
            {session.user.name}
            {client.organisation ? ` · ${client.organisation}` : ""} · {client.city}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="gold">{client.clientRiskTier}</Badge>
          {clientRatings.average != null ? (
            <Badge tone="gold">
              ★ {clientRatings.average.toFixed(1)} ({clientRatings.count})
            </Badge>
          ) : null}
          <Link href="/client/care" className={buttonClass("secondary", "sm")}>
            Care circle
          </Link>
          <Link href="/client/requests/new" className={buttonClass("primary", "sm")}>
            New service request
          </Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <MemberRatingCard
            title="Your member reputation"
            summary={clientRatings}
          />
          <p className="mt-2 text-[11px] text-zinc-600">
            Providers rate clients after completed bookings (reliability,
            professionalism, communication).
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
          <Card>
            <CardHeader title="Requests" subtitle="Explainable match shortlists" />
            <CardBody>
              <ul className="divide-y divide-white/[0.06]">
                {client.requests.map((r) => (
                  <li key={r.id} className="py-3">
                    <Link
                      href={`/client/requests/${r.id}`}
                      className="flex items-start justify-between gap-3 hover:opacity-90"
                    >
                      <div>
                        <p className="font-medium text-zinc-100">{r.title}</p>
                        <p className="text-xs text-zinc-500">
                          {r.category.name} · {r.matches.length} match(es) ·{" "}
                          {formatDate(r.startAt)}
                        </p>
                      </div>
                      <Badge tone="navy">{r.status}</Badge>
                    </Link>
                  </li>
                ))}
                {!client.requests.length ? (
                  <li className="text-sm text-zinc-500">No requests yet.</li>
                ) : null}
              </ul>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Bookings"
              action={
                <Link href="/client/bookings" className="text-sm text-zinc-100">
                  View all
                </Link>
              }
            />
            <CardBody>
              <ul className="divide-y divide-white/[0.06]">
                {client.bookings.map((b) => (
                  <li key={b.id} className="flex justify-between py-3 text-sm">
                    <div>
                      <p className="font-medium text-zinc-100">{b.request.title}</p>
                      <p className="text-xs text-zinc-500">
                        {b.provider.user.name} · {formatDate(b.scheduledStart)}
                      </p>
                    </div>
                    <Badge tone="muted">{b.status}</Badge>
                  </li>
                ))}
                {!client.bookings.length ? (
                  <li className="text-sm text-zinc-500">No bookings yet.</li>
                ) : null}
              </ul>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
