export const reservedPageSlugs = new Set(["admin", "index", "privacy", "terms"]);

export function isReservedPageSlug(slug: string): boolean {
  return reservedPageSlugs.has(slug);
}
