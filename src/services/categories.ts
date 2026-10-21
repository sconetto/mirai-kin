import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { isWalletGroupCategory } from "@/db/wallet-category-groups";
import { categories, transactions } from "@/db/schema";
import type { CategoryType } from "@/db/schema";
import type { CategoryCreateInput } from "@/lib/schemas";
import { categoryTranslation } from "@/lib/category-translations";
import { findCategory } from "@/lib/category-match";

export class CategoryInUseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CategoryInUseError";
  }
}

export async function listCategories(type?: CategoryType) {
  const db = getDb();
  const rows = type
    ? await db.select().from(categories).where(eq(categories.type, type)).orderBy(categories.name)
    : await db.select().from(categories).orderBy(categories.name);
  return rows.filter((row) => !isWalletGroupCategory(row));
}

export async function getCategory(id: string) {
  const db = getDb();
  const rows = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function createCategory(input: CategoryCreateInput) {
  const db = getDb();

  if (input.externalSource && input.externalId) {
    const [existing] = await db
      .select()
      .from(categories)
      .where(
        and(
          eq(categories.externalSource, input.externalSource),
          eq(categories.externalId, input.externalId),
        ),
      )
      .limit(1);
    if (existing) return existing;
  }

  const all = (await db.select().from(categories)).filter(
    (category) => !isWalletGroupCategory(category),
  );
  const sameType = findCategory(
    all.filter((category) => category.type === input.type),
    input.name,
  );
  const existing = sameType ?? findCategory(all, input.name);
  if (existing) {
    if (!existing.externalId && input.externalSource && input.externalId) {
      const [adopted] = await db
        .update(categories)
        .set({ externalSource: input.externalSource, externalId: input.externalId })
        .where(eq(categories.id, existing.id))
        .returning();
      if (adopted) return adopted;
    }
    return existing;
  }

  const translation = categoryTranslation(input.name);
  const [row] = await db
    .insert(categories)
    .values({
      name: input.name,
      nameEn: input.nameEn ?? translation?.en ?? null,
      namePt: input.namePt ?? translation?.pt ?? null,
      type: input.type,
      parentId: input.parentId ?? null,
      color: input.color ?? null,
      icon: input.icon ?? null,
      externalSource: input.externalSource,
      externalId: input.externalId,
    })
    .returning();
  return row;
}

export async function updateCategory(id: string, input: Partial<CategoryCreateInput>) {
  const db = getDb();
  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.nameEn !== undefined) patch.nameEn = input.nameEn;
  if (input.namePt !== undefined) patch.namePt = input.namePt;
  if (input.name !== undefined && input.nameEn === undefined && input.namePt === undefined) {
    const translation = categoryTranslation(input.name);
    if (translation) {
      patch.nameEn = translation.en;
      patch.namePt = translation.pt;
    }
  }
  if (input.type !== undefined) patch.type = input.type;
  if (input.parentId !== undefined) patch.parentId = input.parentId;
  if (input.color !== undefined) patch.color = input.color;
  if (input.icon !== undefined) patch.icon = input.icon;
  if (input.externalSource !== undefined) patch.externalSource = input.externalSource;
  if (input.externalId !== undefined) patch.externalId = input.externalId;

  const [row] = await db.update(categories).set(patch).where(eq(categories.id, id)).returning();
  return row ?? null;
}

export async function deleteCategory(id: string) {
  const db = getDb();
  const category = await getCategory(id);
  if (!category) return null;
  if (category.isSystem) {
    throw new CategoryInUseError("System categories cannot be deleted");
  }

  const [used] = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(and(eq(transactions.categoryId, id)))
    .limit(1);

  if (used) {
    throw new CategoryInUseError("Category is referenced by transactions");
  }

  const [row] = await db.delete(categories).where(eq(categories.id, id)).returning();
  return row ?? null;
}
