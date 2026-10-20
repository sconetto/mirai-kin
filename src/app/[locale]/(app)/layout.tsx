import { setRequestLocale } from "next-intl/server";
import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/auth";

export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireSession(locale);
  return <AppShell>{children}</AppShell>;
}
