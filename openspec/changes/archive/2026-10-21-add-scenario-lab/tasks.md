## 1. Scenario model and service

- [x] 1.1 Add Zod schemas for scenario assumptions and create/update payloads.
- [x] 1.2 Add scenario validation, CRUD, duplicate, and default-selection service functions with transactional invariants.
- [x] 1.3 Seed Base, Optimistic, and Pessimistic scenarios when the table is empty.
- [x] 1.4 Add tests for validation, default replacement, deletion rules, and seeding.

## 2. Trajectory integration

- [x] 2.1 Refactor `planTrajectory` to accept optional assumption overrides and inherit unset values.
- [x] 2.2 Add `comparePlanScenarios` with deterministic ordering and effective assumptions.
- [x] 2.3 Add tests for inherited values, overrides, reproducibility, and ordering.

## 3. API

- [x] 3.1 Add authenticated scenario list/create/update/delete routes.
- [x] 3.2 Add the scenario comparison route.
- [x] 3.3 Register the routes and schemas in OpenAPI and add contract tests.

## 4. UI

- [x] 4.1 Add the scenario lab to the projections page with list, create, edit, duplicate, delete, and set-default actions.
- [x] 4.2 Show inherited assumptions and field-level validation errors.
- [x] 4.3 Add the comparison table/chart for the base and selected scenarios.
- [x] 4.4 Show the active scenario name and assumptions near the plan trajectory.
- [x] 4.5 Add localized labels and empty/error states.

## 5. Verification

- [x] 5.1 Run `pnpm typecheck`, `pnpm lint`, and the unit suite.
- [x] 5.2 Run the Playwright suite and verify scenario CRUD/comparison in pt-BR and en.
- [x] 5.3 Run `openspec validate add-scenario-lab --strict`.
