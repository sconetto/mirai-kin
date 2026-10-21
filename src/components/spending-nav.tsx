"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/spending", key: "overview" },
  { href: "/spending/transactions", key: "transactions" },
  { href: "/spending/budgets", key: "budgets" },
  { href: "/spending/recurring", key: "recurring" },
  { href: "/spending/transfers", key: "transfers" },
  { href: "/spending/reports", key: "reports" },
] as const;

export function SpendingNav() {
  const t = useTranslations("spending");
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap items-center gap-1">
      {ITEMS.map((item) => {
        const active =
          item.href === "/spending"
            ? pathname === "/spending"
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm transition-colors",
              active
                ? "bg-subtle font-medium text-ink"
                : "text-ink-3 hover:bg-paper hover:text-ink",
            )}
          >
            {t(item.key)}
          </Link>
        );
      })}
    </nav>
  );
}
