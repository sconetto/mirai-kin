## 1. Data model

- [ ] 1.1 Add condition and action registries with typed descriptors.
- [ ] 1.2 Add a `rule_runs` table and migration.
- [ ] 1.3 Migrate existing rule JSON to the typed shape.

## 2. Engine

- [ ] 2.1 Implement condition evaluation across the supported kinds.
- [ ] 2.2 Implement action execution (set category, set reviewed, split, tag).
- [ ] 2.3 Add safe regex matching with a bounded engine.
- [ ] 2.4 Record rule runs with match counts and signatures.

## 3. UI

- [ ] 3.1 Rebuild the rule editor with typed condition/action controls.
- [ ] 3.2 Add a preview that lists matches before applying.
- [ ] 3.3 Add a run-history view.

## 4. Verification

- [ ] 4.1 Add tests for each condition/action, ordering, regex bounds, and preview counts.
- [ ] 4.2 Run `pnpm typecheck`, `pnpm lint`, and `pnpm test`.
