import "dotenv/config";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { closeDb, getDb } from "@/db";
import { accounts, transactions } from "@/db/schema";
import { getReport, reportToCsv } from "./reports";
import type { Report } from "./reports";

const report: Report = {
  type: "cashflow",
  from: "2026-01-01",
  to: "2026-01-31",
  currency: "BRL",
  summary: { income: 100, expenses: 40, transfers: 0, net: 60, average: 60 },
  rows: [
    { key: "2026-01", label: "2026-01", income: 100, expenses: 40, transfers: 0, net: 60 },
  ],
};

describe("reportToCsv", () => {
  it("includes a summary row and the period rows", () => {
    const csv = reportToCsv(report);
    expect(csv).toContain("summary");
    expect(csv).toContain("2026-01");
    expect(csv.split("\n")).toHaveLength(3);
  });

  it("quotes values safely", () => {
    const csv = reportToCsv({
      ...report,
      rows: [{ ...report.rows[0], key: "has,comma", label: "has,comma" }],
    });
    expect(csv).toContain('"has,comma"');
  });
});

describe.skipIf(!process.env.DATABASE_URL)("getReport (database)", () => {
  let accountId = "";

  beforeAll(async () => {
    const db = getDb();
    const [account] = await db
      .insert(accounts)
      .values({
        name: "TEST report account",
        type: "checking",
        currency: "BRL",
        openingBalance: "0",
      })
      .returning();
    accountId = account.id;

    const now = new Date();
    await db.insert(transactions).values([
      {
        accountId,
        amount: "1000",
        currency: "BRL",
        baseCurrency: "BRL",
        baseAmount: "1000",
        recordDate: now,
        note: "TEST report",
        reviewStatus: "reviewed",
      },
      {
        accountId,
        amount: "-250",
        currency: "BRL",
        baseCurrency: "BRL",
        baseAmount: "-250",
        recordDate: now,
        note: "TEST report",
        reviewStatus: "reviewed",
      },
    ]);
  });

  afterAll(async () => {
    const db = getDb();
    await db.delete(transactions).where(eq(transactions.accountId, accountId));
    await db.delete(accounts).where(eq(accounts.id, accountId));
    await closeDb();
  });

  it("aggregates income, expenses, and net for an isolated account", async () => {
    const today = new Date().toISOString().slice(0, 10);
    const result = await getReport({
      type: "cashflow",
      from: today,
      to: today,
      accountIds: [accountId],
    });

    expect(result.summary.income).toBe(1000);
    expect(result.summary.expenses).toBe(250);
    expect(result.summary.net).toBe(750);
  });
});
