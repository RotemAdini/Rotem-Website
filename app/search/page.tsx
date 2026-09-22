import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import SearchBoard from "@/components/SearchBoard";
import { getSearchIndex } from "@/lib/search-index";

/** The results live entirely in the browser — the URL never carries the
 * query — so there is no stable page here for a crawler to index. It is left
 * out of the sitemap for the same reason. */
export const metadata: Metadata = pageMetadata({
  title: "חיפוש | רותם עדיני",
  description: "חיפוש חופשי בכל המתכונים, רעיונות הדייטים והמשחקים באתר.",
  path: "/search",
  noIndex: true,
});

export default async function SearchPage() {
  const index = await getSearchIndex();
  return (
    <main className="page-main">
      <SearchBoard index={index} />
    </main>
  );
}
