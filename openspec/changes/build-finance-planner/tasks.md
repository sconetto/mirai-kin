# Tasks — Build Finance Planner

## 1. Project scaffolding

- [x] 1.1 Initialize the Next.js (App Router) + TypeScript project with pnpm
- [x] 1.2 Configure Tailwind CSS and shadcn/ui base setup
- [x] 1.3 Add core dependencies (Drizzle, pg, zod, zod-to-openapi, openapi-typescript, pg-boss, next-intl)
- [x] 1.4 Set up Vitest and Playwright with a smoke test
- [x] 1.5 Add `.env.example`, `.gitignore`, ESLint, and Prettier config

## 2. Database schema and migrations

- [x] 2.1 Configure Drizzle with PostgreSQL and a migration script
- [x] 2.2 Define `users`, `accounts`, `categories`, `labels` schemas
- [x] 2.3 Define `transactions`, `fx_rates`, `budgets` schemas
- [x] 2.4 Define `investment_positions`, `investment_prices` schemas
- [x] 2.5 Define `debts`, `debt_schedule`, `recurring_transactions` schemas
- [x] 2.6 Write the seed script for the single user and base currencies

## 3. Service layer

- [x] 3.1 Implement account service (create/read/update/archive, balances)
- [x] 3.2 Implement category and label services
- [x] 3.3 Implement transaction service with multi-currency snapshot resolution
- [x] 3.4 Implement budget service with scope and spend tracking
- [x] 3.5 Implement investment service with price history and growth calculation
- [x] 3.6 Implement debt service with Price and SAC amortization schedule generation
- [x] 3.7 Implement projection service over recurring transactions and debt schedules

## 4. Authentication

- [x] 4.1 Implement password hashing and single-user login validation
- [x] 4.2 Implement session cookie issue/invalidate and middleware guard
- [x] 4.3 Implement API bearer-token authentication against `API_TOKEN`
- [x] 4.4 Add login/logout UI

## 5. REST API and OpenAPI contract

- [x] 5.1 Set up `/api/v1` routing and Zod validation helpers
- [x] 5.2 Generate the OpenAPI 3.1 document from Zod schemas and serve `/api/v1/openapi.json` and `/api/v1/docs`
- [x] 5.3 Implement accounts, categories, labels endpoints
- [x] 5.4 Implement transactions endpoints (CRUD + batch with idempotency)
- [x] 5.5 Implement budgets, investments, debts, and projections endpoints
- [x] 5.6 Implement the consistent error envelope and 401 handling
- [x] 5.7 Emit typed API client via openapi-typescript and add a contract test

## 6. FX rates and background job

- [x] 6.1 Implement the FX rate service with snapshot rate resolution (nearest-prior fallback)
- [x] 6.2 Integrate pg-boss and register the daily FX fetch job
- [x] 6.3 Implement retry with exponential backoff and jitter, with persisted state
- [x] 6.4 Implement backfill for missing dates on successful fetch

## 7. Web dashboard UI

- [x] 7.1 Implement the responsive app shell and navigation
- [x] 7.2 Implement accounts and transactions views
- [x] 7.3 Implement budgets view with spend versus budget
- [x] 7.4 Implement investments view with growth charts
- [x] 7.5 Implement debts view with amortization schedule
- [x] 7.6 Implement projections/cash-flow view
- [x] 7.7 Add charts (Recharts) for spending, balance, and growth

## 8. Data import

- [x] 8.1 Implement CSV parsing and column mapping
- [x] 8.2 Implement CSV import validation with per-row error reporting
- [x] 8.3 Implement import idempotency (fingerprint/key)
- [x] 8.4 Add the CSV import UI

## 9. Localization (i18n)

- [x] 9.1 Configure next-intl with locale routing for `/en` and `/pt-BR`
- [x] 9.2 Author en-US and pt-BR message catalogs
- [x] 9.3 Apply locale-aware date, number, and currency formatting throughout the UI

## 10. Knowledge module

- [x] 10.1 Set up MDX rendering with styled typography/callout/table components
- [x] 10.2 Create the glossary and article content structure (per-locale directories)
- [x] 10.3 Author initial glossary entries and sample articles in both locales
- [x] 10.4 Implement the learn section navigation and article pages

## 11. Docker Compose deployment

- [x] 11.1 Write the multi-stage Dockerfile with Next.js standalone output
- [x] 11.2 Write `docker-compose.yml` (app + PostgreSQL) with healthchecks and volume
- [x] 11.3 Wire the app entrypoint to run migrations before start
- [x] 11.4 Document `.env` requirements and a local quick-start in the README

## 12. Verification

- [x] 12.1 Add unit tests for amortization, FX snapshot resolution, idempotency, and CSV parsing
- [x] 12.2 Add e2e tests for login, transaction creation, CSV import, and budget view
- [x] 12.3 Verify `docker compose up --build` boots, migrates, and serves `/api/v1/docs`

## 13. Information architecture and navigation

