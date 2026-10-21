# Add Theme and Settings

## Why

The app is visually light-only. A `theme` preference already exists and is persisted, but its values are only `light | system`, the token set has no dark palette, and the layout merely sets a `data-theme` attribute that nothing styles. Users cannot meaningfully choose a dark appearance, and the settings surface for appearance, language, and assistant parameters is functional but thin: theme is a bare select, language lives in the sidebar rather than the settings hub, and assistant parameters have no way to verify that the configured endpoint works.

This change turns theming into a real product feature and finishes the settings hub so the visible preferences users expect — appearance, language, assistant configuration — can be changed confidently and immediately.

## What Changes

- Add a complete **light / dark / system** theme with dark tokens for surfaces, text, borders, accents, status colors, forms, tables, cards, and charts.
- Make the initial render theme-aware on the server (`data-theme`, `color-scheme`) and avoid a flash of the wrong theme; persist the choice in settings and mirror it locally for instant navigation.
- Add a **theme toggle** in the app shell and an appearance picker in Settings.
- Make `system` follow the operating-system preference live, without a reload.
- Make chart grids, tooltips, and series colors adapt to the active theme.
- Upgrade Settings with:
  - an appearance section offering light, dark, and system;
  - a language control that applies immediately (URL locale + cookie), not just a stored default;
  - an assistant parameter section with provider presets, masked key status, and a **Test connection** action that validates the endpoint without sending user financial data.
- Keep existing settings validation and secret handling unchanged.

## Capabilities

### New Capabilities

- `theming`: Light, dark, and system themes, theme-aware design tokens, no-flash initial render, live system preference handling, theme-aware charts, and a persisted user choice.

### Modified Capabilities

- `settings`: Appearance now supports `dark`; language changes apply immediately; assistant configuration gains a non-destructive connection test.

## Impact

- **UI**: `src/app/globals.css` token set, locale layout, app shell, settings page, charts, and theme control components.
- **Services**: settings theme enum/validation, a theme resolution helper, and an assistant connection test.
- **Storage**: existing `settings` table/theme key; no migration expected.
- **i18n**: en-US/pt-BR labels for themes, appearance, language, and connection testing.
- **Tests**: settings validation, theme persistence/system behavior, settings e2e, and chart theme coverage.
- **No breaking API changes.**
