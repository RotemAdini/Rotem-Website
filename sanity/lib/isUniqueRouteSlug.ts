import type { SlugValidationContext } from "@sanity/types";

/** A route remains owned by its document after a slug change or migration. */
export async function isUniqueRouteSlug(slug: string, context: SlugValidationContext): Promise<boolean> {
  const document = context.document;
  if (!document?._id || !document._type) return false;
  const id = document._id.replace(/^drafts\./, "");
  return context.getClient({ apiVersion: "2026-09-07" }).fetch<boolean>(
    `count(*[
      _type == $type && !(_id in [$id, $draftId]) &&
      (slug.current == $slug || $slug in slugHistory[].slug || $slug in legacyRouteIds)
    ]) == 0`,
    { type: document._type, id, draftId: `drafts.${id}`, slug },
    // Include other editors' drafts as well as published URL reservations.
    { perspective: "raw", useCdn: false },
  );
}
