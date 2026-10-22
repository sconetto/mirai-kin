## Why

New users land on the login page and then an empty dashboard with no guidance. A single-user self-hosted planner should walk its owner through the essentials once, so the first-run experience is coherent instead of a set of empty states.

## What Changes

- Add a guided first-run onboarding flow: base currency → first import → first goal → explanation.
- Persist a completed flag so the flow runs only once and can be skipped or revisited.
- Reuse the existing import and goal creation surfaces rather than duplicating forms.
- Explain the plan-first philosophy and the import-only transaction rule during onboarding.

## Capabilities

### New Capabilities

- `onboarding`: guided first-run setup and completion tracking.

### Modified Capabilities

- `settings`: onboarding depends on base-currency selection.

## Impact

- **Schema**: a setting or field to record onboarding completion.
- **UI**: an onboarding route/stepper and a post-login redirect.
- **Services**: onboarding step state and completion logic.
- **Tests**: step progression, skip, and completion persistence.
