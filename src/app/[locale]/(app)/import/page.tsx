import { getTranslations, setRequestLocale } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, Textarea } from "@/components/ui/input";
import { listAccounts } from "@/services/accounts";
import { importCsvAction } from "../actions";

export default async function ImportPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("import");
  const tc = await getTranslations("common");
  const accounts = await listAccounts();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{t("title")}</h1>
        <p className="text-sm text-ink-3">{t("subtitle")}</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={importCsvAction} className="space-y-3">
            <input type="hidden" name="locale" value={locale} />
            <Select name="accountId" defaultValue={accounts[0]?.id} required>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} ({account.currency})
                </option>
              ))}
            </Select>
            <Textarea
              name="csv"
              rows={10}
              placeholder={"date,amount,currency,category,note\n2026-01-15,-45.90,BRL,Groceries,Market"}
              required
            />
            <p className="text-xs text-ink-3">{t("hint")}</p>
            <Button type="submit" disabled={accounts.length === 0}>
              {t("submit")}
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="text-xs text-ink-3">{tc("appName")}</p>
    </div>
  );
}
