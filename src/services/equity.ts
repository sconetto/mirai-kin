import { eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import {
  accounts,
  estateAssets,
  netWorthSnapshots,
  transactions,
} from "@/db/schema";
import type { AccountType } from "@/db/schema";
import { getBaseCurrency } from "./settings";
import { resolveRate } from "./fx";
import { listPositionsWithValue } from "./investments";

const LIABILITY_TYPES: AccountType[] = ["credit_card", "loan", "mortgage"];

export type EquityComponent = {
  kind: "asset" | "liability";
  type: string;
  label: string;
  value: number;
  currency: string;
};

export type Equity = {
  asOf: string;
  currency: string;
  assets: number;
  liabilities: number;
  net: number;
  components: EquityComponent[];
  byCurrency: { currency: string; assets: number; liabilities: number }[];
};

async function rateOrOne(from: string, to: string, date: Date): Promise<number> {
  if (from === to) return 1;
  try {
    const { rate } = await resolveRate(from, to, date);
    return Number(rate);
  } catch {
    return 1;
  }
}

export async function getEquity(asOf = new Date()): Promise<Equity> {
  const db = getDb();
  const baseCurrency = await getBaseCurrency();
  const components: EquityComponent[] = [];

  const accountRows = await db
    .select({
      id: accounts.id,
      name: accounts.name,
      type: accounts.type,
      currency: accounts.currency,
      openingBalance: accounts.openingBalance,
      txTotal: sql<string>`coalesce(sum(${transactions.amount}), 0)`,
    })
    .from(accounts)
    .leftJoin(transactions, eq(transactions.accountId, accounts.id))
    .where(eq(accounts.archived, false))
    .groupBy(accounts.id);

  for (const row of accountRows) {
    if (row.type === "investment") continue; // positions are added below
    const native = Number(row.openingBalance) + Number(row.txTotal);
    const rate = await rateOrOne(row.currency, baseCurrency, asOf);
    const value = native * rate;
    const liability = LIABILITY_TYPES.includes(row.type);
    components.push({
      kind: liability ? "liability" : "asset",
      type: row.type,
      label: row.name,
      value: liability ? Math.max(0, -value) : value,
      currency: row.currency,
    });
  }

  const positions = await listPositionsWithValue();
  for (const position of positions) {
    const rate = await rateOrOne(position.currency, baseCurrency, asOf);
    components.push({
      kind: "asset",
      type: "investment",
      label: `${position.symbol} — ${position.name}`,
      value: Number(position.value) * rate,
      currency: position.currency,
    });
  }

  const manualAssets = await db.select().from(estateAssets);
  for (const asset of manualAssets) {
    const rate = await rateOrOne(asset.currency, baseCurrency, asOf);
    components.push({
      kind: "asset",
      type: asset.type,
      label: asset.name,
      value: Number(asset.value) * rate,
      currency: asset.currency,
    });
  }

  const assets = components
    .filter((component) => component.kind === "asset")
    .reduce((sum, component) => sum + component.value, 0);
  const liabilities = components
    .filter((component) => component.kind === "liability")
    .reduce((sum, component) => sum + component.value, 0);

  const byCurrencyMap = new Map<string, { assets: number; liabilities: number }>();
  for (const component of components) {
    const entry = byCurrencyMap.get(component.currency) ?? { assets: 0, liabilities: 0 };
    if (component.kind === "asset") entry.assets += component.value;
    else entry.liabilities += component.value;
    byCurrencyMap.set(component.currency, entry);
  }

  return {
    asOf: asOf.toISOString().slice(0, 10),
    currency: baseCurrency,
    assets: Number(assets.toFixed(4)),
    liabilities: Number(liabilities.toFixed(4)),
    net: Number((assets - liabilities).toFixed(4)),
    components: components.map((component) => ({
      ...component,
      value: Number(component.value.toFixed(4)),
    })),
    byCurrency: [...byCurrencyMap.entries()].map(([currency, value]) => ({
      currency,
      assets: Number(value.assets.toFixed(4)),
      liabilities: Number(value.liabilities.toFixed(4)),
    })),
  };
}

export async function getNetWorthSeries(limit = 180) {
  const db = getDb();
  return db
    .select()
    .from(netWorthSnapshots)
    .orderBy(netWorthSnapshots.date)
    .limit(limit);
}

export async function recordSnapshot(asOf = new Date()) {
  const db = getDb();
  const equity = await getEquity(asOf);
  const day = equity.asOf;

  const [row] = await db
    .insert(netWorthSnapshots)
    .values({
      date: day,
      assets: equity.assets.toFixed(4),
      liabilities: equity.liabilities.toFixed(4),
      net: equity.net.toFixed(4),
      currency: equity.currency,
      breakdown: { components: equity.components, byCurrency: equity.byCurrency },
    })
    .onConflictDoUpdate({
      target: [netWorthSnapshots.date],
      set: {
        assets: equity.assets.toFixed(4),
        liabilities: equity.liabilities.toFixed(4),
        net: equity.net.toFixed(4),
        breakdown: { components: equity.components, byCurrency: equity.byCurrency },
      },
    })
    .returning();

  return row;
}
