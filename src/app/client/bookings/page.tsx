import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { leaveReview } from "@/lib/actions";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { StarDisplay } from "@/components/trust/MemberRating";

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
      reviews: true,
      logs: { orderBy: { createdAt: "asc" } },
    },
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-10 sm:px-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-100">Your bookings</h1>
        <p className="text-sm text-zinc-500">
          Rate members after completed visits — overall plus reliability,
          professionalism, and communication.
        </p>
      </div>
      {bookings.map((b) => {
        const myReview = b.reviews.find(
          (r) => r.direction === "CLIENT_TO_PROVIDER",
        );
        return (
          <Card key={b.id}>
            <CardHeader
              title={b.request.title}
              subtitle={`${b.provider.user.name} · ${formatDate(b.scheduledStart)}`}
              action={<Badge tone="navy">{b.status}</Badge>}
            />
            <CardBody className="space-y-3">
              <ul className="space-y-1 text-xs text-zinc-500">
                {b.logs.map((l) => (
                  <li key={l.id}>
                    [{l.kind}] {l.body}
                  </li>
                ))}
              </ul>
              {myReview ? (
                <div className="rounded-lg border border-white/[0.06] p-3 text-sm">
                  <p className="text-zinc-300">Your rating of this member</p>
                  <StarDisplay value={myReview.rating} />
                  <p className="mt-1 text-xs text-zinc-500">
                    Reliability {myReview.reliability ?? "—"} · Professional{" "}
                    {myReview.professionalism ?? "—"} · Communication{" "}
                    {myReview.communication ?? "—"}
                  </p>
                  {myReview.body ? (
                    <p className="mt-1 text-zinc-400">{myReview.body}</p>
                  ) : null}
                </div>
              ) : b.status === "COMPLETED" ? (
                <form action={leaveReview} className="space-y-2 rounded-lg border border-white/[0.06] p-3">
                  <input type="hidden" name="bookingId" value={b.id} />
                  <p className="font-mono text-[10px] uppercase tracking-wider text-[#e87722]">
                    Rate this member
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {(
                      [
                        ["rating", "Overall"],
                        ["reliability", "Reliability"],
                        ["professionalism", "Professional"],
                        ["communication", "Communication"],
                      ] as const
                    ).map(([name, label]) => (
                      <label key={name} className="block text-xs">
                        <span className="text-zinc-500">{label}</span>
                        <select
                          name={name}
                          defaultValue="5"
                          className="mt-1 w-full rounded-md border border-white/10 bg-[#141a22] px-2 py-1.5 text-sm"
                        >
                          {[5, 4, 3, 2, 1].map((n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                        </select>
                      </label>
                    ))}
                  </div>
                  <input
                    name="body"
                    placeholder="Optional comment"
                    className="w-full rounded-md border border-white/10 bg-[#141a22] px-3 py-1.5 text-sm"
                  />
                  <button type="submit" className={buttonClass("primary", "sm")}>
                    Submit rating
                  </button>
                </form>
              ) : null}
            </CardBody>
          </Card>
        );
      })}
      {!bookings.length ? (
        <p className="text-sm text-zinc-500">No bookings yet.</p>
      ) : null}
    </div>
  );
}
