import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildTokenCss, flattenTokens } from "./design-tokens";

const document = JSON.parse(
  readFileSync(join(process.cwd(), "design/tokens/mirai-kin.tokens.json"), "utf8"),
) as Record<string, unknown>;

describe("design tokens", () => {
  it("flattens the token document into light and dark values", () => {
    const tokens = flattenTokens(document);
    expect(tokens.length).toBeGreaterThan(20);
    expect(tokens.find((token) => token.name === "ink")?.light).toBe("#101828");
    expect(tokens.find((token) => token.name === "ink")?.dark).toBe("#f8fafc");
  });

  it("builds both theme blocks", () => {
    const css = buildTokenCss(document);
    expect(css).toContain(":root {");
    expect(css).toContain('html[data-theme="dark"] {');
    expect(css).toContain("--paper: #f6f7f9;");
    expect(css).toContain("--paper: #0b1220;");
    expect(css).toContain("--chart-10: #f87171;");
  });

  it("rejects duplicate variable names", () => {
    expect(() =>
      flattenTokens({
        "a-b": { c: { $value: "#000" } },
        a: { b: { c: { $value: "#fff" } } },
      }),
    ).toThrow("Duplicate token");
  });
});
