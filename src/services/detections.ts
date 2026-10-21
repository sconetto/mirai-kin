import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { accounts, recurringDetections, recurringTransactions } from "@/db/schema";
import type { RecurrenceFrequency } from "@/db/schema";
import { detectRecurring } from "./recurring";

export async function syncRecurringDetections() {
  const db = getDb();
  const candidates = await detectRecurring();
  let inserted = 0;
  let updated = 0;

  for (const candidate of candidates) {
    const accountId = candidate.accountId
      ? ((await db
          .select({ id: accounts.id })
          .from(accounts)
          .where(eq(accounts.id, candidate.accountId))
          .limit(1))[0]?.id ?? null)
      : null;

    const [existing] = await db
      .select()
      .from(recurringDetections)
      .where(eq(recurringDetections.key, candidate.key))
      .limit(1);

    if (!existing) {
      await db.insert(recurringDetections).values({
        key: candidate.key,
        label: candidate.label,
        accountId,
        cadence: candidate.cadence,
        averageAmount: candidate.averageAmount.toFixed(4),
        currency: candidate.currency,
        lastDate: candidate.lastDate,
        nextExpected: candidate.nextExpected,
        confidence: candidate.confidence.toFixed(6),
        status: "detected",
      });
      inserted += 1;
    } else if (existing.status === "detected") {
      await db
        .update(recurringDetections)
        .set({
          label: candidate.label,
          accountId,
          cadence: candidate.cadence,
          averageAmount: candidate.averageAmount.toFixed(4),
          currency: candidate.currency,
          lastDate: candidate.lastDate,
          nextExpected: candidate.nextExpected,
          confidence: candidate.confidence.toFixed(6),
          updatedAt: new Date(),
        })
        .where(eq(recurringDetections.id, existing.id));
      updated += 1;
    }
  }

  return { inserted, updated, total: candidates.length };
}

export async function listRecurringDetections() {
  const db = getDb();
  return db
    .select()
    .from(recurringDetections)
    .orderBy(desc(recurringDetections.nextExpected));
}

export async function confirmDetection(id: string) {
  const db = getDb();
  const [detection] = await db
    .select()
    .from(recurringDetections)
    .where(eq(recurringDetections.id, id))
    .limit(1);
  if (!detection || detection.status !== "detected" || !detection.accountId) return null;

  const [recurring] = await db
    .insert(recurringTransactions)
    .values({
      accountId: detection.accountId,
      amount: (-Math.abs(Number(detection.averageAmount))).toFixed(4),
      currency: detection.currency,
      frequency: detection.cadence as RecurrenceFrequency,
      startDate: detection.nextExpected,
      note: detection.label,
      detectionId: detection.id,
      source: "detected",
    })
    .returning();

  await db
    .update(recurringDetections)
    .set({
      status: "confirmed",
      recurringTransactionId: recurring.id,
      updatedAt: new Date(),
    })
    .where(eq(recurringDetections.id, id));

  return recurring;
}

export async function ignoreDetection(id: string) {
  const db = getDb();
  const [row] = await db
    .update(recurringDetections)
    .set({ status: "ignored", updatedAt: new Date() })
    .where(eq(recurringDetections.id, id))
    .returning();
  return row ?? null;
}

export async function updateDetection(
  id: string,
  patch: { nextExpected?: string; averageAmount?: number; cadence?: RecurrenceFrequency },
) {
  const db = getDb();
  const [detection] = await db
    .select()
    .from(recurringDetections)
    .where(eq(recurringDetections.id, id))
    .limit(1);
  if (!detection) return null;

  const [row] = await db
    .update(recurringDetections)
    .set({
      ...(patch.nextExpected !== undefined ? { nextExpected: patch.nextExpected } : {}),
      ...(patch.averageAmount !== undefined
        ? { averageAmount: patch.averageAmount.toFixed(4) }
        : {}),
      ...(patch.cadence !== undefined ? { cadence: patch.cadence } : {}),
      updatedAt: new Date(),
    })
    .where(eq(recurringDetections.id, id))
    .returning();

  if (detection.recurringTransactionId) {
    await db
      .update(recurringTransactions)
      .set({
        ...(patch.nextExpected !== undefined ? { startDate: patch.nextExpected } : {}),
        ...(patch.averageAmount !== undefined
          ? { amount: (-Math.abs(patch.averageAmount)).toFixed(4) }
          : {}),
        ...(patch.cadence !== undefined ? { frequency: patch.cadence } : {}),
      })
      .where(eq(recurringTransactions.id, detection.recurringTransactionId));
  }

  return row ?? null;
}
