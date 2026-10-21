"use server";

import type { Theme } from "@/lib/theme";
import { testAssistantConnection } from "@/services/assistant/connection";
import { updateSettings } from "@/services/settings";

export async function setThemeAction(theme: Theme) {
  await updateSettings({ theme });
}

export async function testAssistantConnectionAction() {
  return testAssistantConnection();
}
