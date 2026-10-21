# Design — Add Theme and Settings

## Context

The app has a persisted `theme` setting and a server-rendered `data-theme` attribute, but only a light token set exists and the attribute is unused. Charts use hardcoded hex colors. Settings are split across sections already, but appearance is a bare select, language lives in the sidebar, and assistant parameters have no connection check.

Constraints: Next.js 16 App Router, Tailwind 4 with `@theme` tokens, Recharts client charts, next-intl URL locales with `localePrefix: "always"`, single-user session auth, settings in Postgres with secrets in env.

## Goals / Non-Goals

**Goals:**
- Real light/dark/system themes covering all surfaces and charts.
- No flash of the wrong theme on reload.
- Theme selection persists and is controllable from the shell and settings.
- Language changes apply immediately.
- Assistant parameters can be tested without spending user data.
- Keep the existing settings model and secrets boundary.

**Non-Goals:**
- Per-component theme overrides or custom accent colors.
- Density, font-size, or reduced-motion preferences (possible follow-up).
- Full WCAG audit tooling; use contrast-checked token pairs.
- Per-user theming (single-user app).
- Storing secrets in settings.

## Decisions

### 1. Token architecture

Replace fixed light values with CSS custom properties on `:root` and `[data-theme="dark"]`. Tailwind `@theme` maps semantic names (`--color-paper`, `surface`, `ink`, `line`, `accent`, `positive`, `negative`, `warning`, etc.) to those variables.

- `html { color-scheme: light; }` and `html[data-theme="dark"] { color-scheme: dark; }`.
- Keep the existing semantic names so pages need minimal changes.
- Status tints (success/warning/error backgrounds) get dark variants instead of raw hex classes.
- `system` is resolved to `light`/`dark` on the client; the DOM receives the resolved theme, never the literal `system`, so CSS only needs two palettes.

*Alternative considered:* Tailwind `dark:` variants everywhere. Rejected: too many call sites, easy to miss, and charts cannot use utility classes.

### 2. Theme resolution and no-flash render

Server layout reads `getSettings().theme` and renders `<html data-theme={resolved}>`. For `system`, the server cannot know the OS preference, so a tiny blocking inline script (before body paint) reads:
1. `localStorage["mirai-kin-theme"]` (latest local choice), else
2. the server-provided setting (`light`/`dark`/`system`);
and resolves `system` with `matchMedia("(prefers-color-scheme: dark)")` before paint. It sets `data-theme` and `color-scheme`.

The signed-in settings value remains the source of truth; localStorage is a mirror so a reload paints correctly even before the RSC response commits.

*Alternative considered:* cookie-only theme. Rejected: still needs a blocking script for system resolution, and localStorage also enables instant shell toggles.

### 3. Persistence and controls

- Settings `theme` expands to `light | dark | system`.
- The shell theme toggle is a client component. It updates the DOM immediately, mirrors to localStorage, dispatches a custom event so charts can re-render, and calls a server action to persist.
- The settings appearance section uses three selectable cards (light/dark/system) with a preview swatch.
- A `ThemeProvider` (client) exposes the resolved theme and listens to `matchMedia` changes + `storage` events for cross-tab sync.
- Charts consume the resolved theme via CSS variables and a small `useChartTheme()` hook for tooltip surfaces/labels; series use semantic positive/negative/accent variables.

### 4. Language

`defaultLocale` already exists. Settings will use a select that:
1. persists `defaultLocale` via the existing settings action,
2. sets the `NEXT_LOCALE` cookie,
3. navigates to the same pathname under the new locale with next-intl's router.

The proxy already falls back to the cookie for unprefixed requests. No DB migration is needed.

### 5. Assistant connection test

Add `testAssistantConnection()`:
- Resolve the same config as the chat route (settings override + env key).
- If disabled or incomplete, return a clear configured/not-configured message.
- Call `GET {baseUrl}/models` with the bearer key and a short timeout.
- Return `{ ok, status, message }`; never send conversation or financial data.
- Surface the result as a non-blocking message in the assistant settings section.

*Alternative considered:* a one-token chat completion. Rejected: costs money and may expose prompt behavior; `/models` is a sufficient reachability/auth check for OpenAI-compatible endpoints.

### 6. Chart theming

- Grid/axis strokes use `var(--color-line)` / `var(--color-ink-3)`.
- Tooltip surfaces use `var(--color-surface)` and `var(--color-line)` via inline styles.
- Series use `var(--color-accent)`, `var(--color-positive)`, `var(--color-negative)`.
- A `ThemeProvider` event triggers a chart re-render when the resolved theme changes, because Recharts reads some colors at render time.

## Risks / Trade-offs

- **Flash on first paint** → blocking inline script before the app shell; localStorage mirror.
- **Chart color staleness** → subscribe charts to the theme event / resolved theme.
- **Contrast drift** → define paired surface/foreground tokens and verify key screens in both themes.
- **Inline script and CSP** → keep the script tiny and self-contained; document a nonce strategy if CSP is added later.
- **System preference changes while the tab is hidden** → listener updates on change; no polling.
- **Existing `light|system` values** → already valid; `dark` is additive, no migration.
- **Assistant test privacy** → only `/models`, no user data, server-side key.

## Migration Plan

1. Extend the theme type/validation and settings UI.
2. Ship CSS tokens and the pre-paint script.
3. Update charts and special-cased colors.
4. Add the assistant test action and language navigation.
5. Rollback: set theme to `system`/`light`; the dark CSS is inert until selected.

No database migration. Existing settings rows remain valid.

## Open Questions

- Should density/reduced-motion be added to Appearance in this change or a follow-up? (Default: follow-up.)
- Should the shell expose a simple light/dark toggle or a three-way menu? (Default: three-way menu matching settings.)
