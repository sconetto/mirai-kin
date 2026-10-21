# mirai-kin

**mirai-kin** (未来金 — “future funds”) is a self-hosted, multi-lingual (en-US / pt-BR) personal finance workspace built around **import → review → report → insight → plan**. Statements are imported once, cleaned up in a review queue, and turned into cash-flow reports, deterministic insights, net worth, brokerage, tax summaries, and a financial plan — with a first-class, agent-integrable REST API.

Repository: <https://github.com/sconetto/mirai-kin>

## Product

- **Track** — Overview, Insights, Spending (overview, transaction review, budgets, recurring, reports), Invest, Forecast, Equity.
- **Services** — Brokerage, Tax (Brazil-first summaries), Financial Planner, Estate Planning.
- **Learn** — glossary, guides, and articles.
- **Import** — CSV, OFX, brokerage CSV, and Wallet MCP-assisted imports with staging, deduplication, and review.

An optional in-app assistant is available when configured; it is disabled by default. Deterministic insights and the REST API work without it.

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
| `ASSISTANT_ENABLED` | Enable the optional in-app assistant (must be `true`) | `false` |
| `ASSISTANT_PROVIDER` | Provider label (OpenAI-compatible adapter) | `openai-compatible` |
| `ASSISTANT_MODEL` | Model id | — |
| `ASSISTANT_API_KEY` | Server-only provider key (not needed for local endpoints) | — |
| `ASSISTANT_BASE_URL` | OpenAI-compatible base URL | OpenAI when provider is `openai` |

Backup and restore: [docs/backup.md](docs/backup.md).

The assistant is **disabled by default** and sends no data to any provider until it is enabled and used. See [docs/assistant.md](docs/assistant.md) for the data flow, retention, local-model setup, and privacy notes.

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

For source-backed imports, send the optional `externalSource` and `externalId` fields on accounts, categories, labels, and transactions. Replaying the same pair returns the existing row; first-time replays adopt matching legacy rows before creating anything new. Use `externalSource: "wallet_mcp"` and the Wallet record/entity IDs.

```bash
curl -H "Authorization: Bearer $API_TOKEN" http://localhost:3100/api/v1/accounts
```

See `/api/v1/docs` for the full contract. Wallet MCP (BudgetBakers) can be used agent-side to parse/import data; the app itself only exposes its own REST API.

## Project layout

```
src/
  app/[locale]/        localized UI (overview, spending, reports, insights, equity, …)
  app/api/v1/          versioned REST API + OpenAPI
  db/                  Drizzle schema, connection, seed
  lib/                 auth, env, OpenAPI, amortization, planner math, formatting, jobs
  services/            domain logic (accounts, transactions, imports, reports, insights,
                       equity, recurring, brokerage, tax, planner, estate)
content/               static MDX knowledge (per locale)
drizzle/               generated SQL migrations
openspec/              change proposal, design, 21 capability specs, tasks
```

## Spec

This project is built from an OpenSpec change: see `openspec/changes/build-finance-planner/` (proposal, design, 13 capability specs, and tasks).
