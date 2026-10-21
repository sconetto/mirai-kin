# Tasks — Add Operational Foundation

## 1. Transfers

- [x] 1.1 Add the `transfers` table and `transactions.transfer_id` plus migration
- [x] 1.2 Implement the transfer service (create, pair, unpair, cross-currency counter-amount and rate)
- [x] 1.3 Implement automatic pairing on import and backfill of existing `paymentType = 'transfer'` records
- [x] 1.4 Exclude transfers from income/expense reports and add a transfers report that counts pairs once
- [x] 1.5 Expose transfer creation, pairing, and unpairing through `/api/v1`
- [ ] 1.6 Build transfer pairing/review UI and surface unpaired transfers in data quality
- [x] 1.7 Add unit tests for pairing, cross-currency transfers, and unpairing

## 2. Reconciliation and data quality

- [ ] 2.1 Add `account_reconciliations`, credit-card cycle fields, and migration
- [ ] 2.2 Implement opening-balance capture and import derivation from a current balance
- [ ] 2.3 Implement statement reconciliation with difference/status and history
- [ ] 2.4 Implement the credit-card cycle view (close day, due day, limit, current cycle)
- [ ] 2.5 Implement the data-quality aggregation service
- [ ] 2.6 Build the reconciliation and data-quality screens
- [ ] 2.7 Add tests for opening balances, reconciliation, and data-quality counts

## 3. Rules and recurring

- [ ] 3.1 Add `transaction_rules`, `recurring_detections`, `transactions.applied_rule_id`, and `recurring_transactions.detection_id` plus migration
- [ ] 3.2 Implement rule evaluation (conditions, actions, priority)
- [ ] 3.3 Apply rules during import staging/commit and show the proposed actions in review
- [ ] 3.4 Implement preview and run of rules over existing transactions
- [ ] 3.5 Persist recurring detections with status and implement confirm, ignore, and edit
- [ ] 3.6 Build the rules and recurring management screens
- [ ] 3.7 Add tests for rule matching/precedence and the recurring lifecycle

## 4. Settings

- [ ] 4.1 Add the `settings` table and migration
- [ ] 4.2 Implement the settings service with defaults and validation
- [ ] 4.3 Apply base currency, timezone, first day, and locale at runtime
- [ ] 4.4 Build the settings screens (general, localization, appearance, FX, assistant, data)
- [ ] 4.5 Show secret configuration status without exposing values
- [ ] 4.6 Add tests for settings validation and defaults

## 5. Backup and export

- [ ] 5.1 Add the `backups` table and migration
- [ ] 5.2 Add `postgresql-client` to the image and the `backup-daily` pg-boss job writing to a `/backups` volume
- [ ] 5.3 Implement retention and dump verification
- [ ] 5.4 Implement the full ZIP export (JSON per domain + manifest) via `archiver`
- [ ] 5.5 Add backup/export UI (history, download, back up now)
- [ ] 5.6 Write `scripts/restore.sh` and the restore documentation
- [ ] 5.7 Add tests for export integrity and retention

## 6. Verification

- [ ] 6.1 Run the migration and transfer backfill against the sample Wallet data
- [ ] 6.2 Verify reports exclude transfers and a transfer pair is counted once
- [ ] 6.3 Verify settings persist across restarts
- [ ] 6.4 Verify backup and restore in Docker
- [ ] 6.5 Run unit and e2e suites and the Docker build
