import "dotenv/config";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { closeDb, getDb } from "@/db";
import { fxRates } from "@/db/schema";
import { MissingRateError, resolveRate } from "./fx";

const BASE = "ZZZ";
const QUOTE = "YYY";

describe.skipIf(!process.env.DATABASE_URL)("resolveRate (database)", () => {
  beforeAll(async () => {
    const db = getDb();
    await db.delete(fxRates).where(eq(fxRates.base, BASE));
    await db.insert(fxRates).values([
      { base: BASE, quote: QUOTE, rate: "2.0", date: "2026-01-10" },
      { base: BASE, quote: QUOTE, rate: "2.5", date: "2026-01-20" },
    ]);
  });

  afterAll(async () => {
    const db = getDb();
    await db.delete(fxRates).where(eq(fxRates.base, BASE));
    await closeDb();
  });

  it("uses the exact-date rate when available", async () => {
    const result = await resolveRate(BASE, QUOTE, new Date("2026-01-20T12:00:00.000Z"));
    expect(Number(result.rate)).toBe(2.5);
    expect(result.fxRateId).toBeTruthy();
  });

  it("falls back to the nearest prior rate", async () => {
    const result = await resolveRate(BASE, QUOTE, new Date("2026-01-15T12:00:00.000Z"));
    expect(Number(result.rate)).toBe(2);
  });

  it("returns rate 1 for identical currencies", async () => {
    const result = await resolveRate(BASE, BASE, new Date("2026-01-15T00:00:00.000Z"));
    expect(result.rate).toBe("1");
    expect(result.fxRateId).toBeNull();
  });

  it("throws when no prior rate exists", async () => {
    await expect(
      resolveRate(BASE, QUOTE, new Date("2025-12-01T00:00:00.000Z")),
    ).rejects.toBeInstanceOf(MissingRateError);
  });
});
