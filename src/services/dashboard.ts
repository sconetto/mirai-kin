import { and, eq, gte, lte, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { debts, debtSchedule, transactions, transfers } from "@/db/schema";
import { resolveRate } from "./fx";
import {
  DEFAULT_DASHBOARD_RANGE,
  historyMonths,
  paceMonths,
  projectionMonths,
  shiftMonths,
  type DashboardRange,
} from "@/lib/dashboard-range";
import type { AssetClass } from "@/lib/asset-classes";
import { getEquity, getNetWorthSeries } from "./equity";
import { getPlanStatus, type PlanGoal } from "./planner";
import { planTrajectory, type PlanAssumptionOverrides } from "./projections";
import { getDefaultScenario } from "./scenarios";

export type DashboardStatus = "on_track" | "at_risk" | "off_track" | "insufficient_data" | "no_plan";

export type DashboardPoint = {
  date: string;
  actual: number | null;
  conservative: number | null;
  base: number | null;
  optimistic: number | null;
};

export type DashboardMovement = {
  from: string;
  to: string;
  opening: number;
  closing: number;
  change: number;
  income: number;
  expenses: number;
  market: number;
  fx: number;
  fxSeparated: boolean;
  debtService: number;
};

export type DashboardPace = {
  months: number;
  source: "tracked" | "net_savings";
  requiredMonthly: number;
  actualTotal: number;
  requiredTotal: number;
  shortfall: number;
  surplus: number;
  points: { month: string; actual: number; required: number }[];
};

export type DashboardComposition = {
  key: "cash" | "investments" | "realEstate" | "vehicles" | "otherAssets" | "liabilities";
  value: number;
};

export type DashboardModel = {
  asOf: string;
  baseCurrency: string;
  range: DashboardRange;
  activeScenario: { id: string; name: string; isDefault: boolean } | null;
  plan: Awaited<ReturnType<typeof getPlanStatus>>;
  overallStatus: DashboardStatus;
  nextGoal: PlanGoal | null;
  points: DashboardPoint[];
  history: { date: string; value: number }[];
  netWorthChange: { amount: number; pct: number | null; from: string } | null;
  movement: DashboardMovement | null;
  pace: DashboardPace | null;
  composition: DashboardComposition[];
  currentMonth: { income: number; expenses: number };
  assumptions: {
    expectedReturn: number;
    inflation: number;
    monthlyContribution: number;
    returnBand: number;
    horizonMonths: number;
    assetClassRates: Record<AssetClass, number>;
  };
};

function monthStart(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function monthKey(date: Date): string {
  return date.toISOString().slice(0, 7);
}

function addMonthsToMonth(value: string, months: number): string {
  const [year, month] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + months, 1));
  return monthKey(date);
}

async function flowBetween(start: Date, end: Date) {
  const db = getDb();
  const [row] = await db
    .select({
      income: sql<string>`coalesce(sum(case when ${transactions.amount} > 0 then ${transactions.baseAmount} else 0 end), 0)`,
      expenses: sql<string>`coalesce(sum(case when ${transactions.amount} < 0 then -${transactions.baseAmount} else 0 end), 0)`,
    })
    .from(transactions)
    .where(
      and(
        gte(transactions.recordDate, start),
        lte(transactions.recordDate, end),
        sql`${transactions.reviewStatus} <> 'split'`,
        sql`${transactions.transferId} is null`,
        sql`(${transactions.paymentType} is null or ${transactions.paymentType} <> 'transfer')`,
      ),
    );
  return { income: Number(row?.income ?? 0), expenses: Number(row?.expenses ?? 0) };
}

