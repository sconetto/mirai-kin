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

export const INSTRUMENT_TYPES = ["stock", "fii", "etf", "fund", "bond", "crypto"] as const;
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

export const REVIEW_STATUSES = ["pending", "reviewed", "split"] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export const IMPORT_SOURCES = ["csv", "ofx", "brokerage_csv", "wallet_mcp"] as const;
export type ImportSource = (typeof IMPORT_SOURCES)[number];

export const IMPORT_ROW_STATUSES = ["pending", "valid", "invalid", "duplicate", "committed"] as const;
export type ImportRowStatus = (typeof IMPORT_ROW_STATUSES)[number];

export const GOAL_TYPES = ["emergency", "retirement", "home", "custom"] as const;
export type GoalType = (typeof GOAL_TYPES)[number];

export const TAX_TREATMENTS = ["none", "deductible", "income", "capital_gain", "dividend"] as const;
export type TaxTreatment = (typeof TAX_TREATMENTS)[number];

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
    taxTreatment: text("tax_treatment").$type<TaxTreatment>().notNull().default("none"),
    isEssential: boolean("is_essential").notNull().default(false),
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
    reviewStatus: text("review_status").$type<ReviewStatus>().notNull().default("pending"),
    isDeductible: boolean("is_deductible").notNull().default(false),
    parentTransactionId: uuid("parent_transaction_id").references(
      (): AnyPgColumn => transactions.id,
      { onDelete: "cascade" },
    ),
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

export const importBatches = pgTable("import_batches", {
  id: uuid("id").primaryKey().defaultRandom(),
  source: text("source").$type<ImportSource>().notNull(),
  fileName: text("file_name"),
  fileHash: text("file_hash"),
  accountId: uuid("account_id").references(() => accounts.id, { onDelete: "set null" }),
  status: text("status").notNull().default("staged"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  committedAt: timestamp("committed_at", { withTimezone: true }),
});

export const importRows = pgTable(
  "import_rows",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    batchId: uuid("batch_id")
      .notNull()
      .references(() => importBatches.id, { onDelete: "cascade" }),
    rowNumber: integer("row_number").notNull(),
    raw: jsonb("raw").notNull(),
    normalized: jsonb("normalized"),
    status: text("status").$type<ImportRowStatus>().notNull().default("pending"),
    error: text("error"),
    fingerprint: text("fingerprint"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("import_rows_batch_idx").on(t.batchId)],
);

export const importProfiles = pgTable("import_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  source: text("source").$type<ImportSource>().notNull(),
  mapping: jsonb("mapping").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const savedReports = pgTable("saved_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  config: jsonb("config").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insightAcknowledgements = pgTable(
  "insight_acknowledgements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    insightType: text("insight_type").notNull(),
    signature: text("signature").notNull(),
    acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("insight_ack_type_signature_idx").on(t.insightType, t.signature)],
);

export const netWorthSnapshots = pgTable(
  "net_worth_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    date: date("date").notNull(),
    assets: money("assets").notNull(),
    liabilities: money("liabilities").notNull(),
    net: money("net").notNull(),
    currency: text("currency").notNull(),
    breakdown: jsonb("breakdown").notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("net_worth_snapshots_date_idx").on(t.date)],
);

export const brokerageLots = pgTable("brokerage_lots", {
  id: uuid("id").primaryKey().defaultRandom(),
  positionId: uuid("position_id")
    .notNull()
    .references(() => investmentPositions.id, { onDelete: "cascade" }),
  acquiredAt: date("acquired_at").notNull(),
  quantity: quantity("quantity").notNull(),
  costPerUnit: money("cost_per_unit").notNull(),
  fees: money("fees").notNull().default("0"),
  currency: text("currency").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const brokerageSales = pgTable("brokerage_sales", {
  id: uuid("id").primaryKey().defaultRandom(),
  positionId: uuid("position_id")
    .notNull()
    .references(() => investmentPositions.id, { onDelete: "cascade" }),
  soldAt: date("sold_at").notNull(),
  quantity: quantity("quantity").notNull(),
  price: money("price").notNull(),
  fees: money("fees").notNull().default("0"),
  currency: text("currency").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const dividends = pgTable("dividends", {
  id: uuid("id").primaryKey().defaultRandom(),
  positionId: uuid("position_id")
    .notNull()
    .references(() => investmentPositions.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  amount: money("amount").notNull(),
  currency: text("currency").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const goals = pgTable("goals", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  type: text("type").$type<GoalType>().notNull().default("custom"),
  targetAmount: money("target_amount").notNull(),
  targetDate: date("target_date"),
  currency: text("currency").notNull(),
  priority: integer("priority").notNull().default(1),
  accountIds: jsonb("account_ids")
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const scenarios = pgTable("scenarios", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  assumptions: jsonb("assumptions").notNull().default(sql`'{}'::jsonb`),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const estateAssets = pgTable("estate_assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  value: money("value").notNull(),
  currency: text("currency").notNull(),
  accountId: uuid("account_id").references(() => accounts.id, { onDelete: "set null" }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const beneficiaries = pgTable("beneficiaries", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  relationship: text("relationship"),
  sharePct: percent("share_pct").notNull().default("0"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const estateDocuments = pgTable("estate_documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  category: text("category").notNull().default("other"),
  status: text("status").notNull().default("missing"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const assistantConversations = pgTable("assistant_conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const assistantMessages = pgTable("assistant_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id")
    .notNull()
    .references(() => assistantConversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
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
