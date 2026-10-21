import "dotenv/config";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { closeDb, getDb } from "@/db";
import { accounts, transactions } from "@/db/schema";
import { createAccount } from "./accounts";
import {
  applyImportBalance,
  computeBalance,
  getCreditCardCycle,
  getDataQuality,
  reconcileAccount,
  listReconciliations,
} from "./reconciliation";

const DATE = "2026-10-21";

describe.skipIf(!process.env.DATABASE_URL)("reconciliation", () => {
  let accountId = "";
  let cardId = "";

  beforeAll(async () => {
    const account = await createAccount({
      name: "TEST reconciliation account",
      type: "checking",
      currency: "BRL",
      openingBalance: "100",
    });
    accountId = account.id;

    const db = getDb();
    await db.insert(transactions).values([
      {
        accountId,
        amount: "50",
        currency: "BRL",
        baseCurrency: "BRL",
        baseAmount: "50",
        recordDate: new Date(`${DATE}T12:00:00.000Z`),
        note: "TEST reconciliation",
        reviewStatus: "reviewed",
      },
      {
        accountId,
        amount: "-20",
        currency: "BRL",
        baseCurrency: "BRL",
        baseAmount: "-20",
        recordDate: new Date(`${DATE}T13:00:00.000Z`),
        note: "TEST reconciliation",
        reviewStatus: "reviewed",
      },
    ]);

    const card = await createAccount({
      name: "TEST reconciliation card",
      type: "credit_card",
      currency: "BRL",
      openingBalance: "0",
      statementCloseDay: 20,
      dueDay: 10,
    });
    cardId = card.id;
  });

  afterAll(async () => {
    const db = getDb();
    await db.delete(accounts).where(eq(accounts.id, accountId));
    await db.delete(accounts).where(eq(accounts.id, cardId));
    await closeDb();
  });

  it("computes the account balance up to a date", async () => {
    const result = await computeBalance(accountId, DATE);
    expect(result?.computedBalance).toBe("130.0000");
  });

  it("stores reconciled and discrepancy outcomes", async () => {
    const reconciled = await reconcileAccount({
      accountId,
      date: DATE,
      statementBalance: "130",
    });
    expect(reconciled?.status).toBe("reconciled");
    expect(reconciled?.difference).toBe("0.0000");

    const discrepancy = await reconcileAccount({
      accountId,
      date: DATE,
      statementBalance: "120",
    });
    expect(discrepancy?.status).toBe("discrepancy");
    expect(discrepancy?.difference).toBe("-10.0000");

    const history = await listReconciliations(accountId);
    expect(history).toHaveLength(2);
  });

  it("derives an opening balance from a current balance", async () => {
    const updated = await applyImportBalance({
      accountId,
      currentBalance: "200",
      importedTotal: 70,
    });
    expect(updated?.openingBalance).toBe("130.0000");
    expect(updated?.openingBalanceCaptured).toBe(true);
  });

  it("builds a credit-card cycle from the configured close day", async () => {
    const before = await getCreditCardCycle(cardId);
    expect(before).not.toBeNull();
    if (!before) return;

    const db = getDb();
    await db.insert(transactions).values({
      accountId: cardId,
      amount: "-42",
      currency: "BRL",
      baseCurrency: "BRL",
      baseAmount: "-42",
      recordDate: new Date(`${before.cycleStart}T12:00:00.000Z`),
      note: "TEST reconciliation card",
      reviewStatus: "reviewed",
    });

    const cycle = await getCreditCardCycle(cardId);
    expect(cycle?.total).toBe("42.0000");
    expect(cycle?.dueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("reports the data-quality issue types", async () => {
    const data = await getDataQuality();
    expect(Object.keys(data.counts)).toEqual(
      expect.arrayContaining([
        "uncategorized",
        "duplicates",
        "unpairedTransfers",
        "missingFx",
        "stalePrices",
        "accountsWithoutOpeningBalance",
        "importRowsWithErrors",
      ]),
    );
    expect(Object.values(data.counts).every((value) => Number.isInteger(value))).toBe(true);
  });
});
