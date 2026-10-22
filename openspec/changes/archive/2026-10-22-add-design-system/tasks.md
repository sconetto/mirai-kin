## 1. Token source

- [x] 1.1 Add `design/tokens/mirai-kin.tokens.json` with the current token set in design-tokens v2.1 format.
- [x] 1.2 Add dark values as `$extensions` beside each light value.

## 2. Build pipeline

- [x] 2.1 Add a `tokens:build` script that generates `src/app/generated-tokens.css`.
- [x] 2.2 Import the generated CSS from `globals.css` and remove the hand-written token blocks.
- [x] 2.3 Keep the Tailwind `@theme` mapping pointing at the generated variables.

## 3. Verification

- [x] 3.1 Add a smoke test that the build output contains `:root` and `html[data-theme="dark"]`.
- [x] 3.2 Run `pnpm typecheck`, `pnpm lint`, and `pnpm test`.
