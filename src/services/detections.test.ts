import "dotenv/config";
import { and, eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { closeDb, getDb } from "@/db";
import { accounts, recurringDetections, recurringTransactions, transactions } from "@/db/schema";
import { createAccount } from "./accounts";
import {
  confirmDetection,
  ignoreDetection,
  listRecurringDetections,
  syncRecurringDetections,
  updateDetection,
} from "./detections";

const DAY = 86_400_000;

describe.skipIf(!process.env.DATABASE_URL)("recurring detections", () => {
  let accountId = "";
  let confirmedId = "";
  let ignoredId = "";
  const labels = [`TEST gym ${Date.now()}`, `TEST streaming ${Date.now()}`];

  beforeAll(async () => {
    const db = getDb();
    const account = await createAccount({
      name: "TEST recurring account",
      type: "checking",
      currency: "BRL",
      openingBalance: "0",
    });
    accountId = account.id;

    const now = Date.now();
    const rows = labels.flatMap((label) =>
      [60, 30, 0].map((offset, index) => ({
        accountId,
        amount: "-10",
        currency: "BRL",
        baseCurrency: "BRL",
        baseAmount: "-10",
        recordDate: new Date(now - offset * DAY + index * 1000),
        note: label,
        counterparty: label,
        reviewStatus: "reviewed" as const,
      })),
    );
    await db.insert(transactions).values(rows);
    await syncRecurringDetections();

    const detections = await db
      .select()
      .from(recurringDetections)
      .where(inArray(recurringDetections.key, labels.map((label) => label.toLowerCase())));
    confirmedId = detections[0]?.id ?? "";
    ignoredId = detections[1]?.id ?? "";
  });

  afterAll(async () => {
    const db = getDb();
    await db
      .delete(recurringTransactions)
      .where(
        inArray(
          recurringTransactions.detectionId,
          [confirmedId, ignoredId].filter(Boolean),
        ),
      );
    await db
      .delete(recurringDetections)
      .where(inArray(recurringDetections.key, labels.map((label) => label.toLowerCase())));
    await db.delete(accounts).where(eq(accounts.id, accountId));
    await closeDb();
  });

  it("syncs detected candidates with a status", async () => {
    const detections = await listRecurringDetections();
    const ours = detections.filter((row) => labels.map((label) => label.toLowerCase()).includes(row.key));
    expect(ours).toHaveLength(2);
    expect(ours.every((row) => row.status === "detected")).toBe(true);
  });

  it("confirms a detection and links a recurring transaction", async () => {
    const recurring = await confirmDetection(confirmedId);
    expect(recurring?.detectionId).toBe(confirmedId);
    expect(Number(recurring?.amount)).toBeLessThan(0);

    const db = getDb();
    const [detection] = await db
      .select()
      .from(recurringDetections)
      .where(eq(recurringDetections.id, confirmedId));
    expect(detection.status).toBe("confirmed");
  });

  it("edits a confirmed bill and updates the linked recurring row", async () => {
    await updateDetection(confirmedId, {
      nextExpected: "2026-12-15",
      averageAmount: 123,
      cadence: "monthly",
    });
    const db = getDb();
    const [detection] = await db
      .select()
      .from(recurringDetections)
      .where(eq(recurringDetections.id, confirmedId));
    expect(detection.nextExpected).toBe("2026-12-15");
    expect(Number(detection.averageAmount)).toBe(123);

    const [recurring] = await db
      .select()
      .from(recurringTransactions)
      .where(eq(recurringTransactions.detectionId, confirmedId));
    expect(recurring.startDate).toBe("2026-12-15");
    expect(Number(recurring.amount)).toBe(-123);
  });

  it("ignores a detection and hides it from suggestions", async () => {
    const ignored = await ignoreDetection(ignoredId);
    expect(ignored?.status).toBe("ignored");

    const db = getDb();
    const pending = await db
      .select()
      .from(recurringDetections)
      .where(
        and(eq(recurringDetections.id, ignoredId), eq(recurringDetections.status, "detected")),
      );
    expect(pending).toHaveLength(0);
  });
});