async function monthlyFlow(start: Date, end: Date) {
  const db = getDb();
  const rows = await db
    .select({
      month: sql<string>`to_char(${transactions.recordDate} at time zone 'UTC', 'YYYY-MM')`,
      income: sql<string>`coalesce(sum(case when ${transactions.amount} > 0 then ${transactions.baseAmount} else 0 end), 0)`,
      expenses: sql<string>`coalesce(sum(case when ${transactions.amount} < 0 then -${transactions.baseAmount} else 0 end), 0)`,
    })
    .from(transactions)
    .where(
      and(
        gte(transactions.recordDate, start),
        lte(transactions.recordDate, end),
        sql`${transactions.reviewStatus} <> 'split'`,
        sql`${transactions.transferId} is null`,
        sql`(${transactions.paymentType} is null or ${transactions.paymentType} <> 'transfer')`,
      ),
    )
    .groupBy(sql`to_char(${transactions.recordDate} at time zone 'UTC', 'YYYY-MM')`)
    .orderBy(sql`to_char(${transactions.recordDate} at time zone 'UTC', 'YYYY-MM')`);

  return new Map(
    rows.map((row) => [row.month, Number(row.income) - Number(row.expenses)] as const),
  );
}

async function rateOrOne(from: string, to: string, date: Date): Promise<number> {
  if (from === to) return 1;
  try {
    const { rate } = await resolveRate(from, to, date);
    return Number(rate);
  } catch {
    return 1;
  }
}

type SnapshotComponent = {
  kind?: string;
  currency?: string;
  value?: number;
  nativeValue?: number;
};

async function fxEffect(
  first: { date: string; breakdown: unknown },
  last: { date: string },
  baseCurrency: string,
): Promise<{ fx: number; separated: boolean }> {
  const breakdown = (first.breakdown ?? {}) as { components?: SnapshotComponent[] };
  const components = breakdown.components ?? [];
  if (components.length === 0) return { fx: 0, separated: true };

  let fx = 0;
  let separated = true;
  for (const component of components) {
    const currency = component.currency;
    if (!currency || currency === baseCurrency) continue;
    const native = Number(component.nativeValue);
    const opening = Number(component.value);
    if (!Number.isFinite(native) || !Number.isFinite(opening)) {
      separated = false;
      continue;
    }
    const signedOpening = component.kind === "liability" ? -opening : opening;
    const closingRate = await rateOrOne(currency, baseCurrency, new Date(`${last.date}T23:59:59.000Z`));
    const signedClosing = native * closingRate;
    fx += signedClosing - signedOpening;
  }

  return { fx: Number(fx.toFixed(4)), separated };
}

async function debtServiceBetween(start: Date, end: Date, baseCurrency: string): Promise<number> {
  const db = getDb();
  const startDay = start.toISOString().slice(0, 10);
  const endDay = end.toISOString().slice(0, 10);
  const rows = await db
    .select({
      payment: debtSchedule.payment,
      currency: debts.currency,
      dueDate: debtSchedule.dueDate,
    })
    .from(debtSchedule)
    .innerJoin(debts, eq(debtSchedule.debtId, debts.id))
    .where(and(gte(debtSchedule.dueDate, startDay), lte(debtSchedule.dueDate, endDay)));

  let total = 0;
  for (const row of rows) {
    total += Number(row.payment) * (await rateOrOne(row.currency, baseCurrency, new Date(`${row.dueDate}T12:00:00.000Z`)));
  }
  return Number(total.toFixed(4));
}

function allocationSets(goals: PlanGoal[]) {
  return goals.map((goal) => ({
    goal,
    accounts: new Set(goal.allocations.map((allocation) => allocation.accountId)),
    shares: new Map(goal.allocations.map((allocation) => [allocation.accountId, allocation.sharePct])),
  }));
}

async function trackedMonthlyFlow(
  goals: PlanGoal[],
  start: Date,
  end: Date,
  baseCurrency: string,
): Promise<Map<string, number>> {
  const db = getDb();
  const rows = await db
    .select()
    .from(transfers)
    .where(and(gte(transfers.date, start), lte(transfers.date, end)));
  const totals = new Map<string, number>();
  const entries = allocationSets(goals);

  for (const transfer of rows) {
    for (const entry of entries) {
      if (!entry.accounts.has(transfer.toAccountId)) continue;
      if (entry.accounts.has(transfer.fromAccountId)) continue;
      const share = entry.shares.get(transfer.toAccountId) ?? 0;
      if (share <= 0) continue;
      const rate = await rateOrOne(
        transfer.counterCurrency,
        baseCurrency,
        new Date(transfer.date),
      );
      const amount = Number(transfer.counterAmount) * (share / 100) * rate;
      const key = monthKey(new Date(transfer.date));
      totals.set(key, (totals.get(key) ?? 0) + amount);
    }
  }

  for (const [month, value] of totals) totals.set(month, Number(value.toFixed(4)));
  return totals;
}

