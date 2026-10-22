## Context

`src/app/globals.css` defines `:root` and `html[data-theme="dark"]` blocks with identical keys. Tailwind v4 maps them through `@theme`. There is no generated layer, so adding a color means editing two places.

## Goals / Non-Goals

**Goals:**

- One JSON file owns every token.
- Dark and light values live together on the same token.
- A deterministic build emits the CSS variables.
- Existing utility classes keep working.

**Non-Goals:**

- Runtime theme switching beyond the existing `data-theme` mechanism.
- A full component library (Button/Card stay as-is).
- Removing the Tailwind `@theme` bridge.

## Decisions

### 1. Token format

Use the design-tokens community format v2.1:

```json
{
  "color": {
    "success": { "$value": "{color.green.700}", "$type": "color",
                 "$extensions": { "mirai.dark": "{color.green.400}" } }
  }
}
```

### 2. Build pipeline

`pnpm tokens:build` reads the JSON and writes `src/app/generated-tokens.css` with `:root` and `html[data-theme="dark"]` blocks. `globals.css` imports it and keeps only the `@theme` mapping and non-token styles.

### 3. Backward compatibility

Generated variable names equal the existing names (`--ink`, `--surface`, `--chart-1`, ...). Components are not renamed in this change; renaming is a separate cleanup if desired.

### 4. Scope

This change only establishes the source-of-truth and build. Adoption of new tokens (spacing, radius, shadows) can follow in later work.
