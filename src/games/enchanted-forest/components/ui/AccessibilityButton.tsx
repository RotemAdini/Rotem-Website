import { openSiteAccessibilityPanel } from '../../../../shared/accessibility/accessibilityBridge.ts';
import styles from './AccessibilityButton.module.css';

/**
 * Opens the HOST SITE's accessibility panel. It has no settings of its own.
 *
 * The game runs full-screen, which takes the site's own accessibility control
 * off the screen exactly when somebody is most likely to want it — an hour into
 * a dark, text-over-artwork experience. This puts it back, without duplicating
 * a single setting: see `shared/accessibility/accessibilityBridge.ts`.
 */
export function AccessibilityButton() {
  return (
    <button
      type="button"
      className={styles.button}
      onClick={() => openSiteAccessibilityPanel()}
      // Named for what it does, not for the icon it draws. The title gives
      // sighted mouse users the same sentence as the accessible name.
      aria-label="פתיחת הגדרות הנגישות של האתר"
      title="הגדרות נגישות"
    >
      <span className={styles.chip}>
        {/*
          The international accessibility mark, drawn rather than pulled from an
          icon font: one less network dependency on a host page, and it inherits
          `currentColor` so forced-colors mode can repaint it.
        */}
        <svg className={styles.glyph} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <circle cx="12" cy="4.2" r="1.9" fill="currentColor" stroke="none" />
          <path d="M4.5 8.3c2.4.8 4.9 1.2 7.5 1.2s5.1-.4 7.5-1.2" />
          <path d="M12 9.5v5" />
          <path d="M12 14.5 9 21" />
          <path d="m12 14.5 3 6.5" />
        </svg>
      </span>
    </button>
  );
}
