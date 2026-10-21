"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { setThemeAction } from "@/actions/theme";
import { isTheme, resolveTheme, THEME_STORAGE_KEY } from "@/lib/theme";
import type { ResolvedTheme, Theme } from "@/lib/theme";

type ThemeContextValue = {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(theme: Theme): ResolvedTheme {
  const resolved = resolveTheme(
    theme,
    window.matchMedia("(prefers-color-scheme: dark)").matches,
  );
  document.documentElement.dataset.theme = resolved;
  document.documentElement.style.colorScheme = resolved;
  return resolved;
}

export function ThemeProvider({
  initialTheme,
  children,
}: {
  initialTheme: Theme;
  children: React.ReactNode;
}) {
  const [theme, setThemeState] = useState<Theme>(initialTheme);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => {
    if (typeof document !== "undefined") {
      const domTheme = document.documentElement.dataset.theme;
      if (domTheme === "dark" || domTheme === "light") return domTheme;
    }
    return initialTheme === "dark" ? "dark" : "light";
  });

  useEffect(() => {
    applyTheme(theme);
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const onMediaChange = () => {
      if (theme === "system") setResolvedTheme(applyTheme(theme));
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key !== THEME_STORAGE_KEY || !isTheme(event.newValue)) return;
      const next = event.newValue;
      setThemeState(next);
      setResolvedTheme(resolveTheme(next, media.matches));
      applyTheme(next);
    };

    media.addEventListener("change", onMediaChange);
    window.addEventListener("storage", onStorage);
    return () => {
      media.removeEventListener("change", onMediaChange);
      window.removeEventListener("storage", onStorage);
    };
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // The server setting remains the source of truth.
    }
    setResolvedTheme(applyTheme(next));
    void setThemeAction(next).catch(() => undefined);
  }, []);

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used inside ThemeProvider");
  }
  return context;
}
