# Build Finance Planner

## Why

There is no single open-source, self-hosted tool that covers budgeting, investment growth, debt amortization, and multi-currency tracking together — existing options (Actual Budget, Firefly III, Ghostfolio, Maybe Finance) each solve only part of the problem. We are building a self-hosted, multi-lingual (en-US / pt-BR) wealth-planning dashboard with a first-class, agent-integrable REST API, starting from scratch with modern, up-to-date dependencies.

## What Changes

- Introduces a new self-hosted web application (Next.js full-stack + PostgreSQL) deployable via Docker Compose.
- Provides a versioned, documented REST API (`/api/v1`) as the primary integration surface for external agents and systems, including Wallet MCP-assisted import.
- Implements core financial domain: accounts, hierarchical categories, labels, transactions (with multi-currency snapshot amounts), budgets, investments, debts (Price + SAC amortization), projections, and exchange rates.
- Adds single-user authentication (env-credentialed login) plus API-token authentication for programmatic access.
- Adds transaction import via CSV (OFX deferred to a later phase).
- Adds an educational "knowledge" module (static markdown: finance glossary and articles) with rich rendering.
- Adds English (US) and Portuguese (Brazil) localization throughout.
- Runs a daily foreign-exchange fetch job (pg-boss) with retry and exponential backoff.

## Capabilities

### New Capabilities

- `auth`: Single-user authentication via environment-credentialed login (session cookie) and bearer-token authentication for the API.
- `accounts`: Account management across multiple currencies, account types, opening balances, and archival.
- `categorization`: Hierarchical income/expense categories and free-form labels (tags).
- `transactions`: Core transaction records — amount, currency, snapshot base-amount, date/time, notes, payment type, account, counterparty, and labels.
- `fx-rates`: Exchange-rate storage plus a daily fetch job with retry and exponential backoff.
- `budgets`: Budgets with account/category/label scope and spend tracking.
- `investments`: Investment positions with price history and growth tracking.
- `debts`: Debt instruments (installments, financed goods, mortgage, loan) with Price and SAC amortization schedules.
- `projections`: Recurring transactions and future cash-flow forecasts.
- `data-import`: Transaction import from CSV (OFX designed-for but deferred).
- `api`: Versioned REST API with an OpenAPI contract, interactive docs, batch operations, and idempotency.
- `knowledge`: Static-markdown educational content (finance glossary and articles) with rich rendering.
- `i18n`: English (US) and Portuguese (Brazil) localization.

### Modified Capabilities

None — this is the initial build.

## Impact

- **New codebase**: Next.js App Router (TypeScript) application, new PostgreSQL database.
- **Dependencies**: `next`, `react`, `drizzle-orm`, `pg`, `zod`, `zod-to-openapi`, `openapi-typescript`, `pg-boss`, `next-intl`, Tailwind CSS, `shadcn/ui`, Recharts, `mdx`, Vitest, Playwright.
- **Infrastructure**: `docker-compose.yml` (app + PostgreSQL), Drizzle migrations, environment variables for credentials, API token, and FX configuration.
- **External service**: ECB reference rates via the Frankfurter API (free, no key) for daily exchange rates.
- **Integration**: Wallet MCP (agent-side) used to import/parse data during development, writing through the app's REST API.
