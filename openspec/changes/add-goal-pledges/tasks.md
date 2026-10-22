## 1. Data model

- [x] 1.1 Add the `goal_pledges` table and migration.
- [x] 1.2 Add pledge create/update/delete service functions with expiry evaluation.

## 2. Projection and detection

- [x] 2.1 Include open pledges in goal projection and exclude expired ones.
- [x] 2.2 Implement withdrawal detection from goal-linked transfers.

## 3. UI

- [x] 3.1 Add pledge management to the planner goal editor.
- [x] 3.2 Surface withdrawal warnings on the goal card and dashboard.

## 4. Verification

- [x] 4.1 Add tests for pledge lifecycle, projection inclusion, and withdrawal detection.
- [x] 4.2 Run `pnpm typecheck`, `pnpm lint`, and `pnpm test`.
