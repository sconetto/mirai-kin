# Design — Build Finance Planner

## Context

Self-hosted, multi-lingual (en-US / pt-BR) finance planner. The first implementation established the data foundation (accounts, transactions, budgets, investments, debts, projections, FX snapshots, API, knowledge). This revision reframes the product around **import → review → report → insight → plan**, inspired by the information architecture of Origin's web app: a left rail split into **Track** (Overview, Spending, Invest, Forecast, Equity) and **Services** (Brokerage, Estate Planning, Tax, Financial Planner), with report tabs, saved reports, summary stats, and an optional assistant entry point.

The product is not a transaction-entry app. Statements are imported, reviewed for cleanliness, and then turned into reports, insights, and a plan. Manual entry remains only for corrections.

Constraints carried forward:

- Next.js 16 full-stack + PostgreSQL, latest stable dependencies.
- Web-only, responsive.
- Multi-currency with snapshot base-amounts.
- Single-user auth (env credentials) + API token.
- Versioned, documented REST API as the integration surface.
- Static-Markdown knowledge module, rendered richly.
- CSV import first, OFX and brokerage import in this revision.
- FX and background jobs via pg-boss with retry/backoff.

## Goals / Non-Goals

**Goals:**

- Make import the primary path and transaction review the primary data-management surface.
- Provide a report suite with ranges, filters, saved reports, comparison, and CSV export.
- Provide deterministic, actionable insights without requiring an LLM.
- Add equity/net worth, brokerage, tax (Brazil-first summaries), financial planning, and estate planning.
- Add an optional, opt-in assistant grounded in the same services, disabled by default.
- Reorganize navigation to match the Track / Services / Learn model.
- Keep every domain accessible through `/api/v1` for agents.

**Non-Goals:**

- Multi-user accounts, roles, or sharing.
- Native mobile app.
- Bank-sync integrations (GoCardless/Plaid) — still out of scope.
- Tax calculation, tax filing, legal documents, or regulated financial advice.
- Real-time brokerage connectivity (CSV/manual first).
- Stochastic (Monte Carlo) planning in the first revision.
- Full PDF report generation in the first revision (CSV now).

## Decisions

### 1. Product information architecture

```
TRACK                          SERVICES                    LEARN
Overview                       Brokerage                   Glossary
Spending                       Tax                         Guides
  Overview                     Financial Planner
  Breakdown & budget           Estate Planning
  Transactions
  Recurring
  Reports
Invest
Forecast
Equity
Import
```

- **Track** answers "what is happening": current position, spending, investments, forecast, equity.
- **Services** answer "what should I do": brokerage, tax, planner, estate.
- **Learn** explains concepts and links back from insights/reports.
- **Import** is a first-class, always-visible entry point (it is the primary way data enters).
- Insights appear on the Overview and on a dedicated Insights surface; the assistant is a floating entry point (phase 2).

*Alternatives considered:* keeping the flat nav (fails to distinguish tracking from planning); nesting reports under Overview (hides the core value). Rejected.

### 2. Import-first data flow

```
source ──▶ adapter ──▶ mapping profile ──▶ staged rows ──▶ validate + dedupe ──▶ review ──▶ commit
 CSV        CSV         saved column map     import_batches    per-row errors      UI        transactions
 OFX        OFX                             import_rows       fingerprints                  brokerage
 Brokerage  brokerage CSV                                                                    dividends
 Wallet MCP agent-assisted (agent reads Wallet, writes through /api/v1)
```

- `import_batches` and `import_rows` persist staging so a user can review before committing, and so partial failures are recoverable.
- `import_profiles` stores reusable column mappings per source/account.
- Deduplication uses a fingerprint over `(account, date, amount, counterparty, note)` plus a fuzzy window, surfacing possible duplicates for review rather than silently dropping them.
- File hash + `Idempotency-Key` prevent re-import.
- Brokerage imports stage positions, lots, sales, and dividends alongside transactions.

### 3. Reports

- A `reports` service exposes pure aggregation functions over Drizzle queries: cash flow, income, expenses, transfers, spending by category, budget vs actual, net worth, debt, and investment performance.
- A report config is a serializable object: `{ type, from, to, accountIds, categoryIds, labelIds, currency, groupBy, chartType, comparison }`.
- `saved_reports` stores `(name, config)`; saved reports are reopened with the same configuration.
- Every report returns summary totals, a period table, and optional series for charting.
- CSV export is generated server-side from the same rows.
- Period comparison computes current vs previous period and vs the same period last year.
- Currency: reports aggregate `base_amount` snapshots; equity uses the snapshot rate for the reporting date.

### 4. Insights

