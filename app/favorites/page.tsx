import type { Metadata } from "next";
import FavoritesGrid from "@/components/FavoritesGrid";
import { getRecipeFavoriteCatalog } from "@/lib/recipe-favorites";

export const metadata: Metadata = {
  title: "המועדפים שלי | רותם עדיני",
};

export default function FavoritesPage() {
  const recipeCatalog = getRecipeFavoriteCatalog();

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

      <FavoritesGrid recipeCatalog={recipeCatalog} />
    </main>
  );
}
