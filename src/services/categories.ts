import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { categories, transactions } from "@/db/schema";
import type { CategoryType } from "@/db/schema";
import type { CategoryCreateInput } from "@/lib/schemas";

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
  return rows;
}

export async function getCategory(id: string) {
  const db = getDb();
  const rows = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function createCategory(input: CategoryCreateInput) {
  const db = getDb();
  const [row] = await db
    .insert(categories)
    .values({
      name: input.name,
      type: input.type,
      parentId: input.parentId ?? null,
      color: input.color ?? null,
      icon: input.icon ?? null,
    })
    .returning();
  return row;
}

export async function updateCategory(id: string, input: Partial<CategoryCreateInput>) {
  const db = getDb();
  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.type !== undefined) patch.type = input.type;
  if (input.parentId !== undefined) patch.parentId = input.parentId;
  if (input.color !== undefined) patch.color = input.color;
  if (input.icon !== undefined) patch.icon = input.icon;

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
