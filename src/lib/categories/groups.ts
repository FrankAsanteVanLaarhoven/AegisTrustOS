export type GroupableCategory = {
  id: string;
  slug: string;
  name: string;
  description: string;
  mode: string;
  phase: string;
  riskLevel: string;
  sortOrder: number;
  groupKey: string;
  groupLabel: string;
  groupSort: number;
  checklistJson?: string;
};

export type CategoryGroup = {
  groupKey: string;
  groupLabel: string;
  groupSort: number;
  items: GroupableCategory[];
};

export function groupCategories(
  categories: GroupableCategory[],
): CategoryGroup[] {
  const map = new Map<string, CategoryGroup>();
  for (const c of categories) {
    const key = c.groupKey || "other";
    let g = map.get(key);
    if (!g) {
      g = {
        groupKey: key,
        groupLabel: c.groupLabel || key,
        groupSort: c.groupSort ?? 999,
        items: [],
      };
      map.set(key, g);
    }
    g.items.push(c);
  }
  for (const g of map.values()) {
    g.items.sort((a, b) => a.sortOrder - b.sortOrder);
  }
  return [...map.values()].sort((a, b) => a.groupSort - b.groupSort);
}