function statusFor(goals: PlanGoal[]): DashboardStatus {
  if (goals.length === 0) return "no_plan";
  if (goals.some((goal) => goal.status === "off_track")) return "off_track";
  if (goals.some((goal) => goal.status === "at_risk")) return "at_risk";
  if (goals.some((goal) => goal.status === "insufficient_data")) return "insufficient_data";
  return "on_track";
}

function nextGoalFor(goals: PlanGoal[]): PlanGoal | null {
  return (
    goals.find((goal) => goal.status === "off_track") ??
    goals.find((goal) => goal.status === "at_risk") ??
    goals.find((goal) => goal.status === "insufficient_data") ??
    null
  );
}

function compositionFor(components: Awaited<ReturnType<typeof getEquity>>["components"]) {
  const totals = new Map<DashboardComposition["key"], number>([
    ["cash", 0],
    ["investments", 0],
    ["realEstate", 0],
    ["vehicles", 0],
    ["otherAssets", 0],
    ["liabilities", 0],
  ]);

  for (const component of components) {
    let key: DashboardComposition["key"];
    switch (component.assetClass) {
      case "cash":
        key = "cash";
        break;
      case "investments":
        key = "investments";
        break;
      case "real_estate":
        key = "realEstate";
        break;
      case "vehicles":
        key = "vehicles";
        break;
      case "other_appreciating":
      case "other_depreciating":
        key = "otherAssets";
        break;
      case "liabilities":
        key = "liabilities";
        break;
    }
    totals.set(key, (totals.get(key) ?? 0) + component.value);
  }

  return [...totals.entries()]
    .map(([key, value]) => ({ key, value: Number(value.toFixed(4)) }))
    .filter((item) => item.value > 0);
}

