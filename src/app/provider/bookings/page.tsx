import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { addServiceLog, leaveProviderReview } from "@/lib/actions";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { StarDisplay } from "@/components/trust/MemberRating";

export const dynamic = "force-dynamic";

export default async function ProviderBookingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "PROVIDER") redirect("/");

  const profile = await db.providerProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!profile) redirect("/provider");

  const bookings = await db.booking.findMany({
    where: { providerId: profile.id },
    orderBy: { scheduledStart: "desc" },
    include: {
      request: true,
      client: { include: { user: true } },
      logs: { orderBy: { createdAt: "asc" }, include: { createdBy: true } },
      reviews: true,
    },
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-10 sm:px-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-100">Your bookings</h1>
        <p className="text-sm text-zinc-500">
          Log visits and rate clients after completed work.
        </p>
      </div>
      {bookings.map((b) => {
        const myReview = b.reviews.find(
          (r) => r.direction === "PROVIDER_TO_CLIENT",
        );
        const clientReview = b.reviews.find(
          (r) => r.direction === "CLIENT_TO_PROVIDER",
        );
        return (
          <Card key={b.id}>
            <CardHeader
              title={b.request.title}
              subtitle={`${b.client.user.name} · ${formatDate(b.scheduledStart)} · ${b.location}`}
              action={<Badge tone="navy">{b.status}</Badge>}
            />
            <CardBody className="space-y-4">
              <p className="text-sm text-zinc-400">{b.request.brief}</p>
              <ul className="space-y-1 text-xs text-zinc-500">
                {b.logs.map((l) => (
                  <li key={l.id}>
                    [{l.kind}] {l.body} — {l.createdBy.name}
                  </li>
                ))}
              </ul>
              <form action={addServiceLog} className="flex flex-wrap gap-2">
                <input type="hidden" name="bookingId" value={b.id} />
                <select
                  name="kind"
                  className="rounded-xl border border-white/10 px-2 py-1.5 text-sm"
                  defaultValue="NOTE"
                >
                  <option value="CHECK_IN">CHECK_IN</option>
                  <option value="NOTE">NOTE</option>
                  <option value="CHECK_OUT">CHECK_OUT</option>
                </select>
                <input
                  name="body"
                  required
                  placeholder="Log entry"
                  className="min-w-[200px] flex-1 rounded-xl border border-white/10 px-3 py-1.5 text-sm"
                />
                <button type="submit" className={buttonClass("secondary", "sm")}>
                  Add log
                </button>
              </form>

              {clientReview ? (
                <p className="text-xs text-zinc-500">
                  Client rated you: <StarDisplay value={clientReview.rating} />
                </p>
              ) : null}

              {myReview ? (
                <div className="text-sm text-zinc-400">
                  You rated client: <StarDisplay value={myReview.rating} />
                  {myReview.body ? ` — ${myReview.body}` : ""}
                </div>
              ) : b.status === "COMPLETED" ? (
                <form
                  action={leaveProviderReview}
                  className="space-y-2 rounded-lg border border-white/[0.06] p-3"
                >
                  <input type="hidden" name="bookingId" value={b.id} />
                  <p className="font-mono text-[10px] uppercase tracking-wider text-[#e87722]">
                    Rate this client
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
                    Submit client rating
                  </button>
                </form>
              ) : null}
            </CardBody>
          </Card>
        );
      })}
      {!bookings.length ? (
        <p className="text-sm text-zinc-500">No bookings assigned yet.</p>
      ) : null}
    </div>
  );
}
