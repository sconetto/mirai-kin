import { describe, expect, it } from "vitest";
import {
  classifyAccount,
  classifyEstateAsset,
  defaultNominalGrowth,
} from "./asset-classes";

describe("asset class classification", () => {
  it("classifies cash, investments, real estate, vehicles, and liabilities", () => {
    expect(classifyAccount({ type: "checking" })).toBe("cash");
    expect(classifyAccount({ type: "savings" })).toBe("cash");
    expect(classifyAccount({ type: "credit_card" })).toBe("liabilities");
    expect(classifyAccount({ type: "loan" })).toBe("liabilities");
    expect(classifyAccount({ type: "mortgage" })).toBe("liabilities");
    expect(classifyAccount({ type: "investment", assetSubtype: "stocks" })).toBe(
      "investments",
    );
    expect(classifyAccount({ type: "investment", assetSubtype: "crypto" })).toBe(
      "investments",
    );
    expect(classifyAccount({ type: "investment", assetSubtype: "real_estate" })).toBe(
      "real_estate",
    );
    expect(classifyAccount({ type: "investment", assetSubtype: "vehicle" })).toBe(
      "vehicles",
    );
    expect(classifyAccount({ type: "asset", assetSubtype: "other_depreciating" })).toBe(
      "other_depreciating",
    );
  });

  it("prefers investment positions over the asset subtype", () => {
    expect(
      classifyAccount({ type: "investment", assetSubtype: "vehicle", hasPositions: true }),
    ).toBe("investments");
  });

  it("classifies manual estate assets by their type", () => {
    expect(classifyEstateAsset("property")).toBe("real_estate");
    expect(classifyEstateAsset("real_estate")).toBe("real_estate");
    expect(classifyEstateAsset("vehicle")).toBe("vehicles");
    expect(classifyEstateAsset("other_depreciating")).toBe("other_depreciating");
    expect(classifyEstateAsset("collectible")).toBe("other_appreciating");
  });
});

describe("asset class default growth", () => {
  it("uses the agreed nominal defaults", () => {
    expect(defaultNominalGrowth("cash", 0.046, 0.087)).toBeCloseTo(0.046);
    expect(defaultNominalGrowth("investments", 0.046, 0.087)).toBeCloseTo(0.087);
    expect(defaultNominalGrowth("real_estate", 0.046, 0.087)).toBeCloseTo(0.05);
    expect(defaultNominalGrowth("vehicles", 0.046, 0.087)).toBeCloseTo(-0.12);
    expect(defaultNominalGrowth("other_appreciating", 0.046, 0.087)).toBeCloseTo(0.046);
    expect(defaultNominalGrowth("other_depreciating", 0.046, 0.087)).toBeCloseTo(0.046);
    expect(defaultNominalGrowth("liabilities", 0.046, 0.087)).toBe(0);
  });
});
