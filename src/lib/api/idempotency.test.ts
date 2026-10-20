import { describe, expect, it } from "vitest";
import { requestHash } from "./idempotency";

describe("requestHash", () => {
  it("is deterministic for identical payloads", () => {
    expect(requestHash({ a: 1, b: [2, 3] })).toBe(requestHash({ a: 1, b: [2, 3] }));
  });

  it("changes when the payload changes", () => {
    expect(requestHash({ a: 1 })).not.toBe(requestHash({ a: 2 }));
  });
});
