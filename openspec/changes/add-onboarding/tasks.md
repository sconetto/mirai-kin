## 1. Completion state

- [x] 1.1 Add an `onboarding_complete` setting with default false.
- [x] 1.2 Add a helper to read and write onboarding completion.

## 2. Flow

- [x] 2.1 Add an `/onboarding` route with a step indicator.
- [x] 2.2 Redirect un-onboarded users to onboarding after login.
- [x] 2.3 Wire the currency step to the base-currency setting.
- [x] 2.4 Link the import and goal steps to existing pages with advance detection.
- [x] 2.5 Add the localized explanation step.

## 3. Settings integration

- [x] 3.1 Add a "Revisit onboarding" action in settings.

## 4. Verification

- [x] 4.1 Add tests for completion persistence, skip, and redirect.
- [x] 4.2 Run `pnpm typecheck`, `pnpm lint`, and `pnpm test`.