- Deterministic rules over the user's data; no LLM required.
- Insight shape: `{ type, severity, data, action }`. The service **does not embed prose**; the UI translates `type` + `data` through the `insights` namespace, keeping en-US/pt-BR parity.
- Rule set (v1): savings rate, budget variance, category spending spike (vs trailing average), upcoming recurring bills, debt burden (debt-to-income / interest cost), investment allocation drift, net-worth trend, cash-flow risk (projected negative balance).
- Severity: `info`, `warning`, `critical`.
- `insight_acknowledgements` stores `(insight_type, signature, acknowledged_at)`, where `signature` hashes the underlying condition. If the condition changes, the insight resurfaces.
- Insufficient history produces an explicit "not enough data" state, never a false positive.

### 5. Assistant (phase 2)

- Optional in-app "Ask anything" chat, **disabled by default**.
- Provider/model/API key via env (`ASSISTANT_PROVIDER`, `ASSISTANT_MODEL`, `ASSISTANT_API_KEY`, optional `ASSISTANT_BASE_URL` for OpenAI-compatible/local models such as Ollama).
- Uses the Vercel AI SDK with tool-calling. Tools call the **same service layer** (cash flow, net worth, budgets, insights, transaction search) so answers are grounded, never fabricated.
- Read-only by default; any proposed write requires explicit user confirmation.
- No data leaves the server unless the assistant is configured and used. Documented in the UI and README.
- Every answer carries an informational, non-advice disclaimer.
- Conversation history stored locally (`assistant_conversations`, `assistant_messages`).
- The assistant is a *consumer* of the API contract, not a privileged path.

### 6. Equity

- Net worth = assets − liabilities, in the base currency.
- Assets: checking, savings, investment, brokerage, cash, property/asset accounts, plus manual estate assets.
- Liabilities: credit cards, loans, mortgages.
- Composition by account type and currency, with drill-down links.
- `net_worth_snapshots` records dated totals plus a breakdown; a pg-boss job records them (daily) so trends are cheap to chart.
- Account balances convert at the snapshot date's FX rate; historical snapshots are immutable.

### 7. Brokerage

- Extends investments with cost-basis detail: `brokerage_lots` (acquisition date, quantity, cost per unit, fees, currency) and `brokerage_sales` (date, quantity, price, fees, currency).
- Cost basis uses the **average-cost** method by default (Brazilian convention for stocks/FIIs); FIFO is a later option.
- Realized gains derive from sales against average cost; unrealized gains use the latest price.
- Allocation by instrument, currency, and account.
- `dividends` records income and flows into cash-flow and tax reports.
- Import from brokerage CSV (symbol, date, type, quantity, price, fees) or manual entry; tax export as CSV.
- Brazil-first instrument support (stocks, FIIs, ETFs, funds, bonds, crypto) without hard-coding a single broker.

### 8. Tax (Brazil-first)

- Produces **summaries**, not calculations or filings:
  - income by category for a tax year;
  - deductible expenses (categories/transactions flagged `is_deductible` / `tax_treatment`);
  - realized capital gains and losses from brokerage;
  - dividends received.
- `categories.tax_treatment` (`none | deductible | income | capital_gain | dividend`) and `transactions.is_deductible` provide the classification.
- CSV exports for an accountant.
- Explicit disclaimer that the app does not calculate or file taxes and is not tax advice.
- Jurisdiction is isolated behind a `tax` module so other countries can be added later.

### 9. Financial planner

- `goals`: name, type (`emergency | retirement | home | custom`), target amount, target date, currency, priority, linked accounts, notes.
- `scenarios`: name + assumptions (`incomeGrowth`, `inflation`, `returnRate`, `savingsRate`, `horizonMonths`), with base/optimistic/pessimistic presets.
- Projections reuse the deterministic forecast engine; the planner compares scenarios side by side.
- Required contribution solves for the periodic amount needed to reach a goal by its date at the assumed return.
- Emergency-fund runway = liquid assets ÷ essential monthly expenses (categories flagged `is_essential`).
- No stochastic modeling in this revision.

### 10. Estate planning

- `estate_assets`: inventory of accounts, investments, property, and other assets with values.
- `beneficiaries`: name, relationship, intended share, notes.
- `estate_documents`: checklist items (will, power of attorney, insurance, etc.) with status.
- Free-form notes and CSV export.
- Data stays local to the server; there is no external sync.
- Explicit disclaimer: no legal advice, no legal documents.

### 11. Data model additions

New tables: `import_batches`, `import_rows`, `import_profiles`, `saved_reports`, `insight_acknowledgements`, `net_worth_snapshots`, `brokerage_lots`, `brokerage_sales`, `dividends`, `goals`, `scenarios`, `estate_assets`, `beneficiaries`, `estate_documents`, and (phase 2) `assistant_conversations` / `assistant_messages`.

