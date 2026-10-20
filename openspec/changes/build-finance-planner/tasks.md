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
- [ ] 5.7 Emit typed API client via openapi-typescript and add a contract test

## 6. FX rates and background job

- [x] 6.1 Implement the FX rate service with snapshot rate resolution (nearest-prior fallback)
- [x] 6.2 Integrate pg-boss and register the daily FX fetch job
- [x] 6.3 Implement retry with exponential backoff and jitter, with persisted state
- [x] 6.4 Implement backfill for missing dates on successful fetch

## 7. Web dashboard UI

- [x] 7.1 Implement the responsive app shell and navigation
- [x] 7.2 Implement accounts and transactions views
- [x] 7.3 Implement budgets view with spend versus budget
- [ ] 7.4 Implement investments view with growth charts
- [x] 7.5 Implement debts view with amortization schedule
- [x] 7.6 Implement projections/cash-flow view
- [ ] 7.7 Add charts (Recharts) for spending, balance, and growth

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
