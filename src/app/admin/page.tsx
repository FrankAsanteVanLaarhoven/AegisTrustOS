import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { buttonClass } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/");

  const [users, categories, partners] = await Promise.all([
    db.user.count(),
    db.category.count(),
    db.partnerOrg.count(),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold text-zinc-100">Admin</h1>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardBody>
            <p className="text-3xl font-semibold">{users}</p>
            <p className="text-sm text-zinc-500">Users</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-3xl font-semibold">{categories}</p>
            <p className="text-sm text-zinc-500">Categories</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-3xl font-semibold">{partners}</p>
            <p className="text-sm text-zinc-500">Partner orgs</p>
          </CardBody>
        </Card>
      </div>
      <Card>
        <CardHeader title="Admin surfaces" />
        <CardBody className="flex flex-wrap gap-2">
          <Link href="/admin/categories" className={buttonClass("secondary", "sm")}>
            Categories
          </Link>
          <Link href="/admin/compliance" className={buttonClass("secondary", "sm")}>
            Compliance matrix
          </Link>
          <Link href="/admin/users" className={buttonClass("secondary", "sm")}>
            Users
          </Link>
          <Link href="/ops" className={buttonClass("primary", "sm")}>
            Ops console
          </Link>
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="White-label partners (stub)" />
        <CardBody>
          <PartnerList />
        </CardBody>
      </Card>
    </div>
  );
}

async function PartnerList() {
  const partners = await db.partnerOrg.findMany({
    include: { memberships: { include: { user: true } } },
  });
  if (!partners.length) return <p className="text-sm text-zinc-500">None</p>;
  return (
    <ul className="space-y-2 text-sm">
      {partners.map((p) => (
        <li key={p.id} className="rounded-lg border border-white/[0.06] px-3 py-2">
          <strong>{p.name}</strong> ({p.type} · {p.status}) — {p.contactEmail}
          <br />
          <span className="text-xs text-zinc-500">
            Members: {p.memberships.map((m) => m.user.email).join(", ")}
          </span>
        </li>
      ))}
    </ul>
  );
}
