import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import { getGameMetadataBySlug } from "@/lib/sanity/games";
import { gameCardImage } from "@/lib/sanity/game-adapters";
import { pageMetadata } from "@/lib/seo";
import Script from "next/script";
import "@/styles/games/styles.css";
import "@/styles/games/memory-scene.css";
import "@/styles/games/site-integration.css";
import "@/styles/games/game-fidelity.css";

/**
 * SEO metadata is the one piece of this page's content that now comes from
 * Sanity: it is pure product copy, it changes with no layout implication,
 * and it was previously duplicated here in code. Everything else on this
 * page — its markup, styling, animations and gameplay scripts — stays
 * exactly where it is, owned by this route's own code.
 *
 * The previous hardcoded strings remain as the fallback, so the page still
 * renders a correct title if Sanity is unreachable at build time.
 */
export async function generateMetadata(): Promise<Metadata> {
  const game = await getGameMetadataBySlug("memory-game");
  return pageMetadata({
    title: game?.seoTitle?.trim() || "משחק הזיכרון הגדול — משחק זוגי דיגיטלי | רותם עדיני",
    description: game?.seoDescription?.trim() || "משחק הזיכרון הגדול: 40 שאלות שמחזירות אתכם לרגעים ולזיכרונות שכמעט שכחתם, עם ניקוד ותחרות קלילה. ₪48 — הרכישה המקוונת נפתחת בקרוב.",
    path: "/games/memory-game",
    // The product photo, so a link shared to WhatsApp or Instagram shows
    // the game rather than a bare URL.
    image: game ? gameCardImage(game) ?? null : null,
  });
}

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
