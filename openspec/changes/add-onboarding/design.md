## Context

The app already has settings (base currency), import, and goal creation. Onboarding is a thin orchestration layer over those, not new business logic.

## Goals / Non-Goals

**Goals:**

- Four ordered steps: currency, first import, first goal, explanation.
- Completion persisted once; skip available; can be revisited from settings.
- Keep steps optional where the underlying feature is optional (e.g., skip import).

**Non-Goals:**

- Re-implementing import or goal forms.
- Multi-user or per-tenant onboarding.
- Forcing a goal before the app is usable.

## Decisions

### 1. Completion model

Store completion as a `settings` entry (`onboarding_complete = true`) plus the current step in client state, mirroring the existing key/value settings pattern. No new table.

### 2. Routing

`/onboarding` renders a step indicator. After login, an un-onboarded user is redirected to `/onboarding`; completing it lands on the dashboard.

### 3. Reusing surfaces

The currency step writes the existing base-currency setting. The import and goal steps link to the existing pages and detect a successful result to advance, rather than embedding duplicate forms.

### 4. Explanation step

A static, localized explainer covers the plan-first layout and the import-only rule: transactions are always imported, never created.
