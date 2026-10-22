import { describe, expect, it } from "vitest";
import { getChangelog } from "./changelog";

describe("changelog content", () => {
  it("loads the versioned markdown file", async () => {
    const content = await getChangelog();
    expect(content).toContain("## 0.1.0");
  });
});
