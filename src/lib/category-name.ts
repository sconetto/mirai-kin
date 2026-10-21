export type LocalizedCategory = {
  name: string;
  nameEn?: string | null;
  namePt?: string | null;
};

export function localizedCategoryName(category: LocalizedCategory, locale: string): string {
  if (locale === "en") return category.nameEn ?? category.name;
  return category.namePt ?? category.name;
}

export function localizedCategoryCompare(
  a: LocalizedCategory,
  b: LocalizedCategory,
  locale: string,
): number {
  return localizedCategoryName(a, locale).localeCompare(
    localizedCategoryName(b, locale),
    locale === "en" ? "en" : "pt-BR",
  );
}
