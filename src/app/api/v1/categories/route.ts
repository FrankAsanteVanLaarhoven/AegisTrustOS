import { db } from "@/lib/db";
import { getFeatures } from "@/config/features";
import { apiOk } from "@/lib/api/envelope";
import { groupCategories } from "@/lib/categories/groups";

export const dynamic = "force-dynamic";

export async function GET() {
  const features = getFeatures();
  const categories = await db.category.findMany({
    orderBy: [{ groupSort: "asc" }, { sortOrder: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      phase: true,
      riskLevel: true,
      mode: true,
      description: true,
      sortOrder: true,
      groupKey: true,
      groupLabel: true,
      groupSort: true,
    },
  });

  const filtered = categories.filter((c) => {
    if (c.phase === "SECURITY" && !features.securityVertical) return false;
    if (c.phase === "CARE" && !features.careVertical) return false;
    return true;
  });

  return apiOk({
    categories: filtered,
    groups: groupCategories(filtered),
  });
}
