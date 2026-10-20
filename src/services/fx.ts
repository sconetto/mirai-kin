import { and, desc, eq, lte, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { accounts, fxRates } from "@/db/schema";
import { getEnv } from "@/lib/env";

export class MissingRateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MissingRateError";
  }
}

export function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Resolve the rate to convert `from` -> `to` on (or before) `date`.
 * Rates are stored as "how many `quote` per 1 `base`", so we look up
 * base=from, quote=to.
 */
export async function resolveRate(
  from: string,
  to: string,
  date: Date,
): Promise<{ rate: string; fxRateId: string | null }> {
  if (from === to) {
    return { rate: "1", fxRateId: null };
  }

  const db = getDb();
  const day = toDateOnly(date);

  const exact = await db
    .select()
    .from(fxRates)
    .where(and(eq(fxRates.base, from), eq(fxRates.quote, to), eq(fxRates.date, day)))
    .limit(1);

  if (exact[0]) {
    return { rate: exact[0].rate, fxRateId: exact[0].id };
  }

  const prior = await db
    .select()
    .from(fxRates)
    .where(and(eq(fxRates.base, from), eq(fxRates.quote, to), lte(fxRates.date, day)))
    .orderBy(desc(fxRates.date))
    .limit(1);

  if (prior[0]) {
    return { rate: prior[0].rate, fxRateId: prior[0].id };
  }

  throw new MissingRateError(
    `No ${from}/${to} exchange rate available on or before ${day}. ` +
      `Run the FX job or record the rate manually.`,
  );
}

export async function toBaseAmount(
  amount: string,
  currency: string,
  baseCurrency: string,
  date: Date,
): Promise<{ baseAmount: string; fxRateId: string | null; rate: string }> {
  const { rate, fxRateId } = await resolveRate(currency, baseCurrency, date);
  const baseAmount = (Number(amount) * Number(rate)).toFixed(4);
  return { baseAmount, fxRateId, rate };
}

type FrankfurterResponse = {
  amount: number;
  base: string;
  date: string;
  rates: Record<string, number>;
};

/**
 * Fetch rates from the configured provider for every currency currently held
 * by an account (plus the base currency) and upsert them. Returns row count.
 */
export async function fetchAndStoreRates(date?: string): Promise<number> {
  const env = getEnv();
  const base = env.BASE_CURRENCY;
  const db = getDb();

  const held = await db.selectDistinct({ currency: accounts.currency }).from(accounts);
  const quotes = held
    .map((row) => row.currency)
    .filter((currency) => currency && currency !== base);

  if (quotes.length === 0) {
    return 0;
  }

  const day = date ?? toDateOnly(new Date());
  const url = `${env.FX_SOURCE_URL.replace(/\/$/, "")}/${day}?from=${base}&to=${quotes.join(",")}`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`FX fetch failed (${response.status}) for ${url}`);
  }

  const payload = (await response.json()) as FrankfurterResponse;
  const rows: {
    base: string;
    quote: string;
    rate: string;
    date: string;
    source: string;
  }[] = [];

  for (const [quote, value] of Object.entries(payload.rates)) {
    if (!Number.isFinite(value) || value <= 0) continue;
    rows.push({
      base,
      quote,
      rate: value.toString(),
      date: payload.date,
      source: "frankfurter",
    });
    rows.push({
      base: quote,
      quote: base,
      rate: (1 / value).toFixed(10),
      date: payload.date,
      source: "frankfurter",
    });
  }

  if (rows.length === 0) {
    return 0;
  }

  await db
    .insert(fxRates)
    .values(rows)
    .onConflictDoUpdate({
      target: [fxRates.base, fxRates.quote, fxRates.date],
      set: { rate: sql`excluded.rate` },
    });

  return rows.length;
}

/**
 * Backfill any missing business days between `from` and `to` (inclusive).
 * ECB does not publish on weekends/holidays, so gaps are expected; callers
 * should treat per-day failures as non-fatal.
 */
export async function backfillRates(from: Date, to: Date): Promise<number> {
  let stored = 0;
  const cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()));

  while (cursor <= end) {
    try {
      stored += await fetchAndStoreRates(toDateOnly(cursor));
    } catch (error) {
      console.warn(`[fx] backfill skipped ${toDateOnly(cursor)}:`, (error as Error).message);
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return stored;
}
