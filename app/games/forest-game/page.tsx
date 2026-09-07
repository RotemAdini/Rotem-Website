import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import Script from "next/script";
import "@/styles/games/styles.css";
import "@/styles/games/forest-scene.css";
import "@/styles/games/site-integration.css";
import "@/styles/games/game-fidelity.css";

export const metadata: Metadata = {
  title: "היער הקסום — משחק זוגי דיגיטלי | רותם עדיני",
  description: "היער הקסום: משחק זוגי דיגיטלי של שיחות עומק, משימות מקרבות ורגעי קסם. גישה מיידית במייל, לכל החיים. ₪48.",
};

const html = fs.readFileSync(path.join(process.cwd(), "content/games/forest-game.html"), "utf8");

// This page's markup is carried over verbatim from the original
// games/forest-game.html (see content/games/forest-game.html) instead of
// being hand-translated to JSX: it's a large, animation-heavy, hand-tuned
// landing page (parallax layers, fireflies, character medallions, a real
// lead-generation form posting to an external provider) where a manual
// line-by-line port risks introducing subtle visual/markup bugs. The
// surrounding shell (header/footer, fonts, this page's own CSS/JS) is fully
// migrated to Next.js; only this one page's interior keeps its original
// HTML, exactly like the source file.
export default function ForestGamePage() {
  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: html }} />
      <Script src="/games/js/main.js" strategy="afterInteractive" />
      <Script src="/games/js/forest-scene.js" strategy="afterInteractive" />
    </>
  );
}
