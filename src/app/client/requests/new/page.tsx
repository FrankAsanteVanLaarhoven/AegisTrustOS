import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createServiceRequest } from "@/lib/actions";
import { groupCategories } from "@/lib/categories/groups";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function NewRequestPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "CLIENT") redirect("/");

  const categories = await db.category.findMany({
    where: { mode: "ACTIVE" },
    orderBy: [{ groupSort: "asc" }, { sortOrder: "asc" }],
  });
  const groups = groupCategories(categories);

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
          subtitle="London pilot · grouped active categories"
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
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-zinc-500">Title</span>
              <input
                name="title"
                required
                placeholder="e.g. Weekly clean + grocery run"
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
                  defaultValue="T1"
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
                placeholder="discretion, punctual"
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
