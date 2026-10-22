## Why

Design tokens currently live only in `src/app/globals.css` as raw CSS variables, with light and dark values hand-duplicated and no single source of truth. Components reference them by ad-hoc `var(--...)` names. This makes it hard to keep dark/light parity, audit color usage, or onboard new UI.

## What Changes

- Adopt the design-tokens community format v2.1 as the single source of truth.
- Add a build script (`tokens:build`) that generates the CSS variables consumed by `globals.css`.
- Represent light/dark values as token `$extensions` so dark mode is defined beside light mode.
- Keep the existing Tailwind `@theme` bridge so utility classes (`text-ink`, `bg-surface`, etc.) continue to work unchanged.
- Migrate existing token names to the canonical set without renaming public CSS variables.

## Capabilities

### New Capabilities

- `design-system`: canonical design tokens, light/dark parity, and the build pipeline.

### Modified Capabilities

- `theming`: the theme now derives from generated token CSS instead of hand-maintained variables.

## Impact

- **Tooling**: add a `tokens:build` script and token JSON file.
- **CSS**: `globals.css` imports generated variables and keeps the `@theme` mapping.
- **Docs**: document how to add a token and regenerate CSS.
- **Tests**: a token-build smoke test and a dark/light contrast check.
