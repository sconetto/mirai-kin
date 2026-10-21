import { setRequestLocale } from "next-intl/server";
import { AppShell } from "@/components/app-shell";
import { ThemeProvider } from "@/components/theme-provider";
import { requireSession } from "@/lib/auth";
import { getSettings } from "@/services/settings";

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
  const settings = await getSettings();
  return (
    <ThemeProvider initialTheme={settings.theme}>
      <AppShell>{children}</AppShell>
    </ThemeProvider>
  );
}
