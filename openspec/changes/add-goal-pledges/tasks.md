## 1. Data model

- [ ] 1.1 Add the `goal_pledges` table and migration.
- [ ] 1.2 Add pledge create/update/delete service functions with expiry evaluation.

## 2. Projection and detection

- [ ] 2.1 Include open pledges in goal projection and exclude expired ones.
- [ ] 2.2 Implement withdrawal detection from goal-linked transfers.

## 3. UI

- [ ] 3.1 Add pledge management to the planner goal editor.
- [ ] 3.2 Surface withdrawal warnings on the goal card and dashboard.

## 4. Verification

- [ ] 4.1 Add tests for pledge lifecycle, projection inclusion, and withdrawal detection.
- [ ] 4.2 Run `pnpm typecheck`, `pnpm lint`, and `pnpm test`.
