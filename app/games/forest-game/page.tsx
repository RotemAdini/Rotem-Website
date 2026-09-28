import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import { getGameMetadataBySlug } from "@/lib/sanity/games";
import { gameCardImage } from "@/lib/sanity/game-adapters";
import { pageMetadata } from "@/lib/seo";
import { ownsGame } from "@/lib/entitlements/read";
import {
  FOREST_GAME_CONTENT_ID,
  FOREST_GAME_PLAY_PATH,
} from "@/lib/entitlements/require-game-access";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getSupabaseUser } from "@/lib/supabase/server";
import Script from "next/script";
import "@/styles/games/styles.css";
import "@/styles/games/forest-scene.css";
import "@/styles/games/site-integration.css";
import "@/styles/games/game-fidelity.css";
import "@/styles/games/sales.css";

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
  const game = await getGameMetadataBySlug("forest-game");
  return pageMetadata({
    title: game?.seoTitle?.trim() || "היער הקסום — סיפור זוגי שמתחיל בערב שקט | רותם עדיני",
    description: game?.seoDescription?.trim() || "חוויה זוגית דיגיטלית בתוך סיפור מאויר ומסתורי שמוציא אתכם יחד מהשגרה. זה לא עוד דייט. זה ערב שלא תשכחו.",
    path: "/games/forest-game",
    image: game ? gameCardImage(game) ?? null : null,
  });
}

const html = fs.readFileSync(path.join(process.cwd(), "content/games/forest-game.html"), "utf8");

type ForestAccessState = "signed-out" | "entitled" | "purchase";

async function getForestAccessState(): Promise<ForestAccessState> {
  if (!isSupabaseConfigured) return "signed-out";

  try {
    const user = await getSupabaseUser();
    if (!user) return "signed-out";
    return (await ownsGame(FOREST_GAME_CONTENT_ID)) ? "entitled" : "purchase";
  } catch {
    // Catalog/auth/database errors fail closed into the non-playing purchase UI.
    return "purchase";
  }
}

function renderAccessAwareHtml(source: string, access: ForestAccessState, accessRequired: boolean): string {
  let rendered = source;
  const owned = access === "entitled";

  const ownershipBadge = owned
    ? '<div class="forest-access-status"><p class="forest-ownership-badge forest-ownership-badge--owned"><span aria-hidden="true">🔓</span> נרכש</p></div>'
    : '<div class="forest-access-status"><p class="forest-ownership-badge forest-ownership-badge--locked"><span aria-hidden="true">🔒</span> נעול</p></div>';
  const accessNotice = accessRequired
    ? '<p class="forest-access-notice" role="status">המשחק זמין לחשבונות עם גישה פעילה. אפשר להתחבר או להמשיך לתהליך הרכישה.</p>'
    : "";
  rendered = rendered.replace(
    '<div class="lp lp--forest">',
    `<div class="lp lp--forest">${ownershipBadge}${accessNotice}`,
  );

  if (access !== "purchase") {
    const href = access === "entitled"
      ? FOREST_GAME_PLAY_PATH
      : `/account?next=${encodeURIComponent(FOREST_GAME_PLAY_PATH)}`;
    const label = access === "entitled" ? "💜 לשחק עכשיו" : "💜 התחברות והמשך";
    const newTabAttributes = owned
      ? ' target="_blank" rel="noopener noreferrer" aria-label="לשחק עכשיו — נפתח בחלון חדש"'
      : "";
    rendered = rendered.replace(
      /<a href="#purchase"([^>]*)>[^<]*<\/a>/g,
      `<a href="${href}"${newTabAttributes}$1>${label}</a>`,
    );
  }

  return rendered;
}

// This page's markup is carried over verbatim from the original
// games/forest-game.html (see content/games/forest-game.html) instead of
// being hand-translated to JSX: it's a large, animation-heavy, hand-tuned
// landing page (parallax layers, fireflies, character medallions, a real
// lead-generation form posting to an external provider) where a manual
// line-by-line port risks introducing subtle visual/markup bugs. The
// surrounding shell (header/footer, fonts, this page's own CSS/JS) is fully
// migrated to Next.js; only this one page's interior keeps its original
// HTML, exactly like the source file.
export default async function ForestGamePage({
  searchParams,
}: {
  searchParams: Promise<{ access?: string }>;
}) {
  const [{ access }, accessState] = await Promise.all([searchParams, getForestAccessState()]);
  const pageHtml = renderAccessAwareHtml(html, accessState, access === "required");

  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: pageHtml }} />
      <Script src="/games/js/main.js" strategy="afterInteractive" />
      <Script src="/games/js/forest-scene.js" strategy="afterInteractive" />
    </>
  );
}
