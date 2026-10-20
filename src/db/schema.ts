import { sql } from "drizzle-orm";
import {
  AnyPgColumn,
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const ACCOUNT_TYPES = [
  "checking",
  "savings",
  "credit_card",
  "investment",
  "loan",
  "mortgage",
  "asset",
  "cash",
] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const CATEGORY_TYPES = ["income", "expense"] as const;
export type CategoryType = (typeof CATEGORY_TYPES)[number];

export const PAYMENT_TYPES = [
  "cash",
  "debit_card",
  "credit_card",
  "transfer",
  "pix",
  "boleto",
  "ted",
] as const;
export type PaymentType = (typeof PAYMENT_TYPES)[number];

export const BUDGET_PERIODS = ["monthly", "annual", "custom"] as const;
export type BudgetPeriod = (typeof BUDGET_PERIODS)[number];

export const INSTRUMENT_TYPES = ["stock", "etf", "fund", "bond", "crypto"] as const;
export type InstrumentType = (typeof INSTRUMENT_TYPES)[number];

export const DEBT_TYPES = [
  "installment",
  "financed",
  "mortgage",
  "loan",
  "credit_card",
] as const;
export type DebtType = (typeof DEBT_TYPES)[number];

export const AMORTIZATION_METHODS = ["price", "sac", "custom"] as const;
export type AmortizationMethod = (typeof AMORTIZATION_METHODS)[number];

export const RECURRENCE_FREQUENCIES = ["daily", "weekly", "monthly", "yearly"] as const;
export type RecurrenceFrequency = (typeof RECURRENCE_FREQUENCIES)[number];

const money = (name: string) => numeric(name, { precision: 20, scale: 4 });
const rate = (name: string) => numeric(name, { precision: 30, scale: 10 });
const quantity = (name: string) => numeric(name, { precision: 30, scale: 8 });
const percent = (name: string) => numeric(name, { precision: 20, scale: 6 });

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    type: text("type").$type<AccountType>().notNull(),
    currency: text("currency").notNull(),
    openingBalance: money("opening_balance").notNull().default("0"),
    archived: boolean("archived").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("accounts_currency_idx").on(t.currency)],
);

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    type: text("type").$type<CategoryType>().notNull(),
    parentId: uuid("parent_id").references((): AnyPgColumn => categories.id, {
      onDelete: "set null",
    }),
    color: text("color"),
    icon: text("icon"),
    isSystem: boolean("is_system").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("categories_parent_idx").on(t.parentId)],
);

export const labels = pgTable("labels", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const fxRates = pgTable(
  "fx_rates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    base: text("base").notNull(),
    quote: text("quote").notNull(),
    rate: rate("rate").notNull(),
    date: date("date").notNull(),
    source: text("source").notNull().default("frankfurter"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("fx_rates_base_quote_date_idx").on(t.base, t.quote, t.date),
    index("fx_rates_date_idx").on(t.date),
  ],
);

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
    amount: money("amount").notNull(),
    currency: text("currency").notNull(),
    baseCurrency: text("base_currency").notNull(),
    baseAmount: money("base_amount").notNull(),
    fxRateId: uuid("fx_rate_id").references(() => fxRates.id, { onDelete: "set null" }),
    recordDate: timestamp("record_date", { withTimezone: true }).notNull(),
    note: text("note"),
    paymentType: text("payment_type").$type<PaymentType>(),
    counterparty: text("counterparty"),
    labelIds: jsonb("label_ids")
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("transactions_account_idx").on(t.accountId),
    index("transactions_category_idx").on(t.categoryId),
    index("transactions_record_date_idx").on(t.recordDate),
  ],
);

export const budgets = pgTable("budgets", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  periodType: text("period_type").$type<BudgetPeriod>().notNull().default("monthly"),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  amount: money("amount").notNull(),
  currency: text("currency").notNull(),
  accountIds: jsonb("account_ids")
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  categoryIds: jsonb("category_ids")
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  labelIds: jsonb("label_ids")
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const investmentPositions = pgTable("investment_positions", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountId: uuid("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  symbol: text("symbol").notNull(),
  name: text("name").notNull(),
  instrumentType: text("instrument_type").$type<InstrumentType>().notNull(),
  quantity: quantity("quantity").notNull(),
  avgCost: money("avg_cost").notNull(),
  currency: text("currency").notNull(),
  closed: boolean("closed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const investmentPrices = pgTable(
  "investment_prices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    positionId: uuid("position_id")
      .notNull()
      .references(() => investmentPositions.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    price: money("price").notNull(),
    currency: text("currency").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("investment_prices_position_date_idx").on(t.positionId, t.date)],
);

export const debts = pgTable("debts", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountId: uuid("account_id").references(() => accounts.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  type: text("type").$type<DebtType>().notNull(),
  principal: money("principal").notNull(),
  interestRate: percent("interest_rate").notNull(),
  term: integer("term").notNull(),
  startDate: date("start_date").notNull(),
  paymentFrequency: text("payment_frequency").notNull().default("monthly"),
  amortizationMethod: text("amortization_method").$type<AmortizationMethod>().notNull(),
  gracePeriods: integer("grace_periods").notNull().default(0),
  currency: text("currency").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const debtSchedule = pgTable(
  "debt_schedule",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    debtId: uuid("debt_id")
      .notNull()
      .references(() => debts.id, { onDelete: "cascade" }),
    periodNumber: integer("period_number").notNull(),
    dueDate: date("due_date").notNull(),
    payment: money("payment").notNull(),
    interest: money("interest").notNull(),
    principal: money("principal").notNull(),
    balance: money("balance").notNull(),
  },
  (t) => [uniqueIndex("debt_schedule_debt_period_idx").on(t.debtId, t.periodNumber)],
);

export const recurringTransactions = pgTable("recurring_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountId: uuid("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
  amount: money("amount").notNull(),
  currency: text("currency").notNull(),
  frequency: text("frequency").$type<RecurrenceFrequency>().notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  note: text("note"),
  paymentType: text("payment_type").$type<PaymentType>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const idempotencyKeys = pgTable("idempotency_keys", {
  key: text("key").primaryKey(),
  scope: text("scope").notNull(),
  requestHash: text("request_hash").notNull(),
  statusCode: integer("status_code").notNull(),
  response: jsonb("response").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type Account = typeof accounts.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Label = typeof labels.$inferSelect;
export type FxRate = typeof fxRates.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Budget = typeof budgets.$inferSelect;
export type InvestmentPosition = typeof investmentPositions.$inferSelect;
export type InvestmentPrice = typeof investmentPrices.$inferSelect;
export type Debt = typeof debts.$inferSelect;
export type DebtScheduleRow = typeof debtSchedule.$inferSelect;
export type RecurringTransaction = typeof recurringTransactions.$inferSelect;
