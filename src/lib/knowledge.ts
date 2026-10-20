import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";

const CONTENT_ROOT = path.join(process.cwd(), "content");
const DEFAULT_LOCALE = "pt-BR";

export type ArticleMeta = {
  slug: string;
  title: string;
  description?: string;
};

async function exists(target: string): Promise<boolean> {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

function articlesDir(locale: string): string {
  return path.join(CONTENT_ROOT, locale, "articles");
}

export async function listArticles(locale: string): Promise<ArticleMeta[]> {
  const candidates = [articlesDir(locale), articlesDir(DEFAULT_LOCALE)];
  const dir = (await exists(candidates[0])) ? candidates[0] : candidates[1];
  if (!(await exists(dir))) return [];

  const files = (await fs.readdir(dir)).filter((file) => file.endsWith(".mdx"));
  const articles: ArticleMeta[] = [];

  for (const file of files) {
    const raw = await fs.readFile(path.join(dir, file), "utf8");
    const { data } = matter(raw);
    articles.push({
      slug: file.replace(/\.mdx$/, ""),
      title: String(data.title ?? file.replace(/\.mdx$/, "")),
      description: data.description ? String(data.description) : undefined,
    });
  }

  return articles.sort((a, b) => a.title.localeCompare(b.title));
}

export async function getArticle(
  locale: string,
  slug: string,
): Promise<{ title: string; description?: string; content: string } | null> {
  const candidates = [
    path.join(articlesDir(locale), `${slug}.mdx`),
    path.join(articlesDir(DEFAULT_LOCALE), `${slug}.mdx`),
  ];

  for (const candidate of candidates) {
    if (await exists(candidate)) {
      const raw = await fs.readFile(candidate, "utf8");
      const { data, content } = matter(raw);
      return {
        title: String(data.title ?? slug),
        description: data.description ? String(data.description) : undefined,
        content,
      };
    }
  }

  return null;
}

export async function getGlossary(locale: string): Promise<string | null> {
  const candidates = [
    path.join(CONTENT_ROOT, locale, "glossary.mdx"),
    path.join(CONTENT_ROOT, DEFAULT_LOCALE, "glossary.mdx"),
  ];

  for (const candidate of candidates) {
    if (await exists(candidate)) {
      const raw = await fs.readFile(candidate, "utf8");
      return matter(raw).content;
    }
  }

  return null;
}
