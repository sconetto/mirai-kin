## 1. Data model and schema

- [x] 1.1 Extend `goals` with `fundingMode`, `manualCurrentAmount`, `monthlyContribution`, `expectedReturn`, and `inflationRate` fields and add `goalAllocations` with `goalId`, `accountId`, and `sharePct`.
- [x] 1.2 Add the Drizzle migration and verify existing goals remain valid without backfill.
- [x] 1.3 Extend goal request schemas and API serializers with the new fields, preserving legacy `accountIds`.
- [x] 1.4 Add validation that a goal's account allocation totals do not exceed 100% and that contributions/rates are within safe bounds.

## 2. Net-worth consolidation

- [x] 2.1 Add a canonical `getNetWorth(asOf)` service that reuses the equity composition and applies the investment-account policy from the design.
- [x] 2.2 Add the fallback for investment accounts without positions and ensure manual assets are counted once.
- [x] 2.3 Refactor `analytics.overview()` and `equity.getEquity()` to consume the canonical calculation.
- [x] 2.4 Add regression tests for net-worth consistency, investment accounts with and without positions, and manual assets.

## 3. Goal trajectory engine

- [x] 3.1 Add pure trajectory math helpers for real return, monthly rate, future value, required contribution, and status classification.
- [x] 3.2 Add unit tests covering on-track, at-risk, off-track, insufficient-data, zero-return, already-funded, and past-target-date cases.
- [x] 3.3 Add a `getPlanStatus` service that resolves funding (allocations, legacy account IDs, or manual amount), converts to base currency, builds conservative/base/optimistic projections, and returns gaps and required contributions.
- [x] 3.4 Add tests for multi-currency goals, shared-account allocations, and insufficient-data behavior.
- [x] 3.5 Add the read-only `GET /api/v1/plan-status` endpoint and OpenAPI registration.

## 4. Planner UI

- [x] 4.1 Update the goal create form to accept funding mode, allocations/manual amount, monthly contribution, expected return, inflation, target date, and priority.
- [x] 4.2 Update the goal editor to modify the same funding assumptions and show validation errors.
- [x] 4.3 Replace the simple percentage progress row with status, projected value, funding gap, and required monthly contribution.
- [x] 4.4 Add localized labels and explanatory copy for on-track, at-risk, off-track, and insufficient-data states.
- [x] 4.5 Show a clear prompt when a legacy goal has no funding model instead of a misleading 0% trajectory.

## 5. Insights

- [x] 5.1 Add `goal_at_risk` and `goal_off_track` insight types with structured data and stable signatures.
- [x] 5.2 Add tests for status transitions and for not resurfacing an acknowledged goal insight until the condition changes.
- [x] 5.3 Render the new insights with localized copy and links to the planner.

## 6. Verification

- [x] 6.1 Run `pnpm typecheck`, `pnpm lint`, and the unit test suite.
- [x] 6.2 Run the Playwright suite and verify the planner flow in pt-BR and en.
- [x] 6.3 Validate that the plan-status API returns the same net worth as the equity page.
- [x] 6.4 Run `openspec validate add-goal-trajectory --strict`.
