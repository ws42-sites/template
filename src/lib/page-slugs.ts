export const reservedPageSlugs = new Set(["admin", "api", "index", "privacy", "terms"]);

export function isReservedPageSlug(slug: string): boolean {
  return reservedPageSlugs.has(slug);
}
