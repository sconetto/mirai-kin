import { describe, expect, it } from "vitest";
import { formatCurrency, formatDate, formatMonth } from "./format";

describe("formatCurrency", () => {
  it("uses Brazilian conventions for pt-BR", () => {
    expect(formatCurrency(1234.56, "BRL", "pt-BR")).toContain("1.234,56");
  });

  it("uses US conventions for en", () => {
    expect(formatCurrency(1234.56, "USD", "en")).toContain("1,234.56");
  });
});

describe("formatDate", () => {
  it("formats a valid date", () => {
    expect(formatDate("2026-01-15T00:00:00.000Z", "en")).toMatch(/2026/);
  });
});

describe("formatMonth", () => {
  it("renders a month name", () => {
    expect(formatMonth("2026-01", "en").toLowerCase()).toContain("jan");
  });
});
