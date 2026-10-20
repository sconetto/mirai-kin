"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", key: "dashboard" },
  { href: "/accounts", key: "accounts" },
  { href: "/transactions", key: "transactions" },
  { href: "/budgets", key: "budgets" },
  { href: "/investments", key: "investments" },
  { href: "/debts", key: "debts" },
  { href: "/projections", key: "projections" },
  { href: "/import", key: "import" },
  { href: "/learn", key: "learn" },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("nav");
  const tc = useTranslations("common");
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();
  const [, startTransition] = useTransition();

  function switchLocale(next: string) {
    startTransition(() => {
      router.replace(pathname, { locale: next });
    });
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    startTransition(() => {
      router.push("/login");
      router.refresh();
    });
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/" className="text-sm font-semibold text-slate-900">
            {tc("appName")}
          </Link>
          <div className="flex items-center gap-3">
            <label className="sr-only" htmlFor="locale-switcher">
              {tc("language")}
            </label>
            <select
              id="locale-switcher"
              value={locale}
              onChange={(event) => switchLocale(event.target.value)}
              className="rounded border border-slate-300 bg-white px-2 py-1 text-sm"
            >
              {routing.locales.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <button
              onClick={logout}
              className="text-sm text-slate-600 hover:text-slate-900"
              type="button"
            >
              {tc("logout")}
            </button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-2 pb-2">
          {NAV.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "whitespace-nowrap rounded px-3 py-1.5 text-sm transition-colors",
                  active
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                )}
              >
                {t(item.key)}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
