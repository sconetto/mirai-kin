# Design — Add Operational Foundation

## Context

The import-first foundation (`build-finance-planner`) is implemented and has been exercised with four months of real Wallet data. The data exposed four structural gaps: transfers are only a `paymentType` tag, imported accounts have no opening balances or reconciliation, categorization and recurring bills are manual, and there is no settings surface or backup/export. This change hardens the foundation before adding more analysis.

## Goals / Non-Goals

**Goals:**

- Model transfers as paired legs with cross-currency support, and make reporting transfer-aware.
- Capture opening balances and support statement reconciliation and credit-card cycles.
- Add a data-quality surface for uncategorized records, duplicates, unpaired transfers, missing FX, stale prices, and unreconciled accounts.
- Add deterministic transaction rules and recurring-bill management.
- Add an in-app settings surface for non-secret preferences.
- Add scheduled backups, a full data export, and a documented restore.

**Non-Goals:**

- Bank-sync integrations, multi-user/roles, tax calculation/filing, legal documents.
- In-app restore in v1 (documented CLI restore only).
- Regex or scripted rules (deterministic matching only).
- Encrypting backups with a passphrase in v1 (optional follow-up).
- Dark mode beyond a `system` preference if the token set supports it.

## Decisions

### 1. Transfer model

- New `transfers` table: `id`, `date`, `fromAccountId`, `toAccountId`, `amount`, `currency`, `counterAmount`, `counterCurrency`, `rate`, `note`, `status` (`paired | unpaired`), timestamps.
- `transactions.transferId` (nullable) references `transfers.id`. The out leg and in leg share the transfer id.
- Cross-currency: the out leg uses the source amount/currency, the in leg uses the counter amount/currency, and the transfer stores the applied rate.
- `paymentType = 'transfer'` remains as a display hint for legacy data, but `transferId` is the source of truth.

*Alternatives considered:* a `transfer_id` string on transactions only (no entity) — simpler but cannot store the rate/counter-amount or status. Rejected.

### 2. Pairing and backfill

- Automatic pairing on import: match opposite legs on different accounts with equal amounts and dates within a configurable window (default ±3 days); if currencies differ, match using the counter-amount/FX rate within tolerance.
- Low-confidence or ambiguous pairs are left unpaired and surfaced in the data-quality view; the user can pair manually.
- Manual pair/unpair endpoints: pair two transactions, or unpair a transfer (both legs become regular records).
- Backfill: scan existing `paymentType = 'transfer'` records and pair heuristically; report paired/unpaired counts. Unpaired records remain flagged.

### 3. Transfer-aware reporting

- Income/expense reports exclude `transferId` records (not just the `paymentType` tag).
- A transfers report counts each pair once, using the out leg's amount (or the out leg's base amount for cross-currency).
- Net worth is unchanged: both legs net across accounts.
- The review and data-quality views show transfer status and pairing.

### 4. Reconciliation and opening balances

- `accounts` gains `statementCloseDay`, `dueDay`, `creditLimit` (nullable) for credit-card cycles.
- `account_reconciliations`: `id`, `accountId`, `date`, `statementBalance`, `computedBalance`, `difference`, `status` (`open | reconciled | discrepancy`), `note`.
- Import can accept an opening balance or a current balance; when a current balance is supplied, the opening balance is derived as `current - sum(imported legs)`. Accounts without an opening balance are flagged.
- Reconciliation flow: enter the statement balance for a date; the system computes the balance from opening + transactions up to that date; the difference and status are stored; history is listed per account.
- Credit-card statements are computed from the cycle fields and transactions; no separate statement table in v1.

### 5. Data-quality dashboard

- Aggregates: uncategorized records, potential duplicates, unpaired transfers, transactions without an FX rate (non-base), stale investment prices (no price in 30 days), accounts without an opening balance, and import batches with errors.
- Each item links to the filtered list or the reconciliation/import screen.
- The dashboard is read-only; fixes happen in the relevant screen.

### 6. Rules engine

