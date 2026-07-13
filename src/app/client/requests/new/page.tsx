import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createServiceRequest } from "@/lib/actions";
import { groupCategories } from "@/lib/categories/groups";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function NewRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ household?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "CLIENT") redirect("/");
  const sp = await searchParams;

  const client = await db.clientProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!client) redirect("/client");

  const categories = await db.category.findMany({
    where: { mode: "ACTIVE" },
    orderBy: [{ groupSort: "asc" }, { sortOrder: "asc" }],
  });
  const groups = groupCategories(categories);

  const households = await db.careHousehold.findMany({
    where: { ownerClientId: client.id },
    orderBy: { createdAt: "desc" },
  });

  const defaultStart = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  const local = new Date(
    defaultStart.getTime() - defaultStart.getTimezoneOffset() * 60000,
  )
    .toISOString()
    .slice(0, 16);

  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
      <Card>
        <CardHeader
          title="New service request"
          subtitle="Care pathway roles require a household and family carer approval before booking"
        />
        <CardBody>
          <form action={createServiceRequest} className="space-y-4">
            <label className="block text-sm">
              <span className="text-zinc-500">Category</span>
              <select
                name="categoryId"
                required
                className="mt-1 w-full rounded-xl border border-white/10 bg-[#141a22] px-3 py-2 text-sm"
              >
                {groups.map((g) => (
                  <optgroup key={g.groupKey} label={g.groupLabel}>
                    {g.items.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                        {c.requiresFamilyApproval ? " · family approval" : ""}
                        {c.nhsHomePathway ? " · home pathway" : ""}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>

            <label className="block text-sm">
              <span className="text-zinc-500">
                Care household (required for home care / companionship / LD)
              </span>
              <select
                name="careHouseholdId"
                className="mt-1 w-full rounded-xl border border-white/10 bg-[#141a22] px-3 py-2 text-sm"
                defaultValue={sp.household ?? ""}
              >
                <option value="">— Not a care household request —</option>
                {households.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.recipientName} · {h.label}
                  </option>
                ))}
              </select>
              {!households.length ? (
                <p className="mt-1 text-xs text-zinc-600">
                  Create a household in{" "}
                  <a href="/client/care" className="text-[#3dd6c6] underline">
                    Care circle
                  </a>{" "}
                  first.
                </p>
              ) : null}
            </label>

            <label className="block text-sm">
              <span className="text-zinc-500">Title</span>
              <input
                name="title"
                required
                placeholder="e.g. Weekday companionship visits"
                className="mt-1 w-full rounded-xl border border-white/10 bg-[#141a22] px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-500">Brief</span>
              <textarea
                name="brief"
                required
                rows={4}
                className="mt-1 w-full rounded-xl border border-white/10 bg-[#141a22] px-3 py-2 text-sm"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm">
                <span className="text-zinc-500">Location</span>
                <input
                  name="location"
                  defaultValue="London"
                  className="mt-1 w-full rounded-xl border border-white/10 bg-[#141a22] px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-sm">
                <span className="text-zinc-500">Area</span>
                <input
                  name="area"
                  defaultValue="Mayfair"
                  className="mt-1 w-full rounded-xl border border-white/10 bg-[#141a22] px-3 py-2 text-sm"
                />
              </label>
            </div>
            <label className="block text-sm">
              <span className="text-zinc-500">Start</span>
              <input
                name="startAt"
                type="datetime-local"
                required
                defaultValue={local}
                className="mt-1 w-full rounded-xl border border-white/10 bg-[#141a22] px-3 py-2 text-sm"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm">
                <span className="text-zinc-500">Min trust tier</span>
                <select
                  name="minTrustTier"
                  defaultValue="T2"
                  className="mt-1 w-full rounded-xl border border-white/10 bg-[#141a22] px-3 py-2 text-sm"
                >
                  <option value="T1">T1</option>
                  <option value="T2">T2</option>
                  <option value="T3">T3</option>
                </select>
              </label>
              <label className="block text-sm">
                <span className="text-zinc-500">Discretion</span>
                <select
                  name="discretionLevel"
                  defaultValue="HIGH"
                  className="mt-1 w-full rounded-xl border border-white/10 bg-[#141a22] px-3 py-2 text-sm"
                >
                  <option value="STANDARD">STANDARD</option>
                  <option value="HIGH">HIGH</option>
                  <option value="MAXIMUM">MAXIMUM</option>
                </select>
              </label>
            </div>
            <label className="block text-sm">
              <span className="text-zinc-500">Skills (comma-separated)</span>
              <input
                name="skills"
                placeholder="companionship, LD support, discretion"
                className="mt-1 w-full rounded-xl border border-white/10 bg-[#141a22] px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-500">Budget band</span>
              <select
                name="budgetBand"
                defaultValue="PREMIUM"
                className="mt-1 w-full rounded-xl border border-white/10 bg-[#141a22] px-3 py-2 text-sm"
              >
                <option value="STANDARD">STANDARD</option>
                <option value="PREMIUM">PREMIUM</option>
                <option value="UHNW">UHNW</option>
              </select>
            </label>
            <Button type="submit" className="w-full">
              Create &amp; run match engine
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
