import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Mdx } from "@/components/mdx";
import { Link } from "@/i18n/navigation";
import { getArticle } from "@/lib/knowledge";

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("learn");
  const article = await getArticle(locale, slug);

  if (!article) {
    notFound();
  }

  return (
    <article className="mx-auto max-w-3xl space-y-4">
      <Link href="/learn" className="text-sm text-ink-3 hover:underline">
        ← {t("title")}
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">{article.title}</h1>
      {article.description ? (
        <p className="text-sm text-ink-3">{article.description}</p>
      ) : null}
      <Mdx source={article.content} />
    </article>
  );
}
