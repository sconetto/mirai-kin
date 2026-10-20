"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { BrandMark } from "@/components/brand";
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

  function isActive(href: string) {
    return href === "/" ? pathname === "/" : pathname.startsWith(href);
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-line bg-surface px-4 py-6 lg:flex">
        <Link href="/" className="flex items-center gap-2.5 px-1">
          <BrandMark />
          <span className="text-sm font-semibold tracking-tight text-ink">{tc("appName")}</span>
        </Link>

        <nav className="mt-9 flex flex-1 flex-col gap-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-lg border-l-2 px-3 py-2 text-sm transition-colors",
                isActive(item.href)
                  ? "border-accent bg-accent-soft font-medium text-accent-strong"
                  : "border-transparent text-ink-2 hover:bg-paper hover:text-ink",
              )}
            >
              {t(item.key)}
            </Link>
          ))}
        </nav>

        <div className="mt-6 space-y-3 border-t border-line/70 pt-4">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink-3">{tc("language")}</span>
            <select
              value={locale}
              onChange={(event) => switchLocale(event.target.value)}
              className="w-full rounded-lg border border-line bg-surface px-2.5 py-2 text-sm text-ink"
            >
              {routing.locales.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <button
            onClick={logout}
            type="button"
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-ink-2 transition-colors hover:bg-paper hover:text-ink"
          >
            {tc("logout")}
          </button>
        </div>
      </aside>

      <div className="lg:hidden">
        <header className="border-b border-line bg-surface px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <Link href="/" className="flex items-center gap-2.5">
              <BrandMark />
              <span className="text-sm font-semibold tracking-tight text-ink">{tc("appName")}</span>
            </Link>
            <div className="flex items-center gap-2">
              <select
                value={locale}
                onChange={(event) => switchLocale(event.target.value)}
                aria-label={tc("language")}
                className="rounded-lg border border-line bg-surface px-2 py-1.5 text-sm text-ink"
              >
                {routing.locales.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <button
                onClick={logout}
                type="button"
                className="rounded-lg px-2 py-1.5 text-sm text-ink-2 hover:bg-paper hover:text-ink"
              >
                {tc("logout")}
              </button>
            </div>
          </div>
        </header>
        <nav className="flex gap-1 overflow-x-auto border-b border-line bg-surface px-3 py-2">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "whitespace-nowrap rounded-full px-3 py-1.5 text-sm transition-colors",
                isActive(item.href)
                  ? "bg-accent font-medium text-white"
                  : "text-ink-2 hover:bg-paper hover:text-ink",
              )}
            >
              {t(item.key)}
            </Link>
          ))}
        </nav>
      </div>

      <main className="min-w-0 px-4 py-6 lg:px-10 lg:py-10">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
