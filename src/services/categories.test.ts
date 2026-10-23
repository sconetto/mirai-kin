import "dotenv/config";
import { afterAll, describe, expect, it } from "vitest";
import { and, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { closeDb, getDb } from "@/db";
import { categories, transactions } from "@/db/schema";
import { deleteCategory } from "./categories";
import { listCategories, createCategory } from "./categories";

describe.skipIf(!process.env.DATABASE_URL)("localized categories", () => {
  let createdId = "";

  afterAll(async () => {
    if (createdId) await deleteCategory(createdId);
    await closeDb();
  });

  it("backfills known categories in both languages", async () => {
    const categories = await listCategories();
    const known = categories.filter((category) =>
      ["Taxas", "Taxes", "Casa", "Groceries", "Vôos", "Insurances"].includes(category.name),
    );
    expect(known.length).toBeGreaterThan(0);
    expect(known.every((category) => category.nameEn && category.namePt)).toBe(true);
  });

  it("has no duplicate localized names", async () => {
    const duplicates = await getDb()
      .select({ nameEn: categories.nameEn, namePt: categories.namePt })
      .from(categories)
      .where(
        and(
          eq(categories.isSystem, false),
          isNotNull(categories.nameEn),
          isNotNull(categories.namePt),
        ),
      )
      .groupBy(categories.nameEn, categories.namePt)
      .having(sql`count(*) > 1`);
    expect(duplicates).toHaveLength(0);
  });

  it("marks every Transfer-category leg as a transfer", async () => {
    const [row] = await getDb()
      .select({ count: sql<number>`count(*)::int` })
      .from(transactions)
      .innerJoin(categories, eq(categories.id, transactions.categoryId))
      .where(
        and(
          sql`${categories.name} = 'Transfer'`,
          isNull(transactions.paymentType),
          isNull(transactions.transferId),
        ),
      );
    expect(row?.count ?? 0).toBe(0);
  });

  it("stores translations for a newly created category", async () => {
    const category = await createCategory({
      name: "TEST localized category",
      type: "expense",
      nameEn: "Test localized category",
      namePt: "Categoria localizada de teste",
    });
    createdId = category.id;
    expect(category.nameEn).toBe("Test localized category");
    expect(category.namePt).toBe("Categoria localizada de teste");
  });
});
