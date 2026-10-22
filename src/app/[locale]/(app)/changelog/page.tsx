import { getTranslations, setRequestLocale } from "next-intl/server";
import { Mdx } from "@/components/mdx";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getChangelog } from "@/lib/changelog";

export default async function ChangelogPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("changelog");
  const content = await getChangelog();

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <Card>
        <CardContent>
          {content ? <Mdx source={content} /> : <p className="text-sm text-ink-3">{t("empty")}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
