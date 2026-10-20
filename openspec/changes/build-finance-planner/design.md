# Design — Build Finance Planner

## Context

Greenfield, self-hosted wealth-planning web application. Single maintainer is the first user, but the project is intended to be generic enough for others to self-host. The app must combine budgeting, investment growth tracking, debt amortization, and multi-currency reporting — a combination no single existing OSS tool provides. Deployment target is a home lab via Docker Compose. Primary language is Portuguese (Brazil) with English (US) as the secondary language.

Key constraints established with the user:

- Next.js full-stack + PostgreSQL, latest stable dependencies.
- Web dashboard only, but fully responsive (no separate mobile app).
- Multi-currency with **snapshot** base-amounts for historically consistent reports.
- Debt amortization must support both **Price** and **SAC** methods.
- Single-user auth (env credentials) + API-token auth.
- A versioned, documented REST API is a first-class deliverable (agent integration surface).
- Knowledge module is static markdown, rendered richly.
- CSV import first; OFX deferred.
- FX fetch is a durable background job with retry + exponential backoff (pg-boss).

## Goals / Non-Goals

**Goals:**

- A single deployable unit (`docker compose up`) that boots app + PostgreSQL and migrates the schema on start.
- A service layer that is shared by the web UI (server components) and the REST API so the API cannot drift from UI behavior.
- A versioned OpenAPI contract generated from Zod schemas, with interactive docs.
- Historically consistent multi-currency reporting via snapshot amounts.
- Correct Brazilian debt amortization (Price and SAC).
- en-US and pt-BR localization of the entire UI.

**Non-Goals:**

- Multi-user accounts, roles, or teams (single user for now).
- Native mobile app.
- Native bank-sync integrations (GoCardless/Plaid) — not in this phase.
- OFX import in the first milestone (designed-for, implemented later).
- Real-time collaborative editing or web sockets.
- A DB-backed CMS for the knowledge module.

## Decisions

### 1. Architecture: API-first, shared service layer

The app is a Next.js App Router project. Both the web UI and the `/api/v1/*` REST API call the same **service layer** (plain TypeScript modules over Drizzle). Server components call services directly (no HTTP round-trip); route handlers wrap the same functions. This guarantees the public API and the dashboard behave identically.

```
Next.js App Router
  ├─ (dashboard)/…        → server components → service layer
  └─ app/api/v1/*/route   → route handlers   → service layer
                                    ▲
                     service layer (Drizzle + Zod validation)
                                    │
                                PostgreSQL
```

*Alternatives considered:* Hono mounted as a separate API (adds a second framework; rejected to keep a single runtime). UI calling the API over HTTP from server components (adds latency and self-request complexity; rejected).

### 2. Stack

| Concern | Choice | Rationale |
|---|---|---|
| Language | TypeScript (strict) | type safety across API + UI |
| Runtime | Node.js 22 LTS | current LTS |
| Package manager | pnpm | fast, deterministic |
| Framework | Next.js (App Router), React 19 | user choice, current |
| ORM | Drizzle ORM | SQL-first, lightweight, typed, no codegen bloat |
| Validation | Zod | single source for validation + types + OpenAPI |
| API contract | `zod-to-openapi` → OpenAPI 3.1 + Swagger UI at `/api/v1/docs` | contract-first |
| Client types | `openapi-typescript` | typed clients for tests/external consumers |
| Jobs | `pg-boss` (Postgres-backed) | durable retry/backoff, no new infra |
| Styling/UI | Tailwind CSS + shadcn/ui | responsive, composable |
| Charts | Recharts | dashboard-grade |
| i18n | next-intl | App Router standard, en-US + pt-BR |
| Knowledge | MDX (next-mdx-remote or `mdx-components`) | rich static content |
| Testing | Vitest (unit) + Playwright (e2e) | current defaults |

### 3. Data model

Drizzle schema, PostgreSQL 17. Core tables (types abbreviated):

