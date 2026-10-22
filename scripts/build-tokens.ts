import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildTokenCss } from "../src/lib/design-tokens";

const tokensPath = join(process.cwd(), "design/tokens/mirai-kin.tokens.json");
const outputPath = join(process.cwd(), "src/app/generated-tokens.css");

const document = JSON.parse(readFileSync(tokensPath, "utf8")) as Record<string, unknown>;
const css = buildTokenCss(document);

writeFileSync(outputPath, css, "utf8");
console.log(`[tokens] wrote ${outputPath}`);
