import { Suspense } from "react";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import RecipesBoard from "@/components/RecipesBoard";
import { getListedRecipes } from "@/lib/sanity/recipes";
import { boardTagOptions, toBoardCard } from "@/lib/sanity/recipe-adapters";

export const metadata: Metadata = pageMetadata({
  title: "מתכונים | רותם עדיני",
  description: "כל המתכונים של רותם עדיני במקום אחד — מתוקים ומלוחים, עם תנור וללא אפייה. אפשר לסנן לפי קטגוריה, זמן הכנה, רמת קושי וחג.",
  path: "/recipes",
});

export default async function RecipesPage() {
  // Recipes come from Sanity. The board itself is unchanged: it still receives
  // a plain array of cards and does all filtering and sorting on the client.
  const cards = (await getListedRecipes()).map(toBoardCard);
  const tagOptions = boardTagOptions(cards);

  return (
    <main className="page-main">
      <section className="page-hero compact-hero">
        <div className="container page-hero-grid">
          <div>
            <span className="eyebrow">כל מה שטעים במקום אחד</span>
            <h1>
              המתכונים שלי <span aria-hidden="true">♡</span>
            </h1>
            <p>מחפשים משהו מתוק, מהיר, בלי אפייה או פשוט רעיון לארוחת ערב? כאן אפשר לסנן עד שתמצאו בדיוק מה שמתאים.</p>
          </div>
          <div className="page-hero-art recipe-art">
            <img alt="" />
          </div>
        </div>
      </section>

      <Suspense>
        <RecipesBoard cards={cards} tagOptions={tagOptions} />
      </Suspense>
    </main>
  );
}