- `users` — single row enforced by migration/seed. `id`, `username`, `password_hash`.
- `accounts` — `id`, `name`, `type` (checking/savings/credit_card/investment/loan/mortgage/asset/cash), `currency` (ISO 4217), `opening_balance`, `archived`.
- `categories` — `id`, `name`, `type` (income/expense), `parent_id` (nullable, hierarchy), `color`, `icon`.
- `labels` — `id`, `name` (unique).
- `transactions` — `id`, `account_id`, `category_id` (nullable), `amount` (signed, account currency), `currency`, `base_currency`, `base_amount` (snapshot), `fx_rate_id` (nullable), `record_date`, `created_at`, `updated_at`, `note`, `payment_type`, `counterparty`, `label_ids` (array or join table).
- `fx_rates` — `id`, `base`, `quote`, `rate`, `date`, unique(`base`,`quote`,`date`).
- `budgets` — `id`, `name`, `period_type` (monthly/annual/custom), `start_date`, `end_date` (nullable), `amount`, scope via join tables `budget_accounts`, `budget_categories`, `budget_labels`.
- `investment_positions` — `id`, `account_id`, `symbol`, `name`, `instrument_type` (stock/etf/fund/bond/crypto), `quantity`, `avg_cost`, `currency`.
- `investment_prices` — `id`, `position_id`, `date`, `price`, `currency`.
- `debts` — `id`, `account_id`, `name`, `type` (installment/financed/mortgage/loan/credit_card), `principal`, `interest_rate` (annual %), `term` (periods), `start_date`, `payment_frequency`, `amortization_method` (price/sac/custom), `grace_periods`.
- `debt_schedule` — generated rows: `id`, `debt_id`, `period_number`, `due_date`, `payment`, `interest`, `principal`, `balance`. Re-computed (not hand-edited) when a debt's inputs change.
- `recurring_transactions` — `id`, `account_id`, `category_id`, `amount`, `currency`, `frequency` (daily/weekly/monthly/yearly), `start_date`, `end_date` (nullable), `note`, `payment_type`.
- `api_keys` (deferred) — revocable tokens; v1 uses env `API_TOKEN`.

`pg_boss` manages its own tables (auto-created).

### 4. Multi-currency snapshot

Each transaction stores its `amount`/`currency` (as entered) **and** a `base_amount`/`base_currency` snapshot computed from the FX rate active on `record_date`. Reports aggregate `base_amount`, so historical reports never change when rates move. If no rate exists for `record_date`, the nearest prior rate is used (with the source rate captured via `fx_rate_id`). Corrections to a transaction re-resolve its snapshot.

