import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { investmentPositions, investmentPrices } from "@/db/schema";
import type { InvestmentPositionCreateInput } from "@/lib/schemas";

export async function createPosition(input: InvestmentPositionCreateInput) {
  const db = getDb();
  const [row] = await db
    .insert(investmentPositions)
    .values({
      accountId: input.accountId,
      symbol: input.symbol.toUpperCase(),
      name: input.name,
      instrumentType: input.instrumentType,
      quantity: String(input.quantity),
      avgCost: String(input.avgCost),
      currency: input.currency.toUpperCase(),
    })
    .returning();
  return row;
}

export async function listPositions() {
  const db = getDb();
  return db.select().from(investmentPositions).orderBy(investmentPositions.symbol);
}

export async function listPositionsWithValue() {
  const db = getDb();
  const positions = await db
    .select()
    .from(investmentPositions)
    .where(eq(investmentPositions.closed, false))
    .orderBy(investmentPositions.symbol);

  const result = [];
  for (const position of positions) {
    const [latest] = await db
      .select()
      .from(investmentPrices)
      .where(eq(investmentPrices.positionId, position.id))
      .orderBy(desc(investmentPrices.date))
      .limit(1);

    const quantity = Number(position.quantity);
    const avgCost = Number(position.avgCost);
    const price = latest ? Number(latest.price) : avgCost;
    const value = quantity * price;
    const cost = quantity * avgCost;
    const gain = value - cost;

    result.push({
      ...position,
      latestPrice: price.toFixed(4),
      latestPriceDate: latest?.date ?? null,
      value: value.toFixed(4),
      cost: cost.toFixed(4),
      gain: gain.toFixed(4),
      gainPct: cost === 0 ? "0.00" : ((gain / cost) * 100).toFixed(2),
    });
  }

  return result;
}

export async function getPosition(id: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(investmentPositions)
    .where(eq(investmentPositions.id, id))
    .limit(1);
  return row ?? null;
}

export async function updatePosition(id: string, input: Partial<InvestmentPositionCreateInput>) {
  const db = getDb();
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (input.accountId !== undefined) patch.accountId = input.accountId;
  if (input.symbol !== undefined) patch.symbol = input.symbol.toUpperCase();
  if (input.name !== undefined) patch.name = input.name;
  if (input.instrumentType !== undefined) patch.instrumentType = input.instrumentType;
  if (input.quantity !== undefined) patch.quantity = String(input.quantity);
  if (input.avgCost !== undefined) patch.avgCost = String(input.avgCost);
  if (input.currency !== undefined) patch.currency = input.currency.toUpperCase();

  const [row] = await db
    .update(investmentPositions)
    .set(patch)
    .where(eq(investmentPositions.id, id))
    .returning();
  return row ?? null;
}

export async function deletePosition(id: string) {
  const db = getDb();
  const [row] = await db
    .delete(investmentPositions)
    .where(eq(investmentPositions.id, id))
    .returning();
  return row ?? null;
}

export async function addPrice(
  positionId: string,
  input: { date: string; price: string | number; currency?: string },
) {
  const position = await getPosition(positionId);
  if (!position) return null;

  const db = getDb();
  const [row] = await db
    .insert(investmentPrices)
    .values({
      positionId,
      date: input.date.slice(0, 10),
      price: String(input.price),
      currency: (input.currency ?? position.currency).toUpperCase(),
    })
    .onConflictDoUpdate({
      target: [investmentPrices.positionId, investmentPrices.date],
      set: { price: String(input.price) },
    })
    .returning();

  return row;
}
