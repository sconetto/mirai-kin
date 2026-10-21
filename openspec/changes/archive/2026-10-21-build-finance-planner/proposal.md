# Build Finance Planner

## Why

Personal finance tools tend to be either ledgers that demand constant data entry or dashboards that show a snapshot without explaining it. Neither answers the questions that matter: where the money went, what changed, whether the plan is on track, and what to do next. Existing open-source options (Actual Budget, Firefly III, Ghostfolio, Maybe Finance) each cover a slice — budgeting, or investments, or reporting — and none connects cash flow, net worth, brokerage, tax, and long-term planning in a self-hosted, import-first workspace.

This change builds that workspace: a self-hosted, multi-lingual (en-US / pt-BR) finance planner that ingests statements once, keeps a clean reviewed ledger, and turns it into reports, insights, and a plan across income, spending, investments, debt, equity, brokerage, tax, financial planning, and estate planning. The product is report- and insight-first; manual transaction entry exists for corrections, not as the primary workflow.

## What Changes

- **Import is the primary path.** CSV, OFX, Wallet MCP-assisted, and brokerage CSV imports land in a staging/review queue with mapping profiles, deduplication, and idempotency.
- **Transactions become a review surface.** Search, bulk recategorize, merge duplicates, split, mark reviewed, and detect recurring transactions/bills.
- **A report suite** covers cash flow, income, expenses, transfers, spending breakdown, budget vs actual, net worth, debt, and investment performance, with presets/custom ranges, filters, saved reports, period comparison, and CSV export.
- **A deterministic insights engine** surfaces savings rate, budget variance, category spikes, upcoming bills, debt burden, allocation drift, and net-worth trends; an optional in-app assistant ("Ask anything") arrives in a later phase.
- **Equity** adds net worth composition and snapshot history.
- **Brokerage** adds positions, cost-basis lots, allocation, realized/unrealized gains, dividends, CSV/manual import, and tax exports.
- **Tax (Brazil-first)** adds income, deductible-expense, capital-gains, and dividend summaries with exports — no tax calculation or filing.
- **Financial planning** adds goals, base/optimistic/pessimistic scenarios, goal contributions, and emergency-fund runway.
- **Estate planning** adds an asset/liability and beneficiary inventory, document checklist, notes, and export — no legal documents or advice.
- **Navigation** is reorganized into Track (Overview, Spending, Invest, Forecast, Equity), Services (Brokerage, Tax, Financial Planner, Estate Planning), and Learn.
- The existing foundation (accounts, categories, labels, FX snapshots, budgets, investments, debts, projections, REST API, MDX knowledge, i18n) is retained.

## Capabilities

### New Capabilities

- `auth`: Single-user authentication via environment-credentialed login (session cookie) and bearer-token authentication for the API.
- `accounts`: Account management across multiple currencies, account types (including property/asset and liability types), opening balances, and archival.
- `categorization`: Hierarchical income/expense categories, labels, and a tax classification (deductible / tax-relevant).
- `transactions`: Reviewed transaction records — amount, currency, snapshot base-amount, date/time, notes, payment type, account, counterparty, labels — with an import-first review workflow (bulk recategorize, merge, split, reviewed status) and recurring detection.
- `fx-rates`: Exchange-rate storage, snapshot resolution, and a daily fetch job with retry and exponential backoff.
- `budgets`: Budgets with account/category/label scope, spend tracking, variance, alerts, and period comparison.
- `investments`: Investment positions with price history and growth tracking.
- `debts`: Debt instruments (installments, financed goods, mortgage, loan) with Price and SAC amortization schedules.
- `projections`: Recurring transactions and deterministic future cash-flow forecasts with scenario assumptions.
- `data-import`: An import pipeline for CSV, OFX, Wallet MCP-assisted, and brokerage files, with mapping profiles, staging/review, deduplication, and idempotency.
- `api`: A versioned REST API with an OpenAPI contract, docs, batch operations, and idempotency, covering every domain including reports, insights, and planning.
- `knowledge`: Static-Markdown educational content — glossary, guides, and planning explainers — with rich rendering and contextual links.
- `i18n`: English (US) and Portuguese (Brazil) localization.
- `reports`: A report suite (cash flow, income, expenses, transfers, spending breakdown, budget vs actual, net worth, debt, investments) with ranges, filters, summaries, saved reports, comparison, and CSV export.
- `insights`: A deterministic insights engine with typed, severity-ranked, actionable insights over the user's data.
- `assistant`: An optional in-app "Ask anything" assistant grounded in the app's services, disabled by default, read-only by default, with privacy and advice disclaimers.
- `equity`: Net worth as assets minus liabilities, with composition and dated snapshot history.
- `brokerage`: Brokerage positions with cost-basis lots, allocation, realized/unrealized gains, dividends, CSV/manual import, and tax export.
- `tax`: Brazil-first tax-relevant summaries (income, deductible expenses, capital gains, dividends) and exports, with no tax calculation or filing.
- `financial-planner`: Goals, base/optimistic/pessimistic scenarios, required contributions, and emergency-fund runway.
- `estate-planning`: An asset/liability and beneficiary inventory, document checklist, notes, and export, with no legal advice or documents.

### Modified Capabilities

None — this is the initial build; behavior changes to transactions, budgets, and imports are captured in their capability specs.

## Impact

- **New codebase areas**: report, insight, equity, brokerage, tax, planner, estate, and assistant services; new localized screens and a reorganized navigation.
- **Data model**: adds `net_worth_snapshots`, `saved_reports`, `insight_acknowledgements`, `brokerage_lots`, `dividends`, `goals`, `scenarios`, `estate_assets`, `beneficiaries`, `estate_documents`, `import_profiles`, and (phase 2) `assistant_conversations`.
- **Dependencies**: `ai` SDK plus a configurable provider for the assistant; an OFX parser; CSV/PDF export utilities.
- **API**: expands `/api/v1` with reports, insights, goals, scenarios, brokerage, tax, and estate endpoints.
- **Tests**: unit tests for report aggregations and insight rules; planner and amortization tests; e2e for import, reports, and insights.
- **Privacy/liability**: tax and estate areas carry explicit "not advice" disclaimers; the assistant is opt-in and never sends data when disabled.
