import { getTranslations, setRequestLocale } from "next-intl/server";
import { BrandMark } from "@/components/brand";
import { LoginForm } from "@/components/login-form";

export default async function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("login");
  const tc = await getTranslations("common");

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden overflow-hidden bg-ink px-12 py-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="ledger-grid pointer-events-none absolute inset-0" />
        <div className="relative flex items-center gap-2.5">
          <BrandMark className="bg-white/10 text-white" />
          <span className="text-sm font-semibold tracking-tight">{tc("appName")}</span>
        </div>
        <div className="relative max-w-md">
          <p className="text-4xl font-semibold leading-[1.15] tracking-tight">{t("brandTitle")}</p>
          <p className="mt-5 text-base leading-relaxed text-white/75">{t("brandBody")}</p>
        </div>
        <p className="relative text-sm text-white/60">{t("brandFooter")}</p>
      </section>

      <section className="flex min-h-screen items-center justify-center bg-surface px-5 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <BrandMark />
            <span className="text-sm font-semibold tracking-tight text-ink">{tc("appName")}</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">{t("title")}</h1>
          <p className="mb-7 mt-2 text-sm text-ink-3">{t("subtitle")}</p>
          <LoginForm />
        </div>
      </section>
    </div>
  );
}
