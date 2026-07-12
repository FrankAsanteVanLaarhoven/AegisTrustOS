import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { AegisPassportCard } from "@/components/trust/AegisPassportCard";

export const dynamic = "force-dynamic";

export default async function PublicPassportPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const passport = await db.aegisPassport.findUnique({
    where: { publicSlug: slug },
    include: { provider: { include: { user: true } } },
  });
  if (!passport || passport.status === "REVOKED") notFound();

  return (
    <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
      <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500">
        Verified professional · Aegis Trust OS
      </p>
      <AegisPassportCard
        passport={passport}
        providerName={passport.provider.user.name}
        city={passport.provider.city}
      />
    </div>
  );
}
