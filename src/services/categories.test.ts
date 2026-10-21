import "dotenv/config";
import { afterAll, describe, expect, it } from "vitest";
import { closeDb } from "@/db";
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
