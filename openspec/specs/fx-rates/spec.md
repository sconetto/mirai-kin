# FX Rates

## Purpose

Resolve historical exchange-rate snapshots and keep them fresh.

## Requirements

### Requirement: Exchange rate storage
The system SHALL store exchange rates as `(base, quote, rate, date)` tuples with uniqueness on `(base, quote, date)`.

#### Scenario: Rate stored once per day
- **WHEN** a rate is recorded for a given base, quote, and date
- **THEN** the system stores it and upserts on a duplicate for the same date

### Requirement: Daily fetch job
The system SHALL run a scheduled job that fetches exchange rates for every currency pair in use by the user's accounts (plus the base currency) on a daily cadence.

#### Scenario: Rates fetched for held currencies
- **WHEN** the user holds accounts in BRL, EUR, and USD
- **THEN** the job fetches and stores rates covering all pairs among those currencies and the base currency

### Requirement: Retry with exponential backoff
The system SHALL retry failed fetch attempts using exponential backoff with jitter, up to a bounded number of retries, and SHALL persist job state across restarts.

#### Scenario: Transient failure retried
- **WHEN** a fetch fails transiently
- **THEN** the system retries after a delay that grows exponentially between attempts

#### Scenario: Job state survives restart
- **WHEN** the app restarts mid-retry
- **THEN** the pending retry state is recovered from durable storage and continues

### Requirement: Snapshot rate resolution
The system SHALL resolve the exchange rate for a transaction by using the rate active on the transaction date, falling back to the nearest prior available rate when none exists for that date.

#### Scenario: Exact-date rate used
- **WHEN** a rate exists for the transaction date
- **THEN** the system uses that exact rate for the snapshot

#### Scenario: Missing-date fallback
- **WHEN** no rate exists for the transaction date
- **THEN** the system uses the most recent rate on or before that date and records the rate id used