*Alternatives considered:* convert on-the-fly at report time (rejected — a transaction's BRL value would change over time, violating historical consistency).

### 5. FX fetch job

- Source: Frankfurter API (ECB reference rates, free, no key), covering BRL/EUR/USD (and more).
- Cadence: daily (business days; ECB does not publish on weekends/holidays — job tolerates gaps and backfills from historical data).
- Queue: pg-boss with a scheduled job and **exponential backoff + jitter** on failure, capped retries. Workers run in the app process (no extra container).
- Rates stored as `fx_rates` rows keyed by `(base, quote, date)`; fetched for every currency pair the user actually holds (derived from accounts), plus base currency.

### 6. Authentication

- **Web**: single user. `AUTH_USERNAME` + `AUTH_PASSWORD_HASH` (bcrypt/argon2) env vars. Login route validates and sets an httpOnly, signed session cookie (JWT or opaque session in DB). Middleware guards all dashboard routes.
- **API**: bearer token via `Authorization: Bearer <token>`, validated against env `API_TOKEN` (v1). Revocable `api_keys` table is a deferred follow-up.
- Passwords never stored in plaintext; secrets only via environment variables / `.env` (git-ignored).

### 7. REST API contract

- Base path `/api/v1/*`; versioning via URL prefix; non-breaking additive changes only within v1.
- OpenAPI 3.1 generated from Zod schemas via `zod-to-openapi`; served at `/api/v1/docs` (Swagger UI) and `/api/v1/openapi.json`.
- Batch endpoints: `POST /api/v1/transactions` accepts an array (max 50) and returns per-item results (`inputIndex`, `success`, `error`, `id`).
- Idempotency: `Idempotency-Key` header on mutating endpoints; duplicate keys return the original result instead of re-writing.
- Consistent error envelope: `{ error: { code, message, fields? } }`.
- Typed client generated via `openapi-typescript` for tests and external consumers.

### 8. Debt amortization

`debt_schedule` is generated from `debts` using the configured `amortization_method`:

- **Price (tabela Price)**: constant payment; interest computed on declining balance; principal portion grows over time.
- **SAC (Sistema de Amortização Constante)**: constant principal portion; interest declines; payment decreases over time.
- **custom**: manual schedule (imported or hand-entered rows).

Payments may be monthly (default) with configurable `payment_frequency` and grace periods. Recomputing the schedule is idempotent and triggered on debt create/update.

### 9. Projections

Future cash flow = current account balances + recurring transaction series + debt schedules + budget burn. `recurring_transactions` seed a projection engine that expands each series over a configurable horizon (default 12 months). Projections are computed on demand and cached per (account, horizon).

### 10. Knowledge module

Static `.mdx` files under `content/` (glossary + articles), rendered at build time with `mdx-components` and styled with shadcn/ui primitives (typography, callouts, tables). A `/learn` section lists and displays content. Localization: content authored in both languages (per-locale content directories).

### 11. i18n

`next-intl` with locale routing (`/en` and `/pt-BR`), message catalogs in `messages/{locale}.json`, server-component + client-component translation. All UI strings, dates, and currency formatting are locale-aware (`Intl.NumberFormat`/`Intl.DateTimeFormat`).

### 12. Deployment

`docker-compose.yml`:

- `db`: `postgres:17-alpine`, named volume, `healthcheck` (pg_isready), env for POSTGRES_USER/PASSWORD/DB.
- `app`: multi-stage build (deps → build with `output: 'standalone'` → slim runtime). Runs Drizzle migrations on start (entrypoint), then starts the Next.js server. Depends on `db` being healthy. Exposes port 3000.
- pg-boss workers co-located in the `app` process; no separate container.
- Env via `.env` (git-ignored) + `.env.example` committed.

Reverse proxy (Caddy) is explicitly optional and deferred; for local testing the app is reached directly at `localhost:3000`.

### 13. Testing

- Vitest for service-layer unit tests (amortization, FX snapshot resolution, idempotency, CSV parsing).
- Playwright for e2e (login, create transaction, CSV import, budget view).
- Contract tests against the generated OpenAPI client.

## Risks / Trade-offs

- [Drizzle vs Prisma migrations on startup] → Pin Drizzle `migrate()` in the entrypoint; if a migration fails, container exits non-zero and healthcheck fails fast rather than serving a half-migrated schema.
- [pg-boss in-process workers vs app restart mid-backoff] → pg-boss state lives in Postgres, so scheduled/retry state survives restarts; that is the whole point of choosing it over node-cron.
- [ECB FX gaps on weekends/holidays] → Snapshot resolver falls back to nearest prior rate; job backfills historical dates on next run.
- [Snapshot rate at transaction time vs today's rate ambiguity] → Always resolve against `record_date`, never "now", so historical reports are stable; documented in the API.
- [Single-user model growing to multi-user] → Service layer scopes queries by a single implicit user id; introduce explicit user_id early so adding users later is an additive migration, not a rewrite.
- [OFX parsing complexity (encodings, bank dialects)] → Explicitly deferred; CSV path and the API contract are stable regardless of parser.
- [Knowledge content authoring in two languages] → Per-locale content directories keep fallback simple (missing locale falls back to default).

## Migration Plan

Greenfield — no existing data to migrate. Initial deployment:

1. `docker compose up --build` on the host.
2. `app` entrypoint runs Drizzle migrations, seeds the single user (from env), then starts the server.
3. Verify `/api/v1/docs` renders and `/login` works.

Rollback: for the initial release there is no prior version; a bad migration is fixed forward (new migration) rather than rolled back.

## Open Questions

- FX provider: Frankfurter (ECB) is the default. If the user later needs currencies ECB does not publish (e.g., crypto or some exotics), we may add a second provider or self-host Frankfurter.
- API key management (revocable `api_keys`) is deferred; confirm the UI/flow when we build it.
- Knowledge module search (full-text) is not in scope; confirm if needed later.
