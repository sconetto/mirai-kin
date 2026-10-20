import { describe, expect, it } from "vitest";
import { parseCsvRows } from "./csv-parse";

describe("parseCsvRows", () => {
  it("parses English column headers", () => {
    const { rows, errors } = parseCsvRows(
      "date,amount,currency,note\n2026-01-15,-45.90,BRL,Market",
    );
    expect(errors).toHaveLength(0);
    expect(rows[0].amount).toBe("-45.90");
    expect(rows[0].currency).toBe("BRL");
    expect(rows[0].note).toBe("Market");
  });

  it("parses Portuguese column headers", () => {
    const { rows, errors } = parseCsvRows("data,valor,moeda\n2026-01-15,-45.90,BRL");
    expect(errors).toHaveLength(0);
    expect(rows[0].amount).toBe("-45.90");
  });

  it("reports rows missing required columns", () => {
    const { rows, errors } = parseCsvRows("foo,bar\n1,2");
    expect(rows).toHaveLength(0);
    expect(errors[0].error).toMatch(/Missing/);
  });

  it("reports invalid dates", () => {
    const { rows, errors } = parseCsvRows("date,amount\nnot-a-date,-10");
    expect(rows).toHaveLength(0);
    expect(errors[0].error).toMatch(/Invalid date/);
  });
});
