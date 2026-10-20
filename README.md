# Finance Planner

Self-hosted, multi-lingual (en-US / pt-BR) wealth-planning dashboard. It combines budgeting, investment growth, debt amortization (Price + SAC), multi-currency snapshots, projections, and a small finance knowledge library — with a first-class, agent-integrable REST API.

## Stack

- **Next.js 16** (App Router) + React 19 + TypeScript
- **PostgreSQL 17** with **Drizzle ORM**
- **pg-boss** for durable background jobs (daily FX fetch, retry + exponential backoff)
- **next-intl** for localization (`pt-BR`, `en`)
- **Tailwind CSS** + **Recharts**
- **Zod** + **zod-to-openapi** for the versioned `/api/v1` contract

## Quick start (Docker Compose)

```bash
cp .env.example .env      # then edit the values
docker compose up --build -d
```

Then open:

- App: <http://localhost:3100/pt-BR>
- API docs: <http://localhost:3100/api/v1/docs>
- OpenAPI JSON: <http://localhost:3100/api/v1/openapi.json>

The app container applies Drizzle migrations and seeds the single user + base categories on startup. Host port `3100` maps to the container's `3000` (change it in `docker-compose.yml` if needed).

### Environment variables

| Variable | Purpose | Default |
| --- | --- | --- |
| `DATABASE_URL` | Postgres connection string | — |
| `AUTH_USERNAME` | Single-user login name | `admin` |
| `AUTH_PASSWORD` | Login password (hashed at startup) | `admin` |
| `AUTH_PASSWORD_HASH` | Precomputed bcrypt hash (takes precedence) | — |
| `AUTH_SECRET` | Secret used to sign session cookies | dev default |
| `API_TOKEN` | Bearer token for `/api/v1` | — |
| `BASE_CURRENCY` | Reporting currency (ISO 4217) | `BRL` |
| `FX_SOURCE_URL` | FX provider (ECB via Frankfurter) | `https://api.frankfurter.app` |

## Local development

```bash
pnpm install
docker compose up -d db        # start only Postgres
cp .env.example .env           # set DATABASE_URL to localhost
pnpm dev
```

Useful scripts:

```bash
pnpm typecheck     # tsc --noEmit
pnpm lint          # eslint
pnpm test          # vitest unit tests
pnpm test:e2e      # playwright (requires a running app + DB)
pnpm db:generate   # generate a Drizzle migration
pnpm db:migrate    # apply migrations
pnpm db:seed       # seed user + categories + default account
```

## API

All mutating endpoints accept an `Idempotency-Key` header; repeated keys return the original result. Batch transaction creation accepts up to 50 items and returns per-item results.

```bash
curl -H "Authorization: Bearer $API_TOKEN" http://localhost:3100/api/v1/accounts
```

See `/api/v1/docs` for the full contract. Wallet MCP (BudgetBakers) can be used agent-side to parse/import data; the app itself only exposes its own REST API.

## Project layout

```
src/
  app/[locale]/        localized UI (dashboard, accounts, transactions, …)
  app/api/v1/          versioned REST API + OpenAPI
  db/                  Drizzle schema, connection, seed
  lib/                 auth, env, OpenAPI, amortization, formatting, jobs
  services/            domain logic shared by UI and API
content/               static MDX knowledge (per locale)
drizzle/               generated SQL migrations
openspec/              change proposal, design, specs, tasks
```

## Spec

This project is built from an OpenSpec change: see `openspec/changes/build-finance-planner/` (proposal, design, 13 capability specs, and tasks).
