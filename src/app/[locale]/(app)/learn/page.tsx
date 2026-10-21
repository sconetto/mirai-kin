import { getTranslations, setRequestLocale } from "next-intl/server";
import { Mdx } from "@/components/mdx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { getGlossary, listArticles } from "@/lib/knowledge";

export default async function LearnPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("learn");
  const articles = await listArticles(locale);
  const glossary = await getGlossary(locale);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">{t("title")}</h1>
        <p className="text-sm text-ink-3">{t("subtitle")}</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>{t("glossary")}</CardTitle>
        </CardHeader>
        <CardContent>
          {glossary ? <Mdx source={glossary} /> : <p className="text-sm text-ink-3">{t("empty")}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("articles")}</CardTitle>
        </CardHeader>
        <CardContent>
          {articles.length === 0 ? (
            <p className="text-sm text-ink-3">{t("empty")}</p>
          ) : (
            <ul className="divide-y divide-line/70">
              {articles.map((article) => (
                <li key={article.slug} className="py-2">
                  <Link
                    href={`/learn/${article.slug}`}
                    className="font-medium text-ink hover:underline"
                  >
                    {article.title}
                  </Link>
                  {article.description ? (
                    <p className="text-xs text-ink-3">{article.description}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
