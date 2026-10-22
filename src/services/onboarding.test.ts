import "dotenv/config";
import { afterAll, describe, expect, it } from "vitest";
import { closeDb } from "@/db";
import {
  getOnboardingState,
  getOnboardingStatus,
  markOnboardingComplete,
  parseOnboardingStep,
  resetOnboarding,
} from "./onboarding";

describe("onboarding steps", () => {
  it("parses known steps and falls back to currency", () => {
    expect(parseOnboardingStep("import")).toBe("import");
    expect(parseOnboardingStep("explanation")).toBe("explanation");
    expect(parseOnboardingStep("nope")).toBe("currency");
    expect(parseOnboardingStep(undefined)).toBe("currency");
  });
});

describe.skipIf(!process.env.DATABASE_URL)("onboarding completion", () => {
  afterAll(async () => {
    await markOnboardingComplete();
    await closeDb();
  });

  it("persists completion and reset", async () => {
    await resetOnboarding();
    expect(await getOnboardingStatus()).toBe(false);
    expect((await getOnboardingState()).complete).toBe(false);

    await markOnboardingComplete();
    expect(await getOnboardingStatus()).toBe(true);
    expect((await getOnboardingState()).complete).toBe(true);
  });
});
