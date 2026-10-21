import { describe, expect, it } from "vitest";
import { localizedCategoryCompare, localizedCategoryName } from "./category-name";
import { categoryTranslation } from "./category-translations";

describe("category translations", () => {
  it("maps Portuguese and English names to the same pair", () => {
    expect(categoryTranslation("Taxas")).toMatchObject({ en: "Fees", pt: "Taxas" });
    expect(categoryTranslation("Fees")).toMatchObject({ en: "Fees", pt: "Taxas" });
    expect(categoryTranslation("Fuel")).toMatchObject({ en: "Fuel", pt: "Combustível" });
  });

  it("handles imported spelling aliases", () => {
    expect(categoryTranslation("Insurances")).toMatchObject({ en: "Insurance" });
    expect(categoryTranslation("Vôos")).toMatchObject({ en: "Flights", pt: "Voos" });
  });

  it("returns null for unknown categories", () => {
    expect(categoryTranslation("Something new")).toBeNull();
  });
});

describe("localized category names", () => {
  const category = { name: "Taxas", nameEn: "Fees", namePt: "Taxas" };

  it("uses the active locale", () => {
    expect(localizedCategoryName(category, "en")).toBe("Fees");
    expect(localizedCategoryName(category, "pt-BR")).toBe("Taxas");
  });

  it("falls back to the canonical name", () => {
    expect(localizedCategoryName({ name: "Unknown" }, "en")).toBe("Unknown");
    expect(localizedCategoryName({ name: "Unknown" }, "pt-BR")).toBe("Unknown");
  });

  it("sorts by the localized name", () => {
    const values = [
      { name: "Zebra", nameEn: "Zebra", namePt: "Zebra" },
      { name: "Casa", nameEn: "Home", namePt: "Casa" },
    ];
    expect(values.sort((a, b) => localizedCategoryCompare(a, b, "en"))[0].nameEn).toBe("Home");
  });
});
