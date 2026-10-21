export function emergencyRunway(liquid: number, monthlyEssential: number): number {
  if (monthlyEssential <= 0) return 0;
  return liquid / monthlyEssential;
}

export function requiredMonthlyContribution(
  target: number,
  current: number,
  months: number,
  annualReturn = 0,
): number {
  const remaining = Math.max(0, target - current);
  if (months <= 0) return remaining;
  const monthlyRate = annualReturn / 12;
  if (monthlyRate === 0) return remaining / months;
  const factor = (Math.pow(1 + monthlyRate, months) - 1) / monthlyRate;
  return remaining / factor;
}
