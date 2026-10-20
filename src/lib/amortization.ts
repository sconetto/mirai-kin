export type AmortizationMethod = "price" | "sac" | "custom";

export type ScheduleRow = {
  periodNumber: number;
  dueDate: string;
  payment: number;
  interest: number;
  principal: number;
  balance: number;
};

export type ScheduleInput = {
  principal: number;
  annualRate: number;
  term: number;
  startDate: string;
  method: AmortizationMethod;
  gracePeriods?: number;
};

function round4(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

/** Add `months` to an ISO date, clamping to the last day of the target month. */
export function addMonths(dateIso: string, months: number): string {
  const date = new Date(`${dateIso.slice(0, 10)}T00:00:00.000Z`);
  const originalDay = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + months);
  const lastDay = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
  ).getUTCDate();
  date.setUTCDate(Math.min(originalDay, lastDay));
  return date.toISOString().slice(0, 10);
}

/**
 * Build a Price (tabela Price) schedule: constant payments, interest on the
 * declining balance, growing principal portion.
 */
export function buildPriceSchedule(input: ScheduleInput): ScheduleRow[] {
  const { principal, annualRate, term, startDate } = input;
  const grace = Math.min(Math.max(input.gracePeriods ?? 0, 0), Math.max(term - 1, 0));
  const amortTerm = term - grace;
  const monthlyRate = annualRate / 12;
  const rows: ScheduleRow[] = [];
  let balance = principal;

  const payment =
    monthlyRate === 0
      ? principal / amortTerm
      : (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -amortTerm));

  for (let period = 1; period <= term; period += 1) {
    const interest = balance * monthlyRate;
    let principalPart = period <= grace ? 0 : payment - interest;
    if (period === term) principalPart = balance;

    const paymentAmount = interest + principalPart;
    balance = Math.max(0, balance - principalPart);

    rows.push({
      periodNumber: period,
      dueDate: addMonths(startDate, period),
      payment: round4(paymentAmount),
      interest: round4(interest),
      principal: round4(principalPart),
      balance: round4(balance),
    });
  }

  return rows;
}

/**
 * Build a SAC (Sistema de Amortização Constante) schedule: constant principal
 * portion, declining interest and payment.
 */
export function buildSacSchedule(input: ScheduleInput): ScheduleRow[] {
  const { principal, annualRate, term, startDate } = input;
  const grace = Math.min(Math.max(input.gracePeriods ?? 0, 0), Math.max(term - 1, 0));
  const amortTerm = term - grace;
  const monthlyRate = annualRate / 12;
  const constantPrincipal = principal / amortTerm;
  const rows: ScheduleRow[] = [];
  let balance = principal;

  for (let period = 1; period <= term; period += 1) {
    const interest = balance * monthlyRate;
    let principalPart = period <= grace ? 0 : constantPrincipal;
    if (period === term) principalPart = balance;

    const paymentAmount = interest + principalPart;
    balance = Math.max(0, balance - principalPart);

    rows.push({
      periodNumber: period,
      dueDate: addMonths(startDate, period),
      payment: round4(paymentAmount),
      interest: round4(interest),
      principal: round4(principalPart),
      balance: round4(balance),
    });
  }

  return rows;
}

export function buildSchedule(input: ScheduleInput): ScheduleRow[] {
  if (input.method === "price") return buildPriceSchedule(input);
  if (input.method === "sac") return buildSacSchedule(input);
  return [];
}
