import { describe, expect, it } from "vitest";
import type { Category } from "@/db/schema";
import { canonicalCategoryName } from "./category-aliases";
import { findCategory } from "./category-match";

const categories = [
  {
    id: "restaurants",
    name: "Restaurantes",
    nameEn: "Restaurants",
    namePt: "Restaurantes",
    type: "expense",
  },
  {
    id: "gifts-expense",
    name: "Presentes",
    nameEn: "Gifts",
    namePt: "Presentes",
    type: "expense",
  },
  {
    id: "gifts-income",
    name: "Gifts",
    nameEn: "Gifts",
    namePt: "Presentes",
    type: "income",
  },
  {
    id: "transfer",
    name: "Transfer",
    nameEn: "Transfer",
    namePt: "Transferência",
    type: "expense",
  },
] as unknown as Category[];

describe("canonical category aliases", () => {
  it("maps Wallet names to the curated categories", () => {
    expect(canonicalCategoryName("Dining")).toBe("Restaurantes");
    expect(canonicalCategoryName("Housing")).toBe("Casa");
    expect(canonicalCategoryName("Subscriptions")).toBe("Assinaturas e Streaming");
    expect(canonicalCategoryName("Carro e Moto")).toBe("Veículo");
    expect(canonicalCategoryName("Rendimentos")).toBe("Juros e Dividendos");
  });
});

describe("findCategory", () => {
  it("resolves aliases and translated names", () => {
    expect(findCategory(categories, "Dining", -10)?.id).toBe("restaurants");
    expect(findCategory(categories, "Restaurants", -10)?.id).toBe("restaurants");
    expect(findCategory(categories, "Transferência", -10)?.id).toBe("transfer");
  });

  it("picks the category type that matches the transaction sign", () => {
    expect(findCategory(categories, "Presentes", 100)?.id).toBe("gifts-income");
    expect(findCategory(categories, "Presentes", -100)?.id).toBe("gifts-expense");
  });

  it("returns null for unknown categories", () => {
    expect(findCategory(categories, "Something new", -10)).toBeNull();
  });
});