- [x] 13.1 Reorganize navigation into Track (Overview, Spending, Invest, Forecast, Equity), Services (Brokerage, Tax, Financial Planner, Estate Planning), and Learn
- [x] 13.2 Add routes for Spending sub-tabs (Overview, Breakdown & budget, Transactions, Recurring, Reports), Reports, Insights, Equity, Brokerage, Tax, Financial Planner, and Estate Planning
- [x] 13.3 Add shared UI primitives for segmented tabs, date ranges, chart toggles, and summary strips
- [x] 13.4 Add insight, report, tax, estate, and planner labels and disclaimers to both locales

## 14. Import pipeline expansion

- [x] 14.1 Add `import_batches`, `import_rows`, and `import_profiles` schema plus migration
- [x] 14.2 Implement an OFX adapter that parses bank statements into staged rows
- [x] 14.3 Implement mapping profiles (save, reuse, edit) per source/account
- [x] 14.4 Implement staging, per-row validation, and a review/confirm UI
- [x] 14.5 Implement deduplication (fingerprint + fuzzy window) and a duplicate-resolution UI
- [x] 14.6 Implement brokerage CSV import (positions, lots, sales, dividends)
- [x] 14.7 Implement import history and file-hash/idempotency protection

## 15. Transaction review

- [x] 15.1 Add `review_status`, `is_deductible`, and `parent_transaction_id` columns plus migration
- [x] 15.2 Implement bulk recategorization and mark-reviewed actions
- [x] 15.3 Implement duplicate merging
- [x] 15.4 Implement splitting a transaction into parts
- [x] 15.5 Implement recurring detection, upcoming bills, and subscription review
- [x] 15.6 Rebuild the Transactions screen as a review surface with filters and bulk actions

## 16. Reports

- [x] 16.1 Implement the reports service for cash flow, income, expenses, transfers, and spending breakdown
- [x] 16.2 Add budget-vs-actual, net-worth, debt, and investment-performance reports
- [x] 16.3 Implement date ranges, filters, grouping, and base-currency aggregation
- [x] 16.4 Implement saved reports (create, list, reopen, rename, delete)
- [x] 16.5 Implement CSV export
- [x] 16.6 Implement period comparison (previous period and prior year)
- [x] 16.7 Build the report UI (segmented tabs, range picker, chart toggle, summary strip, period table)

## 17. Insights

- [x] 17.1 Define the insight type/severity/data/action contract and the insights service
- [x] 17.2 Implement rules for savings rate, budget variance, category spikes, upcoming bills, debt burden, allocation drift, net-worth trend, and cash-flow risk
- [x] 17.3 Implement acknowledgement, condition signatures, and resurfacing
- [x] 17.4 Build the Insights screen and dashboard insight cards
- [x] 17.5 Add localized insight text for both locales

## 18. Equity

- [x] 18.1 Add `net_worth_snapshots` schema plus migration
- [x] 18.2 Implement net-worth computation and composition by type and currency
- [x] 18.3 Add a pg-boss job that records net-worth snapshots
- [x] 18.4 Build the Equity screen with composition, trend chart, and drill-downs

## 19. Brokerage

- [x] 19.1 Add `brokerage_lots`, `brokerage_sales`, and `dividends` schema plus migration
- [x] 19.2 Implement positions, lots, and average-cost gains
- [x] 19.3 Implement allocation by instrument, currency, and account
- [x] 19.4 Implement dividends and include them in income reports
- [x] 19.5 Implement brokerage CSV import and manual entry
- [x] 19.6 Implement brokerage tax export
- [x] 19.7 Build the Brokerage screen

## 20. Financial planner

- [x] 20.1 Add `goals` and `scenarios` schema plus migration
- [x] 20.2 Implement goals CRUD, progress, and priority
- [x] 20.3 Implement required monthly contribution and emergency-fund runway
- [x] 20.4 Implement base/optimistic/pessimistic scenario comparison over projections
- [x] 20.5 Build the Financial Planner screen

## 21. Tax

- [x] 21.1 Add `categories.tax_treatment` and `is_essential` plus migration
- [x] 21.2 Implement tax summaries for income, deductible expenses, capital gains, and dividends
- [x] 21.3 Implement tax-year selection and base-currency conversion
- [x] 21.4 Implement CSV export for tax summaries
- [x] 21.5 Build the Tax screen with the no-advice disclaimer

## 22. Estate planning

- [x] 22.1 Add `estate_assets`, `beneficiaries`, and `estate_documents` schema plus migration
- [x] 22.2 Implement the asset/liability inventory and beneficiary shares
- [x] 22.3 Implement the document checklist and notes
- [x] 22.4 Implement CSV export
- [x] 22.5 Build the Estate Planning screen with the no-legal-advice disclaimer

## 23. Assistant

Moved to the dedicated `add-assistant` change.

## 24. Verification for the revised product

- [x] 24.1 Add unit tests for report aggregations
- [x] 24.2 Add unit tests for insight rules and acknowledgement resurfacing
- [x] 24.3 Add unit tests for required contribution and emergency runway
- [x] 24.4 Add unit tests for brokerage gains and tax classification
- [x] 24.5 Add e2e coverage for import -> review -> report -> insight
- [x] 24.6 Add e2e coverage for goals/scenarios and the estate inventory
- [x] 24.7 Verify Docker build and migrations for the expanded schema
