import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import Script from "next/script";
import "@/styles/games/styles.css";
import "@/styles/games/site-integration.css";
import "@/styles/games/game-fidelity.css";

export const metadata: Metadata = {
  title: "החבילה המלאה — שלושת המשחקים ב-₪110 | רותם עדיני",
  description:
    "החבילה המלאה: היער הקסום, מירוץ האהבה ומשחק הזיכרון הגדול — שלושת המשחקים יחד ב-₪110 במקום ₪144. תשלום חד-פעמי, גישה מיידית לכל החיים.",
};

const html = fs.readFileSync(path.join(process.cwd(), "content/games/bundle.html"), "utf8");

// See app/games/forest-game/page.tsx for why this page's interior markup is
// carried over verbatim rather than hand-translated to JSX.
export default function BundlePage() {
  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: html }} />
      <Script src="/games/js/main.js" strategy="afterInteractive" />
    </>
  );
}
