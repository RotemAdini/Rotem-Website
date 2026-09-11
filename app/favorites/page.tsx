import type { Metadata } from "next";
import FavoritesGrid from "@/components/FavoritesGrid";
import { getRecipeFavoriteCatalog } from "@/lib/recipe-favorites";
import { getDateFavoriteCatalog } from "@/lib/date-favorites";

export const metadata: Metadata = {
  title: "המועדפים שלי | רותם עדיני",
};

export default async function FavoritesPage() {
  // Recipes and date ideas both resolve from Sanity now; merged here so the
  // client grid receives one small id -> entry map.
  const [recipeCatalog, dateCatalog] = await Promise.all([getRecipeFavoriteCatalog(), getDateFavoriteCatalog()]);
  const catalog = { ...recipeCatalog, ...dateCatalog };

  return (
    <main className="page-main">
      <section className="page-hero favorites-hero">
        <div className="container simple-hero">
          <span className="eyebrow">כל הדברים ששמרתם</span>
          <h1>
            המועדפים שלי <span>♡</span>
          </h1>
          <p>מתכונים, דייטים, משחקים ומתנות שאהבתם — במקום אחד.</p>
        </div>
      </section>

      <FavoritesGrid catalog={catalog} />
    </main>
  );
}
