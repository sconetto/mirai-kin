# Tasks — Add Theme and Settings

## 1. Theme tokens and initial render

- [x] 1.1 Add dark palette tokens and semantic CSS variables, map them through Tailwind `@theme`, and set `color-scheme` per theme
- [x] 1.2 Expand the persisted theme type and validation to `light | dark | system`
- [x] 1.3 Resolve the server theme for the locale layout and add the pre-paint script that applies the stored/local theme before first render

## 2. Theme controls

- [x] 2.1 Add a client theme provider with system-preference listeners, localStorage mirroring, and a resolved-theme event
- [x] 2.2 Add the accessible three-way theme toggle to the app shell and persist changes through a server action
- [x] 2.3 Replace the appearance select with light/dark/system option cards in Settings
- [x] 2.4 Audit pages, cards, tables, forms, navigation, badges, and messages for dark-mode contrast and token usage

## 3. Charts

- [x] 3.1 Make chart grids, axes, tooltips, and series colors theme-aware across all chart components

## 4. Language

- [x] 4.1 Add a settings language control that persists `defaultLocale`, sets the locale cookie, and navigates to the same page in the selected locale

## 5. Assistant parameters

- [x] 5.1 Implement a non-destructive assistant connection test against the configured OpenAI-compatible endpoint without sending user data
- [x] 5.2 Add the test-connection action and result state to the assistant settings section

## 6. Verification

- [x] 6.1 Add unit tests for theme validation, resolution, and settings persistence
- [x] 6.2 Add e2e coverage for toggling, persisting, and restoring light/dark/system themes and switching language
- [x] 6.3 Run typecheck, lint, unit tests, e2e tests, and the Docker build; verify key screens in both palettes
