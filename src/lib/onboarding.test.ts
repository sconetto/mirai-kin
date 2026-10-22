import { describe, expect, it } from "vitest";
import { postLoginPath } from "./onboarding";

describe("onboarding routing", () => {
  it("sends completed users to the dashboard", () => {
    expect(postLoginPath(true)).toBe("/");
  });

  it("sends new users to onboarding", () => {
    expect(postLoginPath(false)).toBe("/onboarding");
  });
});
