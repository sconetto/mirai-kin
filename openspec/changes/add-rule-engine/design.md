## Context

Rules today are stored as `{ conditions, actions }` JSON in `transaction_rules`. Conditions are key/operator/value; actions set a category and optionally mark reviewed. There is no execution history and no preview.

## Goals / Non-Goals

**Goals:**

- A registry of typed conditions (counterparty, note, amount, category, account).
- A registry of typed actions (set category, set reviewed, split, tag).
- Rule runs recorded with match counts.
- Preview before apply, and a confirm step.

**Non-Goals:**

- Arbitrary user-authored expressions.
- Email/notification actions until a delivery channel exists.

## Decisions

### 1. Registries

`Condition` and `Action` become typed entries resolved through registries, rather than a loose JSON blob. Existing rules migrate to the new shape.

### 2. Run history

A `rule_runs` record stores rule id, run time, match count, and a stable signature. Running a rule appends a run; the preview computes the count without persisting.

### 3. Safe matching

Text conditions support a "contains" operator and a safe regex operator with a bounded regex engine, so user patterns cannot hang the import job.

### 4. Ordering

Rules keep `position` ordering and run top-to-bottom; the preview respects order so overlapping rules are predictable.
