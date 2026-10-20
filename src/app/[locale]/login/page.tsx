import { getTranslations, setRequestLocale } from "next-intl/server";
import { LoginForm } from "@/components/login-form";

export default async function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("login");

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <p className="mb-5 text-sm text-slate-500">{t("subtitle")}</p>
        <LoginForm />
      </div>
    </div>
  );
}
