import { z } from "@/lib/zod";
import {
  ACCOUNT_TYPES,
  AMORTIZATION_METHODS,
  BUDGET_PERIODS,
  CATEGORY_TYPES,
  DEBT_TYPES,
  INSTRUMENT_TYPES,
  PAYMENT_TYPES,
  RECURRENCE_FREQUENCIES,
} from "@/db/schema";

export const decimal = z
  .union([z.number(), z.string()])
  .describe("Numeric value, as a number or decimal string");

export const isoDate = z.string().min(4).describe("ISO 8601 date, e.g. 2026-01-31");

export const isoDateTime = z
  .string()
  .min(4)
  .describe("ISO 8601 date or date-time, e.g. 2026-01-31T12:00:00Z");

export const currencyCode = z
  .string()
  .regex(/^[A-Za-z]{3}$/, "Must be a 3-letter ISO 4217 currency code")
  .describe("ISO 4217 currency code, e.g. BRL");

export const idParam = z.uuid();

export const accountCreateSchema = z.object({
  name: z.string().min(1),
  type: z.enum(ACCOUNT_TYPES),
  currency: currencyCode,
  openingBalance: decimal.optional(),
  archived: z.boolean().optional(),
});

export const accountUpdateSchema = accountCreateSchema.partial();

export const categoryCreateSchema = z.object({
  name: z.string().min(1),
  type: z.enum(CATEGORY_TYPES),
  parentId: z.uuid().optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
});

export const categoryUpdateSchema = categoryCreateSchema.partial();

export const labelCreateSchema = z.object({
  name: z.string().min(1).max(64),
});

export const labelUpdateSchema = labelCreateSchema.partial();

export const transactionCreateSchema = z.object({
  accountId: z.uuid(),
  categoryId: z.uuid().nullish(),
  amount: decimal,
  currency: currencyCode.optional(),
  recordDate: isoDateTime,
  note: z.string().nullish(),
  paymentType: z.enum(PAYMENT_TYPES).nullish(),
  counterparty: z.string().nullish(),
  labelIds: z.array(z.uuid()).max(50).optional(),
});

export const transactionUpdateSchema = transactionCreateSchema.partial();

export const transactionBatchSchema = z.object({
  transactions: z.array(transactionCreateSchema).min(1).max(50),
});

export const transactionQuerySchema = z.object({
  accountId: z.string().optional(),
  categoryId: z.uuid().optional(),
  labelId: z.uuid().optional(),
  from: isoDate.optional(),
  to: isoDate.optional(),
  paymentType: z.enum(PAYMENT_TYPES).optional(),
  limit: z.coerce.number().int().min(1).max(400).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export const budgetCreateSchema = z.object({
  name: z.string().min(1),
  periodType: z.enum(BUDGET_PERIODS).optional(),
  startDate: isoDate,
  endDate: isoDate.nullish(),
  amount: decimal,
  currency: currencyCode.optional(),
  accountIds: z.array(z.uuid()).max(50).optional(),
  categoryIds: z.array(z.uuid()).max(50).optional(),
  labelIds: z.array(z.uuid()).max(50).optional(),
});

export const budgetUpdateSchema = budgetCreateSchema.partial();

export const investmentPositionCreateSchema = z.object({
  accountId: z.uuid(),
  symbol: z.string().min(1),
  name: z.string().min(1),
  instrumentType: z.enum(INSTRUMENT_TYPES),
  quantity: decimal,
  avgCost: decimal,
  currency: currencyCode,
});

export const investmentPositionUpdateSchema = investmentPositionCreateSchema.partial();

export const investmentPriceCreateSchema = z.object({
  date: isoDate,
  price: decimal,
  currency: currencyCode.optional(),
});

export const debtCreateSchema = z.object({
  accountId: z.uuid().nullish(),
  name: z.string().min(1),
  type: z.enum(DEBT_TYPES),
  principal: decimal,
  interestRate: decimal,
  term: z.coerce.number().int().min(1),
  startDate: isoDate,
  paymentFrequency: z.string().optional(),
  amortizationMethod: z.enum(AMORTIZATION_METHODS),
  gracePeriods: z.coerce.number().int().min(0).optional(),
  currency: currencyCode,
});

export const debtUpdateSchema = debtCreateSchema.partial();

export const recurringTransactionCreateSchema = z.object({
  accountId: z.uuid(),
  categoryId: z.uuid().nullish(),
  amount: decimal,
  currency: currencyCode.optional(),
  frequency: z.enum(RECURRENCE_FREQUENCIES),
  startDate: isoDate,
  endDate: isoDate.nullish(),
  note: z.string().nullish(),
  paymentType: z.enum(PAYMENT_TYPES).nullish(),
});

export const projectionQuerySchema = z.object({
  horizonMonths: z.coerce.number().int().min(1).max(60).optional(),
});

export const csvImportSchema = z.object({
  accountId: z.uuid().optional(),
  csv: z.string().min(1),
  idempotencyKey: z.string().min(1).optional(),
});

export const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export type AccountCreateInput = z.infer<typeof accountCreateSchema>;
export type AccountUpdateInput = z.infer<typeof accountUpdateSchema>;
export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>;
export type LabelCreateInput = z.infer<typeof labelCreateSchema>;
export type TransactionCreateInput = z.infer<typeof transactionCreateSchema>;
export type BudgetCreateInput = z.infer<typeof budgetCreateSchema>;
export type InvestmentPositionCreateInput = z.infer<typeof investmentPositionCreateSchema>;
export type DebtCreateInput = z.infer<typeof debtCreateSchema>;
export type RecurringTransactionCreateInput = z.infer<typeof recurringTransactionCreateSchema>;
