"use client";

import { useTranslations } from "next-intl";
import { useTheme } from "@/components/theme-provider";
import type { Theme } from "@/lib/theme";
import { cn } from "@/lib/utils";

const OPTIONS: {
  value: Theme;
  label: "themeLight" | "themeDark" | "themeSystem";
  background: string;
}[] = [
  { value: "light", label: "themeLight", background: "linear-gradient(135deg, #f6f7f9, #ffffff)" },
  { value: "dark", label: "themeDark", background: "linear-gradient(135deg, #0b1220, #151f33)" },
  {
    value: "system",
    label: "themeSystem",
    background: "linear-gradient(135deg, #f6f7f9 0 49%, #0b1220 51% 100%)",
  },
];

export function ThemePicker() {
  const t = useTranslations("settings");
  const { theme, setTheme } = useTheme();

  return (
    <div role="group" aria-label={t("theme")} className="grid gap-3 sm:grid-cols-3">
      {OPTIONS.map((option) => {
        const active = theme === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setTheme(option.value)}
            aria-pressed={active}
            className={cn(
              "rounded-xl border p-3 text-left transition-colors",
              active
                ? "border-accent bg-accent-soft text-ink"
                : "border-line bg-surface text-ink-2 hover:border-ink-3",
            )}
          >
            <span
              className="block h-14 rounded-lg border border-line"
              style={{ background: option.background }}
            />
            <span className="mt-2 flex items-center justify-between gap-2">
              <span className="text-sm font-medium">{t(option.label)}</span>
              {active ? (
                <span className="text-[11px] font-medium text-accent">{t("active")}</span>
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}
