import type { Metadata } from "next";
import Link from "next/link";

import { requireForestGameAccess } from "@/lib/entitlements/require-game-access";

import ForestGameClient from "./ForestGameClient";
import styles from "./play.module.css";

export const metadata: Metadata = {
  title: "היער הקסום | משחק",
  robots: { index: false, follow: false, nocache: true },
};

export default async function ForestGamePlayPage() {
  await requireForestGameAccess();

  return (
    <main className={styles.page} aria-label="היער הקסום">
      <nav className={styles.toolbar} aria-label="ניווט המשחק">
        <Link className={styles.backLink} href="/games/forest-game">
          <span aria-hidden="true">←</span>
          חזרה לעמוד המשחק
        </Link>
      </nav>
      <div className={styles.stage}>
        <ForestGameClient />
      </div>
    </main>
  );
}
