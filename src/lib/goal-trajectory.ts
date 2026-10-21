export const DEFAULT_INFLATION_RATE = 0.03;
export const RETURN_BAND = 0.02;

export type GoalStatus = "on_track" | "at_risk" | "off_track" | "insufficient_data";

export type GoalProjection = {
  conservative: number;
  base: number;
  optimistic: number;
};

export type GoalStatusResult = {
  status: GoalStatus;
  reason: string | null;
};

export function realAnnualReturn(nominalReturn: number, inflation: number): number {
  return (1 + nominalReturn) / (1 + inflation) - 1;
}

export function monthlyRate(realAnnual: number): number {
  return Math.pow(1 + realAnnual, 1 / 12) - 1;
}

export function monthsBetween(asOf: Date, targetDate: Date): number {
  if (targetDate <= asOf) return 0;

  let months =
    (targetDate.getUTCFullYear() - asOf.getUTCFullYear()) * 12 +
    (targetDate.getUTCMonth() - asOf.getUTCMonth());

  if (targetDate.getUTCDate() < asOf.getUTCDate()) months -= 1;
  return Math.max(0, months);
}

export function futureValue(
  current: number,
  monthlyContribution: number,
  realAnnual: number,
  months: number,
): number {
  if (months <= 0) return current;
  const rate = monthlyRate(realAnnual);
  const growth = Math.pow(1 + rate, months);
  if (Math.abs(rate) < 1e-12) {
    return current + monthlyContribution * months;
  }
  return current * growth + monthlyContribution * ((growth - 1) / rate);
}

export function requiredMonthlyContribution(
  current: number,
  target: number,
  realAnnual: number,
  months: number,
): number | null {
  if (months <= 0) return current >= target ? 0 : null;

  const rate = monthlyRate(realAnnual);
  const growth = Math.pow(1 + rate, months);
  const gap = target - current * growth;
  if (gap <= 0) return 0;

  if (Math.abs(rate) < 1e-12) return gap / months;
  return (gap * rate) / (growth - 1);
}

export function projectionRange(
  current: number,
  monthlyContribution: number,
  expectedReturn: number,
  inflation: number,
  months: number,
): GoalProjection {
  const conservative = futureValue(
    current,
    monthlyContribution,
    realAnnualReturn(Math.max(-0.99, expectedReturn - RETURN_BAND), inflation),
    months,
  );
  const base = futureValue(
    current,
    monthlyContribution,
    realAnnualReturn(expectedReturn, inflation),
    months,
  );
  const optimistic = futureValue(
    current,
    monthlyContribution,
    realAnnualReturn(expectedReturn + RETURN_BAND, inflation),
    months,
  );
  return {
    conservative: Number(conservative.toFixed(4)),
    base: Number(base.toFixed(4)),
    optimistic: Number(optimistic.toFixed(4)),
  };
}

export function classifyGoalStatus(target: number, projections: GoalProjection): GoalStatusResult {
  if (projections.conservative >= target) {
    return { status: "on_track", reason: null };
  }
  if (projections.base >= target) {
    return { status: "at_risk", reason: "only_base_case_reaches_target" };
  }
  return { status: "off_track", reason: "base_case_misses_target" };
}
