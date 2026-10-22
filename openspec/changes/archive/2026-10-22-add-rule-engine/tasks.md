## 1. Data model

- [x] 1.1 Add condition and action registries with typed descriptors.
- [x] 1.2 Add a `rule_runs` table and migration.
- [x] 1.3 Migrate existing rule JSON to the typed shape.

## 2. Engine

- [x] 2.1 Implement condition evaluation across the supported kinds.
- [x] 2.2 Implement action execution (set category, set reviewed, split, tag).
- [x] 2.3 Add safe regex matching with a bounded engine.
- [x] 2.4 Record rule runs with match counts and signatures.

## 3. UI

- [x] 3.1 Rebuild the rule editor with typed condition/action controls.
- [x] 3.2 Add a preview that lists matches before applying.
- [x] 3.3 Add a run-history view.

## 4. Verification

- [x] 4.1 Add tests for each condition/action, ordering, regex bounds, and preview counts.
- [x] 4.2 Run `pnpm typecheck`, `pnpm lint`, and `pnpm test`.
