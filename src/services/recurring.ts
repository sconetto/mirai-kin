import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { transactions } from "@/db/schema";

export type RecurringCadence = "weekly" | "monthly" | "yearly";

export type RecurringCandidate = {
  key: string;
  label: string;
  averageAmount: number;
  cadence: RecurringCadence;
  lastDate: string;
  nextExpected: string;
  occurrences: number;
  confidence: number;
};

const DAY = 86_400_000;

type TxnRow = {
  recordDate: Date;
  amount: string;
  currency: string;
  counterparty: string | null;
  note: string | null;
};

/**
 * Detect recurring patterns from reviewed transactions. This is intentionally
 * heuristic: group by counterparty/note, then look for consistent intervals.
 */
export async function detectRecurring(): Promise<RecurringCandidate[]> {
  const db = getDb();
  const rows = (await db
    .select({
      recordDate: transactions.recordDate,
      amount: transactions.amount,
      currency: transactions.currency,
      counterparty: transactions.counterparty,
      note: transactions.note,
    })
    .from(transactions)
    .where(sql`${transactions.reviewStatus} <> 'split'`)
    .orderBy(transactions.recordDate)) as TxnRow[];

  const groups = new Map<string, { labels: Map<string, number>; rows: TxnRow[] }>();

  for (const row of rows) {
    const raw = (row.counterparty ?? row.note ?? "").trim();
    if (!raw) continue;
    const key = raw.toLowerCase().replace(/\s+/g, " ");
    const group = groups.get(key) ?? { labels: new Map<string, number>(), rows: [] };
    group.labels.set(raw, (group.labels.get(raw) ?? 0) + 1);
    group.rows.push(row);
    groups.set(key, group);
  }

  const candidates: RecurringCandidate[] = [];

  for (const [key, group] of groups) {
    if (group.rows.length < 3) continue;

    const times = group.rows.map((row) => row.recordDate.getTime()).sort((a, b) => a - b);
    const intervals = times
      .slice(1)
      .map((time, index) => (time - times[index]) / DAY)
      .filter((value) => value > 0);
    if (intervals.length < 2) continue;

    const sorted = [...intervals].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const cadence: RecurringCadence | null =
      median >= 5 && median <= 9
        ? "weekly"
        : median >= 25 && median <= 35
          ? "monthly"
          : median >= 350 && median <= 380
            ? "yearly"
            : null;
    if (!cadence) continue;

    const consistent =
      intervals.filter((value) => Math.abs(value - median) <= median * 0.25).length /
      intervals.length;
    if (consistent < 0.6) continue;

    const lastDate = new Date(times[times.length - 1]);
    const next = new Date(lastDate.getTime() + median * DAY);
    const label = [...group.labels.entries()].sort((a, b) => b[1] - a[1])[0][0];
    const averageAmount =
      group.rows.reduce((sum, row) => sum + Math.abs(Number(row.amount)), 0) / group.rows.length;

    candidates.push({
      key,
      label,
      averageAmount: Number(averageAmount.toFixed(4)),
      cadence,
      lastDate: lastDate.toISOString().slice(0, 10),
      nextExpected: next.toISOString().slice(0, 10),
      occurrences: group.rows.length,
      confidence: Number(consistent.toFixed(2)),
    });
  }

  return candidates.sort((a, b) => a.nextExpected.localeCompare(b.nextExpected));
}

export async function getUpcomingBills(withinDays = 30) {
  const now = new Date();
  const horizon = new Date(now.getTime() + withinDays * DAY).toISOString().slice(0, 10);
  const today = now.toISOString().slice(0, 10);
  return (await detectRecurring()).filter(
    (candidate) => candidate.nextExpected >= today && candidate.nextExpected <= horizon,
  );
}
