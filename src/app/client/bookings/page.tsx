import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { leaveReview } from "@/lib/actions";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ClientBookingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "CLIENT") redirect("/");

  const client = await db.clientProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!client) redirect("/client");

  const bookings = await db.booking.findMany({
    where: { clientId: client.id },
    orderBy: { scheduledStart: "desc" },
    include: {
      request: true,
      provider: { include: { user: true } },
      review: true,
      logs: { orderBy: { createdAt: "asc" } },
    },
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold text-zinc-100">Your bookings</h1>
      {bookings.map((b) => (
        <Card key={b.id}>
          <CardHeader
            title={b.request.title}
            subtitle={`${b.provider.user.name} · ${formatDate(b.scheduledStart)}`}
            action={<Badge tone="navy">{b.status}</Badge>}
          />
          <CardBody className="space-y-3">
            <ul className="text-xs text-zinc-500 space-y-1">
              {b.logs.map((l) => (
                <li key={l.id}>
                  [{l.kind}] {l.body}
                </li>
              ))}
            </ul>
            {b.review ? (
              <p className="text-sm text-zinc-300">
                Your review: {"★".repeat(b.review.rating)} — {b.review.body}
              </p>
            ) : b.status === "COMPLETED" ? (
              <form action={leaveReview} className="flex flex-wrap gap-2">
                <input type="hidden" name="bookingId" value={b.id} />
                <select
                  name="rating"
                  defaultValue="5"
                  className="rounded-xl border border-white/10 px-2 py-1.5 text-sm"
                >
                  {[5, 4, 3, 2, 1].map((n) => (
                    <option key={n} value={n}>
                      {n} stars
                    </option>
                  ))}
                </select>
                <input
                  name="body"
                  placeholder="Review"
                  className="min-w-[180px] flex-1 rounded-xl border border-white/10 px-3 py-1.5 text-sm"
                />
                <button type="submit" className={buttonClass("primary", "sm")}>
                  Submit review
                </button>
              </form>
            ) : null}
          </CardBody>
        </Card>
      ))}
      {!bookings.length ? (
        <p className="text-sm text-zinc-500">No bookings yet.</p>
      ) : null}
    </div>
  );
}