export async function getDashboard(
  range: DashboardRange = DEFAULT_DASHBOARD_RANGE,
  asOf = new Date(),
): Promise<DashboardModel> {
  const activeScenario = await getDefaultScenario(asOf);
  const [plan, equity, snapshots] = await Promise.all([
    getPlanStatus(asOf),
    getEquity(asOf),
    getNetWorthSeries(5000),
  ]);
  const trajectory = await planTrajectory(
    projectionMonths(range),
    asOf,
    (activeScenario?.assumptions ?? {}) as PlanAssumptionOverrides,
  );

  const filterMonths = historyMonths(range);
  const earliestSnapshot = snapshots[0]?.date;
  const fallbackStart = shiftMonths(asOf, -120).toISOString().slice(0, 10);
  const startDate = filterMonths
    ? shiftMonths(asOf, -filterMonths).toISOString().slice(0, 10)
    : (earliestSnapshot ?? fallbackStart);
  const filteredSnapshots = snapshots.filter((snapshot) => snapshot.date >= startDate);
  const history = filteredSnapshots.map((snapshot) => ({
    date: snapshot.date,
    value: Number(snapshot.net),
  }));
  if (history.length === 0 || history[history.length - 1]?.date !== equity.asOf) {
    history.push({ date: equity.asOf, value: equity.net });
  }
  const firstHistory = history[0];
  const netWorthChange =
    history.length > 1 && firstHistory
      ? {
          amount: Number((equity.net - firstHistory.value).toFixed(4)),
          pct:
            firstHistory.value !== 0
              ? Number(((equity.net - firstHistory.value) / Math.abs(firstHistory.value)).toFixed(4))
              : null,
          from: firstHistory.date,
        }
      : null;

  const points = new Map<string, DashboardPoint>();
  for (const point of history) {
    points.set(point.date, {
      date: point.date,
      actual: point.value,
      conservative: null,
      base: null,
      optimistic: null,
    });
  }
  for (const point of trajectory.points) {
    const existing = points.get(point.date);
    points.set(point.date, {
      date: point.date,
      actual: existing?.actual ?? null,
      conservative: point.conservative,
      base: point.base,
      optimistic: point.optimistic,
    });
  }

  let movement: DashboardMovement | null = null;
  if (filteredSnapshots.length >= 2) {
    const first = filteredSnapshots[0];
    const last = filteredSnapshots[filteredSnapshots.length - 1];
    const flow = await flowBetween(
      new Date(`${first.date}T00:00:00.000Z`),
      new Date(`${last.date}T23:59:59.999Z`),
    );
    const change = Number(last.net) - Number(first.net);
    const { fx, separated } = await fxEffect(first, last, plan.baseCurrency);
    const debtService = await debtServiceBetween(
      new Date(`${first.date}T00:00:00.000Z`),
      new Date(`${last.date}T23:59:59.999Z`),
      plan.baseCurrency,
    );
    movement = {
      from: first.date,
      to: last.date,
      opening: Number(first.net),
      closing: Number(last.net),
      change: Number(change.toFixed(4)),
      income: Number(flow.income.toFixed(4)),
      expenses: Number(flow.expenses.toFixed(4)),
      fx,
      fxSeparated: separated,
      market: Number((change - (flow.income - flow.expenses) - fx).toFixed(4)),
      debtService,
    };
  }

  const paceWindow = paceMonths(range);
  const paceStart = monthStart(shiftMonths(asOf, -(paceWindow - 1)));
  const trackedFlows = await trackedMonthlyFlow(plan.goals, paceStart, asOf, plan.baseCurrency);
  const trackedTotal = [...trackedFlows.values()].reduce((sum, value) => sum + value, 0);
  const source: DashboardPace["source"] = trackedTotal > 0 ? "tracked" : "net_savings";
  const flows =
    source === "tracked" ? trackedFlows : await monthlyFlow(paceStart, asOf);
  const startMonth = monthKey(paceStart);
  const pacePoints = [];
  let actual = 0;
  const requiredMonthly = plan.goals.reduce(
    (sum, goal) => sum + Math.max(0, goal.requiredMonthly ?? 0),
    0,
  );
  for (let index = 0; index < paceWindow; index += 1) {
    const month = addMonthsToMonth(startMonth, index);
    actual += flows.get(month) ?? 0;
    pacePoints.push({
      month,
      actual: Number(actual.toFixed(4)),
      required: Number((requiredMonthly * (index + 1)).toFixed(4)),
    });
  }
  const requiredTotal = requiredMonthly * paceWindow;
  const pace: DashboardPace | null =
    plan.goals.length > 0
      ? {
          months: paceWindow,
          source,
          requiredMonthly: Number(requiredMonthly.toFixed(4)),
          actualTotal: Number(actual.toFixed(4)),
          requiredTotal: Number(requiredTotal.toFixed(4)),
          shortfall: Number(Math.max(0, requiredTotal - actual).toFixed(4)),
          surplus: Number(Math.max(0, actual - requiredTotal).toFixed(4)),
          points: pacePoints,
        }
      : null;

  const currentMonthFlow = await flowBetween(monthStart(asOf), asOf);
  const goals = plan.goals;

  return {
    asOf: plan.asOf,
    baseCurrency: plan.baseCurrency,
    range,
    activeScenario: activeScenario
      ? { id: activeScenario.id, name: activeScenario.name, isDefault: activeScenario.isDefault }
      : null,
    plan,
    overallStatus: statusFor(goals),
    nextGoal: nextGoalFor(goals),
    points: [...points.values()].sort((a, b) => a.date.localeCompare(b.date)),
    history,
    netWorthChange,
    movement,
    pace,
    composition: compositionFor(equity.components),
    currentMonth: {
      income: Number(currentMonthFlow.income.toFixed(4)),
      expenses: Number(currentMonthFlow.expenses.toFixed(4)),
    },
    assumptions: trajectory.assumptions,
  };
}
