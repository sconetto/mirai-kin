# Add Operational Foundation

## Why

The import-first foundation is live and has been exercised with four months of real Wallet data (461 records, 30 accounts, 108 transfer legs). That data exposed structural gaps that undermine trust as the product grows: transfers are only a `paymentType` tag and can be double-counted; imported accounts start at zero with no reconciliation; categorization is manual; settings are environment-only; and there is no backup or full export. Before adding more analysis features, the foundation needs first-class transfers, reconciliation, rules, settings, and backup/restore.

## What Changes

- **First-class transfers**: a transfer entity with paired legs, cross-currency support (counter-amount + rate), manual pairing/unpairing, automatic pairing on import, backfill of existing tagged transfers, and transfer-aware reporting that counts each pair once and excludes it from income/expenses.
- **Reconciliation and data quality**: opening balances captured or reconciled on import, statement reconciliation per account, credit-card cycle fields (closing/due day, limit), reconciliation history, and a data-quality surface for uncategorized records, duplicates, unpaired transfers, missing FX rates, stale prices, and accounts without opening balances.
- **Rules and recurring management**: deterministic transaction rules (counterparty/note/amount/account/payment-type conditions → category/labels/reviewed), applied during import and runnable over existing records with a preview; detected recurring bills can be confirmed, ignored, or edited and linked to recurring transactions.
- **Settings**: an in-app settings surface for base currency, timezone, first day of month, default locale, theme, FX provider, assistant configuration, and data/backup preferences, without storing secrets in plaintext.
- **Backup and export**: scheduled PostgreSQL backups with retention and history, a full JSON/ZIP data export, a documented restore procedure, and integrity checks.

## Capabilities

### New Capabilities

- `transfers`: First-class transfer pairs, cross-currency handling, pairing/unpairing, import pairing, and transfer-aware reporting.
- `reconciliation`: Opening balances, statement reconciliation, credit-card cycles, reconciliation history, and a data-quality dashboard.
- `rules`: Deterministic auto-categorization rules and recurring-bill management (confirm, ignore, edit).
- `settings`: In-app configuration for locale, currency, timezone, appearance, FX, assistant, and data preferences.
- `backup-export`: Scheduled backups, retention, history, full data export, and restore.

### Modified Capabilities

None — the new capabilities own the behavior; implementation touches existing tables and screens but does not change their specified requirements.

## Impact

- **Schema**: `transfers`, `transactions.transfer_id`, `account_reconciliations`, account credit-card fields, `transaction_rules`, `recurring_detections`, `settings`, `backups`.
- **Services**: transfers, reconciliation, rules, recurring management, settings, backup/export.
- **UI**: transfer pairing/report, reconciliation and data-quality, rules and recurring management, settings, backup/export.
- **Jobs**: nightly backup, recurring detection refresh, rule application on import.
- **API**: transfers, reconciliation, rules, settings, and backup/export endpoints.
- **Infrastructure**: a `backup` sidecar (or Postgres client in the app image) for `pg_dump`; a shared backups volume; `archiver` for ZIP exports.
- **Tests**: pairing and cross-currency, reconciliation, rule matching/precedence, recurring confirmation, settings validation, backup/export integrity.
