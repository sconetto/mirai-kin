# Design tokens

`mirai-kin.tokens.json` is the source of truth for the app's color tokens. Each token carries its light value in `$value` and its dark value in `$extensions["mirai.dark"]`.

## Editing

1. Change the token in `mirai-kin.tokens.json`.
2. Run `pnpm tokens:build`.
3. Commit both the token change and `src/app/generated-tokens.css`.

`src/app/globals.css` imports the generated file and maps it into Tailwind via `@theme`.
