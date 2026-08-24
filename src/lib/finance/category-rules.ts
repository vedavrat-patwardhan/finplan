export interface CategoryKeywordRule {
  keyword: string;
  category: string;
}

export function normalizeCategoryKeyword(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLocaleUpperCase("en-IN");
}

export function sortCategoryRules<T extends CategoryKeywordRule>(rules: T[]): T[] {
  return [...rules].sort(
    (a, b) =>
      normalizeCategoryKeyword(b.keyword).length - normalizeCategoryKeyword(a.keyword).length ||
      a.keyword.localeCompare(b.keyword, "en-IN")
  );
}

export function applyCategoryRules(
  text: string,
  fallback: string,
  rules: CategoryKeywordRule[]
): string {
  const haystack = normalizeCategoryKeyword(text);
  if (!haystack) return fallback;

  for (const rule of sortCategoryRules(rules)) {
    const keyword = normalizeCategoryKeyword(rule.keyword);
    if (keyword && haystack.includes(keyword)) return rule.category;
  }

  return fallback;
}

export function transactionCategoryText(input: {
  merchant?: string;
  description?: string;
}): string {
  return `${input.merchant ?? ""} ${input.description ?? ""}`.trim();
}
