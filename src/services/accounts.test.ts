import "dotenv/config";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { closeDb, getDb } from "@/db";
import { categories, transactions } from "@/db/schema";
import {
  createAccount,
  deleteAccount,
  getAccount,
  getAccountGrowth,
  listAccountBalances,
  updateAccount,
} from "./accounts";

const DAY = 86_400_000;

describe.skipIf(!process.env.DATABASE_URL)("account configuration and growth", () => {
  let savingsId = "";
  let cardId = "";

  beforeAll(async () => {
    const db = getDb();
    const savings = await createAccount({
      name: "TEST growth savings",
      type: "savings",
      currency: "BRL",
      openingBalance: "1000",
      ownershipType: "company",
    });
    savingsId = savings.id;

    const [passive] = await db
      .select()
      .from(categories)
      .where(eq(categories.name, "Juros e Dividendos"))
      .limit(1);

    const when = new Date(Date.now() - 60 * DAY);
    await db.insert(transactions).values([
      {
        accountId: savingsId,
        amount: "200",
        currency: "BRL",
        baseCurrency: "BRL",
        baseAmount: "200",
        recordDate: when,
        note: "TEST contribution",
        reviewStatus: "reviewed",
      },
      {
        accountId: savingsId,
        categoryId: passive?.id ?? null,
        amount: "50",
        currency: "BRL",
        baseCurrency: "BRL",
        baseAmount: "50",
        recordDate: when,
        note: "TEST interest",
        reviewStatus: "reviewed",
      },
      {
        accountId: savingsId,
        amount: "-100",
        currency: "BRL",
        baseCurrency: "BRL",
        baseAmount: "-100",
        recordDate: when,
        note: "TEST withdrawal",
        reviewStatus: "reviewed",
      },
    ]);

    const card = await createAccount({
      name: "TEST credit card",
      type: "credit_card",
      currency: "BRL",
      openingBalance: "0",
      ownershipType: "personal",
      creditLimit: "1000",
      statementCloseDay: 20,
      dueDay: 10,
    });
    cardId = card.id;
    await db.insert(transactions).values({
      accountId: cardId,
      amount: "-250",
      currency: "BRL",
      baseCurrency: "BRL",
      baseAmount: "-250",
      recordDate: new Date(),
      note: "TEST card purchase",
      reviewStatus: "reviewed",
    });
  });

  afterAll(async () => {
    await deleteAccount(savingsId);
    await deleteAccount(cardId);
    await closeDb();
  });

  it("stores ownership and asset subtype", async () => {
    const savings = await getAccount(savingsId);
    expect(savings?.ownershipType).toBe("company");
    expect(savings?.assetSubtype).toBeNull();

    const updated = await updateAccount(savingsId, {
      assetSubtype: "stocks",
      ownershipType: "personal",
    });
    expect(updated?.assetSubtype).toBe("stocks");
    expect(updated?.ownershipType).toBe("personal");
  });

  it("computes invested capital, natural income, and average monthly growth", async () => {
    const growth = await getAccountGrowth(savingsId);
    expect(growth).not.toBeNull();
    if (!growth) return;

    expect(growth.investedCapital).toBe(1200);
    expect(growth.currentBalance).toBe(1150);
    expect(growth.naturalIncome).toBe(50);
    expect(growth.growth).toBe(50);
    expect(growth.growthPct).not.toBeNull();
    expect(growth.growthPct ?? 0).toBeCloseTo(4.17, 1);
    expect(growth.months).toBeCloseTo(2, 0);
    expect(growth.averageMonthlyGrowth).toBeCloseTo(25, 0);
    expect(growth.averageMonthlyGrowthPct).not.toBeNull();
  });

  it("reports credit-card used, available, and utilization", async () => {
    const rows = await listAccountBalances();
    const card = rows.find((row) => row.id === cardId);
    expect(card?.creditUsed).toBe("250.0000");
    expect(card?.creditAvailable).toBe("750.0000");
    expect(card?.creditUtilization).toBeCloseTo(25, 2);
    expect(card?.statementCloseDay).toBe(20);
  });
});
