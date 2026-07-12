import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { addServiceLog } from "@/lib/actions";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

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
      logs: { orderBy: { createdAt: "asc" }, include: { createdBy: true } },
    },
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold text-zinc-100">Your bookings</h1>
      {bookings.map((b) => (
        <Card key={b.id}>
          <CardHeader
            title={b.request.title}
            subtitle={`${formatDate(b.scheduledStart)} · ${b.location}`}
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
          </CardBody>
        </Card>
      ))}
      {!bookings.length ? (
        <p className="text-sm text-zinc-500">No bookings assigned yet.</p>
      ) : null}
    </div>
  );
}
