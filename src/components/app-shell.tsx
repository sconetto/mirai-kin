"use client";

import {
  BookOpen,
  Briefcase,
  ChartLine,
  House,
  Landmark,
  MessageCircle,
  Monitor,
  Moon,
  Receipt,
  RefreshCw,
  Scale,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  Target,
  TrendingUp,
  Upload,
  Wallet,
  WalletCards,
  Wand2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { BrandMark } from "@/components/brand";
import { useTheme } from "@/components/theme-provider";
import type { Theme } from "@/lib/theme";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  key: string;
  icon: React.ComponentType<{ className?: string }>;
};
type NavSection = { key: string; items: NavItem[] };

const SECTIONS: NavSection[] = [
  {
    key: "sections.track",
    items: [
      { href: "/", key: "nav.overview", icon: House },
      { href: "/accounts", key: "nav.accounts", icon: WalletCards },
      { href: "/insights", key: "nav.insights", icon: Sparkles },
      { href: "/spending", key: "nav.spending", icon: Wallet },
      { href: "/invest", key: "nav.invest", icon: TrendingUp },
      { href: "/forecast", key: "nav.forecast", icon: ChartLine },
      { href: "/equity", key: "nav.equity", icon: Scale },
      { href: "/import", key: "nav.import", icon: Upload },
    ],
  },
  {
    key: "sections.services",
    items: [
      { href: "/brokerage", key: "nav.brokerage", icon: Briefcase },
      { href: "/tax", key: "nav.tax", icon: Receipt },
      { href: "/planner", key: "nav.planner", icon: Target },
      { href: "/estate", key: "nav.estate", icon: Landmark },
      { href: "/rules", key: "nav.rules", icon: Wand2 },
      { href: "/reconciliation", key: "nav.reconciliation", icon: RefreshCw },
      { href: "/data-quality", key: "nav.dataQuality", icon: ShieldCheck },
    ],
  },
  {
    key: "sections.learn",
    items: [
      { href: "/learn", key: "nav.learn", icon: BookOpen },
      { href: "/assistant", key: "nav.assistant", icon: MessageCircle },
      { href: "/settings", key: "nav.settings", icon: Settings },
    ],
  },
];

const MOBILE_ITEMS: NavItem[] = SECTIONS.flatMap((section) => section.items);

export function AppShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations();
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const [, startTransition] = useTransition();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    startTransition(() => {
      router.push("/login");
      router.refresh();
    });
  }

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[270px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-line/70 bg-surface px-4 py-6 lg:flex">
        <Link href="/" className="flex items-center gap-2.5 px-2">
          <BrandMark />
          <span className="text-[15px] font-semibold tracking-tight text-ink">
            {t("common.appName")}
          </span>
        </Link>

        <nav className="mt-9 flex flex-1 flex-col gap-7 overflow-y-auto">
          {SECTIONS.map((section) => (
            <div key={section.key}>
              <p className="px-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3">
                {t(section.key)}
              </p>
              <div className="mt-2 flex flex-col gap-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "group flex min-w-0 items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors",
                        active
                          ? "bg-subtle font-medium text-ink"
                          : "text-ink-2 hover:bg-paper hover:text-ink",
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0",
                          active ? "text-ink" : "text-ink-3 group-hover:text-ink-2",
                        )}
                      />
                      <span className="truncate">{t(item.key)}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="mt-5 space-y-3 border-t border-line/70 pt-4">
<div>
            <span className="mb-1 block text-xs font-medium text-ink-3">
              {t("common.theme")}
            </span>
            <div className="flex gap-1 rounded-lg border border-line bg-surface p-1">
              {([
                ["light", Sun],
                ["dark", Moon],
                ["system", Monitor],
              ] as const).map(([value, Icon]) => (
                <button
                  key={value}
                  type="button"
                  aria-label={t(`common.theme${value === "light" ? "Light" : value === "dark" ? "Dark" : "System"}`)}
                  aria-pressed={theme === value}
                  title={t(`common.theme${value === "light" ? "Light" : value === "dark" ? "Dark" : "System"}`)}
                  onClick={() => setTheme(value)}
                  className={cn(
                    "flex h-8 flex-1 items-center justify-center rounded-md transition-colors",
                    theme === value
                      ? "bg-subtle text-ink"
                      : "text-ink-3 hover:bg-paper hover:text-ink",
                  )}
                >
                  <Icon className="h-4 w-4" />
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={logout}
            type="button"
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-ink-2 transition-colors hover:bg-paper hover:text-ink"
          >
            {t("common.logout")}
          </button>
        </div>
      </aside>

      <div className="lg:hidden">
        <header className="border-b border-line bg-surface px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <Link href="/" className="flex items-center gap-2.5">
              <BrandMark />
              <span className="text-sm font-semibold tracking-tight text-ink">
                {t("common.appName")}
              </span>
            </Link>
            <div className="flex items-center gap-2">
              <select
                value={theme}
                onChange={(event) => setTheme(event.target.value as Theme)}
                aria-label={t("common.theme")}
                className="rounded-lg border border-line bg-surface px-2 py-1.5 text-sm text-ink"
              >
                <option value="light">{t("common.themeLight")}</option>
                <option value="dark">{t("common.themeDark")}</option>
                <option value="system">{t("common.themeSystem")}</option>
              </select>
              <button
                onClick={logout}
                type="button"
                className="rounded-lg px-2 py-1.5 text-sm text-ink-2 hover:bg-paper hover:text-ink"
              >
                {t("common.logout")}
              </button>
            </div>
          </div>
        </header>
        <nav className="flex flex-wrap gap-1 border-b border-line bg-surface px-3 py-2">
          {MOBILE_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "whitespace-nowrap rounded-full px-3 py-1.5 text-sm transition-colors",
                isActive(item.href)
                  ? "bg-subtle font-medium text-ink"
                  : "text-ink-2 hover:bg-paper hover:text-ink",
              )}
            >
              {t(item.key)}
            </Link>
          ))}
        </nav>
      </div>

      <main className="min-w-0 px-4 py-6 lg:px-10 lg:py-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
