import type { Metadata } from "next";
import SearchBoard from "@/components/SearchBoard";
import { getSearchIndex } from "@/lib/search-index";

export const metadata: Metadata = {
  title: "חיפוש | רותם עדיני",
};

export default async function SearchPage() {
  const index = await getSearchIndex();
  return (
    <main className="page-main">
      <SearchBoard index={index} />
    </main>
  );
}
