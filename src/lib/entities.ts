import { addMonths, buildPriceSchedule } from "./amortization";

export type EntityFrequency = "daily" | "weekly" | "monthly" | "yearly";

export type EntityRecord = {
  kind: string;
  value?: number | string | null;
  balance?: number | string | null;
  amount?: number | string | null;
  interestRate?: number | string | null;
  termMonths?: number | null;
  monthlyPayment?: number | string | null;
  startDate?: string | null;
  dueDay?: number | null;
  frequency?: EntityFrequency | null;
  nextDueDate?: string | null;
  appreciationRate?: number | string | null;
};

export type EntityDerived = {
  monthlyPayment: number | null;
  payoffDate: string | null;
  totalInterest: number | null;
  currentValue: number | null;
  gain: number | null;
  utilization: number | null;
  monthlyEquivalent: number | null;
  daysUntilDue: number | null;
};

function numberValue(value: unknown, fallback = 0): number {
  if (value === null || value === undefined || value === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function round4(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

export function frequencyFactor(frequency: EntityFrequency | null | undefined): number {
  switch (frequency) {
    case "daily":
      return 365 / 12;
    case "weekly":
      return 52 / 12;
    case "yearly":
      return 1 / 12;
    default:
      return 1;
  }
}

export function monthlyEquivalent(
  amount: number | string | null | undefined,
  frequency: EntityFrequency | null | undefined,
): number {
  return round4(numberValue(amount) * frequencyFactor(frequency));
}

function simulateLoan(
  balance: number,
  annualRate: number,
  payment: number,
  startDate: string,
): { payoffDate: string | null; totalInterest: number } {
  const monthlyRate = annualRate / 12;
  let remaining = balance;
  let interest = 0;
  for (let month = 1; month <= 1200; month += 1) {
    const charged = remaining * monthlyRate;
    interest += charged;
    remaining = remaining + charged - payment;
    if (remaining <= 0) {
      return { payoffDate: addMonths(startDate, month), totalInterest: round4(interest) };
    }
    if (payment <= charged) break;
  }
  return { payoffDate: null, totalInterest: round4(interest) };
}

export function loanSummary(record: EntityRecord, asOf = new Date()): {
  monthlyPayment: number | null;
  payoffDate: string | null;
  totalInterest: number | null;
} {
  const balance = numberValue(record.balance);
  if (balance <= 0) {
    return { monthlyPayment: 0, payoffDate: null, totalInterest: 0 };
  }
  const annualRate = numberValue(record.interestRate);
  const startDate = record.startDate ?? asOf.toISOString().slice(0, 10);
  const explicitPayment = numberValue(record.monthlyPayment);
  if (explicitPayment > 0) {
    const result = simulateLoan(balance, annualRate, explicitPayment, startDate);
    return {
      monthlyPayment: round4(explicitPayment),
      payoffDate: result.payoffDate,
      totalInterest: result.totalInterest,
    };
  }
  const term = record.termMonths ?? 0;
  if (term <= 0) {
    return { monthlyPayment: null, payoffDate: null, totalInterest: null };
  }
  const schedule = buildPriceSchedule({
    principal: balance,
    annualRate,
    term,
    startDate,
    method: "price",
  });
  const interest = schedule.reduce((sum, row) => sum + row.interest, 0);
  return {
    monthlyPayment: round4(schedule[0]?.payment ?? 0),
    payoffDate: schedule.at(-1)?.dueDate ?? null,
    totalInterest: round4(interest),
  };
}

export function appreciationSummary(
  value: number | string | null | undefined,
  annualRate: number | string | null | undefined,
  acquiredDate: string | null | undefined,
  asOf = new Date(),
): { currentValue: number; gain: number } {
  const original = numberValue(value);
  const rate = numberValue(annualRate);
  if (!acquiredDate) return { currentValue: round4(original), gain: 0 };
  const acquired = new Date(`${acquiredDate}T00:00:00.000Z`);
  const years = Math.max(0, (asOf.getTime() - acquired.getTime()) / (365.25 * 86_400_000));
  const current = original * Math.pow(1 + rate, years);
  return { currentValue: round4(current), gain: round4(current - original) };
}

export function creditCardSummary(
  balance: number | string | null | undefined,
  limit: number | string | null | undefined,
): { balance: number; utilization: number | null } {
  const used = numberValue(balance);
  const total = numberValue(limit);
  return {
    balance: round4(used),
    utilization: total > 0 ? round4(used / total) : null,
  };
}

export function dueSummary(
  nextDueDate: string | null | undefined,
  frequency: EntityFrequency | null | undefined,
  amount: number | string | null | undefined,
  asOf = new Date(),
): { monthlyEquivalent: number; daysUntilDue: number | null } {
  const monthly = monthlyEquivalent(amount, frequency);
  if (!nextDueDate) return { monthlyEquivalent: monthly, daysUntilDue: null };
  const due = new Date(`${nextDueDate}T00:00:00.000Z`);
  const days = Math.ceil((due.getTime() - asOf.getTime()) / 86_400_000);
  return { monthlyEquivalent: monthly, daysUntilDue: days };
}

export function deriveEntity(
  record: EntityRecord,
  linkedBalance?: number | null,
  asOf = new Date(),
): EntityDerived {
  const kind = record.kind;
  if (kind === "loan") {
    const loan = loanSummary(record, asOf);
    return {
      monthlyPayment: loan.monthlyPayment,
      payoffDate: loan.payoffDate,
      totalInterest: loan.totalInterest,
      currentValue: null,
      gain: null,
      utilization: null,
      monthlyEquivalent: null,
      daysUntilDue: null,
    };
  }
  if (kind === "property" || kind === "vehicle") {
    const appreciation = appreciationSummary(
      record.value,
      record.appreciationRate,
      record.startDate,
      asOf,
    );
    return {
      monthlyPayment: null,
      payoffDate: null,
      totalInterest: null,
      currentValue: appreciation.currentValue,
      gain: appreciation.gain,
      utilization: null,
      monthlyEquivalent: null,
      daysUntilDue: null,
    };
  }
  if (kind === "credit_card") {
    const card = creditCardSummary(linkedBalance ?? record.balance, record.value);
    return {
      monthlyPayment: null,
      payoffDate: null,
      totalInterest: null,
      currentValue: null,
      gain: null,
      utilization: card.utilization,
      monthlyEquivalent: null,
      daysUntilDue: null,
    };
  }
  const due = dueSummary(record.nextDueDate, record.frequency, record.amount, asOf);
  return {
    monthlyPayment: null,
    payoffDate: null,
    totalInterest: null,
    currentValue: null,
    gain: null,
    utilization: null,
    monthlyEquivalent: due.monthlyEquivalent,
    daysUntilDue: due.daysUntilDue,
  };
}