- `transaction_rules`: `id`, `name`, `priority`, `enabled`, `conditions` (JSONB), `actions` (JSONB), timestamps.
- Conditions: `counterparty` (contains/equals), `note` (contains), `amount` (range), `accountId`, `paymentType`, `categoryId`. All conditions are ANDed.
- Actions: `categoryId`, `labelIds`, `markReviewed`, `isDeductible`.
- Evaluation: enabled rules ordered by priority; the first match applies its category and merges labels/flags. A preview/test endpoint reports matches without writing.
- Apply on import: during staging/commit, unmatched rows are evaluated; the review UI shows the proposed rule and category.
- Apply to existing: preview count + run over a filtered set; results are auditable (rule id stored on the transaction? Add `appliedRuleId` nullable for traceability).
- No regex/scripting in v1; deterministic matching keeps behavior explainable.

### 7. Recurring management

- `recurring_detections`: `id`, `key`, `label`, `cadence`, `averageAmount`, `currency`, `lastDate`, `nextExpected`, `confidence`, `status` (`detected | confirmed | ignored`), timestamps.
- The detection service upserts candidates; the UI can confirm (creating/linking a `recurring_transactions` row), ignore, or edit the next date/amount.
- `recurring_transactions` gains `detectionId` and `source` (`manual | detected`).
- Insights (`upcoming_bill`) use confirmed and detected candidates; ignored ones are excluded.

### 8. Settings

- `settings` key/value table (`key` text PK, `value` JSONB, `updatedAt`).
- Keys: `baseCurrency`, `timezone`, `firstDayOfMonth`, `defaultLocale`, `theme` (`light | system`), `fxProvider`, `assistant` (`enabled`, `provider`, `model`, `baseUrl`), `backup` (`enabled`, `schedule`, `retentionDays`).
- Secrets (DB URL, API token, assistant API key) stay in environment variables; the settings UI shows their status read-only and never renders values.
- Validation: ISO currency, IANA timezone, day 1–31, theme enum, cron for backups.
- Settings override non-secret defaults; `getEnv` remains the source for secrets.
- The settings page has General, Localization, Appearance, FX, Assistant, and Data/backup sections.

### 9. Backups

- Add `postgresql-client` to the app image; a pg-boss job `backup-daily` runs `pg_dump -Fc` to a mounted `/backups` volume and records a `backups` row (`filename`, `sizeBytes`, `status`, `createdAt`).
- Default schedule 03:00 daily; retention 14 days; both configurable via settings.
- After the dump, verify the file is non-empty and `pg_restore --list` succeeds; record success/failure.
- Backups are not exposed by the web server; a read-only listing/download is available to the authenticated user.
- Encryption is a documented future option; v1 relies on volume permissions.

### 10. Export and restore

- `/api/v1/export` streams a ZIP (via `archiver`) containing JSON files per domain (accounts, transactions, categories, budgets, investments, debts, goals, estate, settings minus secrets) and a manifest.
- UI: a "Download full export" action on the Data settings section.
- Restore is a documented CLI procedure: stop the app, `pg_restore --clean --if-exists -d $DATABASE_URL backup.dump`, start the app; a `scripts/restore.sh` wraps it with confirmation.
- No in-app restore in v1; a restore endpoint that overwrites the database is too risky for a web UI.

## Risks / Trade-offs

- [Transfer pairing false positives] → require manual confirmation for low-confidence pairs; preview; unpair is reversible.
- [Cross-currency pairing] → match with counter-amount/rate tolerance; store the applied rate; leave ambiguous pairs unpaired.
- [Backup restore data loss] → tested restore script, retention, verification, and documentation; no in-app overwrite.
- [Secrets in settings] → secrets remain env-only; the UI masks them.
- [Rule precedence confusion] → priority order, preview, and `appliedRuleId` traceability.
- [Timezone changes affect "today" and period boundaries] → settings affect display/today; reports remain UTC-based and documented.
- [Disk growth from backups] → retention, size monitoring, and a data-quality warning when the volume is low.

## Open Questions

- Backup encryption (GPG) now or later?
- In-app restore (guarded) vs CLI only?
- Regex support for rules, or keep deterministic?
- Credit-card statement table vs computed statements?
- Theme: light/system only, or full dark theme?
- Assistant API key: env only, or encrypted in settings with a server key?
