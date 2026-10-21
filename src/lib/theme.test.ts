import { describe, expect, it } from "vitest";
import { isTheme, resolveTheme, THEMES } from "./theme";

describe("theme helpers", () => {
  it("recognizes exactly the supported themes", () => {
    expect(THEMES).toEqual(["light", "dark", "system"]);
    for (const theme of THEMES) expect(isTheme(theme)).toBe(true);
    expect(isTheme("neon")).toBe(false);
    expect(isTheme(undefined)).toBe(false);
  });

  it("resolves explicit themes", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });

  it("resolves system from the OS preference", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
  });
});
