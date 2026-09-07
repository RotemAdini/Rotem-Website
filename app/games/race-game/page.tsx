import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import Script from "next/script";
import "@/styles/games/styles.css";
import "@/styles/games/site-integration.css";
import "@/styles/games/game-fidelity.css";

export const metadata: Metadata = {
  title: "מירוץ האהבה — משחק זוגי דיגיטלי | רותם עדיני",
  description: "מירוץ האהבה: 11 תחנות של תחרות, צחוק ואתגרים זוגיים. משחק דיגיטלי שנשלח מיידית למייל. ₪48.",
};

const html = fs.readFileSync(path.join(process.cwd(), "content/games/race-game.html"), "utf8");

// See app/games/forest-game/page.tsx for why this page's interior markup is
// carried over verbatim rather than hand-translated to JSX.
export default function RaceGamePage() {
  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: html }} />
      <Script src="/games/js/main.js" strategy="afterInteractive" />
    </>
  );
}
