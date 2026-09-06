import { Suspense } from "react";
import type { Metadata } from "next";
import RecipesBoard from "@/components/RecipesBoard";
import { getRecipeBoardCards, getRecipeTagOptions } from "@/lib/recipe-board";

export const metadata: Metadata = {
  title: "מתכונים | רותם עדיני",
  description: "רותם עדיני — מתכונים, דייטים, משחקים ומתנות.",
};

export default function RecipesPage() {
  const cards = getRecipeBoardCards();
  const tagOptions = getRecipeTagOptions(cards);

  return (
    <main className="page-main">
      <section className="page-hero compact-hero">
        <div className="container page-hero-grid">
          <div>
            <span className="eyebrow">כל מה שטעים במקום אחד</span>
            <h1>
              המתכונים שלי <span>♡</span>
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
