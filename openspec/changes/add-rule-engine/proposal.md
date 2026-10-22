## Why

Transaction rules currently support a single action (set category, optionally mark reviewed) and a fixed set of conditions, with no way to preview what a rule will match or see what it has done. This makes rules brittle and hard to trust as auto-categorization grows.

## What Changes

- Replace the fixed condition/action JSON with registries of typed conditions and actions.
- Add rule run history so users can see what a rule matched.
- Add a preview/confirm UI that shows matches before applying a rule.
- Preserve rule ordering and add safe regex support for text matching.

## Capabilities

### Modified Capabilities

- `rules`: richer condition/action model, run history, and preview/confirm.

## Impact

- **Schema**: introduce rule runs (and possibly typed condition/action columns) with a migration.
- **Services**: condition/action registries, a runner, and run recording.
- **UI**: rule editor with typed controls, preview, and history.
- **Tests**: condition/action evaluation, ordering, preview counts, and migration of existing rules.
