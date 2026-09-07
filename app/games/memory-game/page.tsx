import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import Script from "next/script";
import "@/styles/games/styles.css";
import "@/styles/games/memory-scene.css";
import "@/styles/games/site-integration.css";
import "@/styles/games/game-fidelity.css";

export const metadata: Metadata = {
  title: "משחק הזיכרון הגדול — משחק זוגי דיגיטלי | רותם עדיני",
  description: "משחק הזיכרון הגדול: 40 שאלות שמחזירות אתכם לרגעים ולזיכרונות שכמעט שכחתם, עם ניקוד ותחרות קלילה. ₪48.",
};

const html = fs.readFileSync(path.join(process.cwd(), "content/games/memory-game.html"), "utf8");

// See app/games/forest-game/page.tsx for why this page's interior markup is
// carried over verbatim rather than hand-translated to JSX.
export default function MemoryGamePage() {
  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: html }} />
      <Script src="/games/js/main.js" strategy="afterInteractive" />
      <Script src="/games/js/memory-scene.js" strategy="afterInteractive" />
    </>
  );
}
