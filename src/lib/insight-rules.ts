import { monthlyEquivalent, type EntityFrequency } from "./entities";

export function idleCashExcess(
  liquid: number,
  essentialMonthly: number,
  months = 6,
): { excess: number; runwayMonths: number } | null {
  if (essentialMonthly <= 0 || liquid <= essentialMonthly * months) return null;
  return {
    excess: Number((liquid - essentialMonthly * months).toFixed(4)),
    runwayMonths: Number((liquid / essentialMonthly).toFixed(1)),
  };
}

export function detectMilestone(
  previous: number,
  latest: number,
): { milestone: number; step: number } | null {
  if (latest <= 0) return null;
  const magnitude = Math.max(Math.abs(latest), 1);
  const step = Math.pow(10, Math.max(0, Math.floor(Math.log10(magnitude)) - 1));
  const previousBucket = Math.floor(previous / step);
  const latestBucket = Math.floor(latest / step);
  if (latestBucket <= previousBucket) return null;
  return { milestone: latestBucket * step, step };
}

export function detectSpendingAnomaly(
  current: number,
  trailing: number[],
  multiplier = 2,
): { mean: number; stddev: number; threshold: number } | null {
  if (trailing.length < 2 || current <= 0) return null;
  const mean = trailing.reduce((sum, value) => sum + value, 0) / trailing.length;
  if (mean <= 0) return null;
  const variance =
    trailing.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / trailing.length;
  const stddev = Math.sqrt(variance);
  const threshold = mean + multiplier * stddev;
  if (current <= threshold || current <= mean * 1.1) return null;
  return {
    mean: Number(mean.toFixed(4)),
    stddev: Number(stddev.toFixed(4)),
    threshold: Number(threshold.toFixed(4)),
  };
}

export function subscriptionAudit(
  items: { name: string; amount: number; frequency: EntityFrequency | null | undefined }[],
): { count: number; monthlyTotal: number; duplicates: string[] } {
  const monthly = items.map((item) => ({
    name: item.name.trim(),
    amount: monthlyEquivalent(item.amount, item.frequency),
  }));
  const total = monthly.reduce((sum, item) => sum + item.amount, 0);
  const byName = new Map<string, string[]>();
  const byAmount = new Map<number, string[]>();
  for (const item of monthly) {
    const nameKey = item.name.toLowerCase();
    byName.set(nameKey, [...(byName.get(nameKey) ?? []), item.name]);
    byAmount.set(item.amount, [...(byAmount.get(item.amount) ?? []), item.name]);
  }
  const duplicates = new Set<string>();
  for (const names of byName.values()) {
    if (names.length > 1) names.forEach((name) => duplicates.add(name));
  }
  for (const names of byAmount.values()) {
    if (names.length > 1) names.forEach((name) => duplicates.add(name));
  }
  return {
    count: monthly.length,
    monthlyTotal: Number(total.toFixed(4)),
    duplicates: [...duplicates],
  };
}
