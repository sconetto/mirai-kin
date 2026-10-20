# Tasks — Build Finance Planner

## 1. Project scaffolding

- [ ] 1.1 Initialize the Next.js (App Router) + TypeScript project with pnpm
- [ ] 1.2 Configure Tailwind CSS and shadcn/ui base setup
- [ ] 1.3 Add core dependencies (Drizzle, pg, zod, zod-to-openapi, openapi-typescript, pg-boss, next-intl)
- [ ] 1.4 Set up Vitest and Playwright with a smoke test
- [ ] 1.5 Add `.env.example`, `.gitignore`, ESLint, and Prettier config

## 2. Database schema and migrations

- [ ] 2.1 Configure Drizzle with PostgreSQL and a migration script
- [ ] 2.2 Define `users`, `accounts`, `categories`, `labels` schemas
- [ ] 2.3 Define `transactions`, `fx_rates`, `budgets` schemas
- [ ] 2.4 Define `investment_positions`, `investment_prices` schemas
- [ ] 2.5 Define `debts`, `debt_schedule`, `recurring_transactions` schemas
- [ ] 2.6 Write the seed script for the single user and base currencies

## 3. Service layer

- [ ] 3.1 Implement account service (create/read/update/archive, balances)
- [ ] 3.2 Implement category and label services
- [ ] 3.3 Implement transaction service with multi-currency snapshot resolution
- [ ] 3.4 Implement budget service with scope and spend tracking
- [ ] 3.5 Implement investment service with price history and growth calculation
- [ ] 3.6 Implement debt service with Price and SAC amortization schedule generation
- [ ] 3.7 Implement projection service over recurring transactions and debt schedules

## 4. Authentication

- [ ] 4.1 Implement password hashing and single-user login validation
- [ ] 4.2 Implement session cookie issue/invalidate and middleware guard
- [ ] 4.3 Implement API bearer-token authentication against `API_TOKEN`
- [ ] 4.4 Add login/logout UI

## 5. REST API and OpenAPI contract

- [ ] 5.1 Set up `/api/v1` routing and Zod validation helpers
- [ ] 5.2 Generate the OpenAPI 3.1 document from Zod schemas and serve `/api/v1/openapi.json` and `/api/v1/docs`
- [ ] 5.3 Implement accounts, categories, labels endpoints
- [ ] 5.4 Implement transactions endpoints (CRUD + batch with idempotency)
- [ ] 5.5 Implement budgets, investments, debts, and projections endpoints
- [ ] 5.6 Implement the consistent error envelope and 401 handling
- [ ] 5.7 Emit typed API client via openapi-typescript and add a contract test

## 6. FX rates and background job

- [ ] 6.1 Implement the FX rate service with snapshot rate resolution (nearest-prior fallback)
- [ ] 6.2 Integrate pg-boss and register the daily FX fetch job
- [ ] 6.3 Implement retry with exponential backoff and jitter, with persisted state
- [ ] 6.4 Implement backfill for missing dates on successful fetch

## 7. Web dashboard UI

- [ ] 7.1 Implement the responsive app shell and navigation
- [ ] 7.2 Implement accounts and transactions views
- [ ] 7.3 Implement budgets view with spend versus budget
- [ ] 7.4 Implement investments view with growth charts
- [ ] 7.5 Implement debts view with amortization schedule
- [ ] 7.6 Implement projections/cash-flow view
- [ ] 7.7 Add charts (Recharts) for spending, balance, and growth

## 8. Data import

- [ ] 8.1 Implement CSV parsing and column mapping
- [ ] 8.2 Implement CSV import validation with per-row error reporting
- [ ] 8.3 Implement import idempotency (fingerprint/key)
- [ ] 8.4 Add the CSV import UI

## 9. Localization (i18n)

- [ ] 9.1 Configure next-intl with locale routing for `/en` and `/pt-BR`
- [ ] 9.2 Author en-US and pt-BR message catalogs
- [ ] 9.3 Apply locale-aware date, number, and currency formatting throughout the UI

## 10. Knowledge module

- [ ] 10.1 Set up MDX rendering with styled typography/callout/table components
- [ ] 10.2 Create the glossary and article content structure (per-locale directories)
- [ ] 10.3 Author initial glossary entries and sample articles in both locales
- [ ] 10.4 Implement the learn section navigation and article pages

## 11. Docker Compose deployment

- [ ] 11.1 Write the multi-stage Dockerfile with Next.js standalone output
- [ ] 11.2 Write `docker-compose.yml` (app + PostgreSQL) with healthchecks and volume
- [ ] 11.3 Wire the app entrypoint to run migrations before start
- [ ] 11.4 Document `.env` requirements and a local quick-start in the README

## 12. Verification

- [ ] 12.1 Add unit tests for amortization, FX snapshot resolution, idempotency, and CSV parsing
- [ ] 12.2 Add e2e tests for login, transaction creation, CSV import, and budget view
- [ ] 12.3 Verify `docker compose up --build` boots, migrates, and serves `/api/v1/docs`
