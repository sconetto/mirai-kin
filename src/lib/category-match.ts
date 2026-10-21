import type { Category } from "@/db/schema";
import { canonicalCategoryName } from "./category-aliases";

/**
 * Resolves an imported/assistant category name to a canonical category row.
 * Aliases map Wallet's mixed names to the curated set; when a name exists in
 * both income and expense categories, the transaction sign picks the right one.
 */
export function findCategory(
  categories: Category[],
  name: string,
  amount?: number,
): Category | null {
  const canonical = canonicalCategoryName(name).trim().toLowerCase();
  const candidates = categories.filter((category) =>
    [category.name, category.nameEn, category.namePt].some(
      (value) => value?.trim().toLowerCase() === canonical,
    ),
  );

  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  if (amount !== undefined) {
    const preferred = candidates.find((category) =>
      amount >= 0 ? category.type === "income" : category.type === "expense",
    );
    if (preferred) return preferred;
  }

  return candidates[0];
}