Column additions: `transactions.review_status` (`pending | reviewed`), `transactions.is_deductible`, `transactions.parent_transaction_id` (for splits), `categories.tax_treatment`, `categories.is_essential`, `investment_positions.instrument_type` gains `fii`.

### 12. Stack (retained)

TypeScript, Node 24 LTS, pnpm, Next.js 16 (App Router), React 19, Drizzle ORM, PostgreSQL 17, Zod + `@asteasolutions/zod-to-openapi`, `openapi-typescript`, pg-boss, next-intl, Tailwind + shadcn-style primitives, Recharts, MDX (`next-mdx-remote`), Vitest, Playwright. The assistant adds `ai` + a provider adapter.

### 13. Multi-currency snapshot (retained)

Transactions keep native `amount`/`currency` plus `base_amount`/`base_currency` and `fx_rate_id`, resolved against `record_date` (nearest prior rate). Reports aggregate `base_amount`; historical figures never drift.

### 14. FX and background jobs (retained)

Daily Frankfurter/ECB fetch via pg-boss with retry + exponential backoff; new `net-worth-snapshot` job for equity history. Both persist state in Postgres.

### 15. Authentication (retained)

Single user via `AUTH_USERNAME` + `AUTH_PASSWORD`/`AUTH_PASSWORD_HASH`; httpOnly signed session cookie; `API_TOKEN` bearer for `/api/v1`. Tax and estate data inherit the same single-user boundary.

### 16. REST API contract (retained, expanded)

`/api/v1` remains the single integration surface. New read endpoints for reports and insights and CRUD for goals, scenarios, brokerage, tax summaries, and estate data. The assistant consumes the same service layer. Batch + `Idempotency-Key` + consistent error envelope remain.

### 17. Debt amortization (retained)

Price and SAC schedules generated from debt inputs; regenerated on change.

### 18. Projections (retained, expanded)

Deterministic cash-flow forecasts gain scenario assumptions (income growth, inflation) used by the planner. Outputs remain reproducible.

### 19. Knowledge (retained, expanded)

Static Markdown/MDX content gains planning guides (investing, tax, estate) and contextual links from insights/reports. Per-locale content directories with default-locale fallback.

### 20. i18n (retained)

next-intl with `/pt-BR` and `/en`; all new screens, insight types, report labels, and disclaimers are localized. Insight prose is translated in the UI from `type` + `data`.

### 21. Deployment (retained)

Docker Compose: app + PostgreSQL, migrations and seed on startup, pg-boss workers co-located. New optional env vars for the assistant. Reverse proxy still optional.

### 22. Testing (expanded)

Vitest for report aggregations, insight rules, planner math (required contribution, runway), tax classification, and brokerage gains. Playwright for import → review → report → insight flows. Existing amortization, FX, idempotency, and CSV tests remain.

## Risks / Trade-offs

- [Scope: all domains in one change] → Keep each capability independently shippable; implement in three phases (reports/insights/equity first, planning/brokerage/tax next, estate/assistant last) while the spec covers the whole.
- [Tax/estate liability] → Summaries and inventories only; prominent disclaimers; no calculations, filing, legal advice, or documents.
- [Sensitive estate/tax data] → Single-user boundary, local-only storage, no external calls unless the assistant is explicitly enabled.
- [Assistant privacy] → Opt-in, provider-configurable, read-only default, documented data flow, no data sent when disabled.
- [Import fidelity (OFX/brokerage)] → Staging + per-row errors + dedupe; never silently drop rows.
- [Brazil-specific rules] → Isolate tax/brokerage conventions behind modules; average-cost default; jurisdiction noted in the UI.
- [Report/insight performance] → Date-range indexes and base-amount aggregation; pre-aggregation later if needed.
- [i18n of insights] → Return `type` + `data`, translate in the UI; no embedded English prose.
- [Currency drift in equity] → Snapshot net worth at a date and store it immutably; never recompute historical snapshots.

## Migration Plan

Additive Drizzle migrations only (new tables/columns); existing data is preserved. The UI reorganization redirects old routes to their new locations. Rollback is a new forward migration; no destructive changes. The assistant remains disabled until configured.

## Open Questions

- Default assistant provider (OpenAI-compatible, Anthropic, Google, or local Ollama) and whether to ship a sample config.
- Exact Brazilian tax summaries to include (IRPF fields, capital-gains exemption thresholds, carnê-leão) — summaries only.
- Brokerage corporate actions (splits, bonuses, amortization) and whether FIFO is needed alongside average cost.
- Beneficiary share validation (must total 100%?).
- Report export scope beyond CSV (PDF/Excel) and whether saved reports are shareable.
- Insight thresholds: fixed defaults vs. user-configurable settings.
