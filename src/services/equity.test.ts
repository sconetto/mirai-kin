import "dotenv/config";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { closeDb, getDb } from "@/db";
import { estateAssets, investmentPositions } from "@/db/schema";
import { createAccount, deleteAccount } from "./accounts";
import { getAccountValues, getEquity, getNetWorth } from "./equity";

describe.skipIf(!process.env.DATABASE_URL)("canonical net worth", () => {
  let investmentId = "";
  let cashId = "";
  let manualAssetId = "";
  let investmentName = "";
  let manualAssetName = "";

  beforeAll(async () => {
    investmentName = `TEST net worth investment ${randomUUID()}`;
    const investment = await createAccount({
      name: investmentName,
      type: "investment",
      currency: "BRL",
      openingBalance: "1000",
    });
    investmentId = investment.id;
    const cash = await createAccount({
      name: `TEST net worth cash ${randomUUID()}`,
      type: "checking",
      currency: "BRL",
      openingBalance: "500",
    });
    cashId = cash.id;
    manualAssetName = `TEST net worth asset ${randomUUID()}`;
    const [asset] = await getDb()
      .insert(estateAssets)
      .values({
        name: manualAssetName,
        type: "other",
        value: "200",
        currency: "BRL",
      })
      .returning();
    manualAssetId = asset.id;
  });

  afterAll(async () => {
    await getDb().delete(estateAssets).where(eq(estateAssets.id, manualAssetId));
    await deleteAccount(investmentId);
    await deleteAccount(cashId);
    await closeDb();
  });

  it("uses the account balance when an investment account has no positions", async () => {
    const values = await getAccountValues();
    const investment = values.find((account) => account.id === investmentId);
    expect(investment?.valueBase).toBe(1000);

    const equity = await getEquity();
    const investmentComponent = equity.components.find(
      (component) => component.label === investmentName,
    );
    expect(investmentComponent?.value).toBe(1000);
    expect(investmentComponent?.nativeValue).toBe(1000);
    const manualAsset = equity.components.find((component) => component.label === manualAssetName);
    expect(manualAsset?.value).toBe(200);
    expect(manualAsset?.nativeValue).toBe(200);
  });

  it("uses positions instead of the investment account balance", async () => {
    const [position] = await getDb()
      .insert(investmentPositions)
      .values({
        accountId: investmentId,
        symbol: "TEST",
        name: "TEST position",
        instrumentType: "stock",
        quantity: "10",
        avgCost: "120",
        currency: "BRL",
      })
      .returning();
    expect(position).toBeTruthy();

    const values = await getAccountValues();
    expect(values.find((account) => account.id === investmentId)?.valueBase).toBe(1200);

    const equity = await getEquity();
    const positionComponent = equity.components.find(
      (component) => component.label === "TEST — TEST position",
    );
    expect(positionComponent?.value).toBe(1200);
    expect(positionComponent?.nativeValue).toBe(1200);
    expect(
      equity.components.find((component) => component.label === investmentName),
    ).toBeUndefined();
  });

  it("keeps the canonical total internally consistent", async () => {
    const netWorth = await getNetWorth();
    expect(netWorth.net).toBeCloseTo(netWorth.assets - netWorth.liabilities, 4);
  });
});
