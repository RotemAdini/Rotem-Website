"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  ACCESSIBILITY_DEFAULTS as defaults,
  ACCESSIBILITY_OPEN_EVENT,
  ACCESSIBILITY_STORAGE_KEY as STORAGE_KEY,
  type AccessibilityPreferences as Preferences,
} from "@/lib/accessibility-preferences";

/**
 * Small, local accessibility preference panel.
 *
 * It complements semantic HTML, contrast and keyboard support — it does not
 * make the site conformant and must never be described as doing so, on this
 * page or in the accessibility statement. Conformance comes from the site's
 * own markup; this is a convenience layer on top of it.
 *
 * The stored preference is applied before first paint by a blocking script
 * in the root layout, not by this component's effect — see
 * lib/accessibility-preferences.ts. The effect below still runs, and is what
 * keeps the attributes in step once a reader changes something here.
 *
 * It deliberately offers only what the browser and OS do *not* already do
 * well. A text-size control used to live here and has been removed: the
 * stylesheet declares its type scale in px, so scaling the root font size
 * changed almost nothing on screen while the control claimed "גדול מאוד".
 * Browser zoom does that job correctly (the layout reflows to 320px), so a
 * switch that did not do what it said was worse than no switch at all.
 */
/**
 * The universal accessibility mark, drawn rather than typed.
 *
 * This was the character ♿ (U+267F). On a system whose fonts do not cover
 * that codepoint it renders as a fallback box — and on a phone the label is
 * hidden by CSS, so the glyph is the button's only visual. An icon that can
 * turn into a tofu square is not an icon.
 *
 * Sized in `em` so it keeps tracking the button's font size exactly as the
 * glyph did, and `currentColor` keeps it following the button's colour
 * through hover and the high-contrast palette. `aria-hidden` because the
 * button already carries its name in aria-label; announcing the drawing too
 * would just repeat it.
 */
function AccessibilityIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1.15em"
      height="1.15em"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="12" cy="3.8" r="2" />
      <path d="M20.3 7.2a1.1 1.1 0 0 0-1.3-.85l-4.6.95a10 10 0 0 1-4.8 0L5 6.35a1.1 1.1 0 1 0-.45 2.15l4.1.85v3.3l-2.2 6.6a1.1 1.1 0 0 0 2.1.7l2.1-6.3h.7l2.1 6.3a1.1 1.1 0 0 0 2.1-.7l-2.2-6.6v-3.3l4.1-.85a1.1 1.1 0 0 0 .85-1.3Z" />
    </svg>
  );
}

export default function AccessibilityControls() {
  const [open, setOpen] = useState(false);
  /**
   * null until the stored preference has been read.
   *
   * This distinction is load-bearing, not tidiness. The two effects below
   * used to be "restore into state" and "write state to localStorage", with
   * state starting at `defaults`. Both run on mount, restore first — but a
   * setState from an effect does not change the value the *next* effect in
   * the same commit sees, so the persist effect ran once with the defaults
   * and wrote { highContrast: false, underlineLinks: false } straight over
   * the reader's saved answer before the restore had landed. In production
   * the following render wrote the restored value back, so it mostly
   * self-healed; under React's development double-invoke the second restore
   * read the clobbered value and the preference was lost for good.
   *
   * With null as the starting value the persist effect has an unambiguous
   * "nothing to save yet" state and cannot write before it has read.
   */
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);

  // What the UI shows before the read completes. The panel starts closed, so
  // in practice nobody sees this; it only keeps the first render free of
  // browser-only state, which is what hydration needs.
  const current = preferences ?? defaults;

  useEffect(() => {
    let restored = defaults;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) restored = { ...defaults, ...JSON.parse(stored) };
    } catch {
      // Unparseable, or storage blocked outright. Either way the defaults
      // stand; drop the bad value if we are allowed to.
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* storage unavailable — nothing to clean up */
      }
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- browser-only restoration after hydration
    setPreferences(restored);
  }, []);

  useEffect(() => {
    if (!preferences) return;
    const root = document.documentElement;
    root.dataset.highContrast = String(preferences.highContrast);
    root.dataset.underlineLinks = String(preferences.underlineLinks);
    // A stale data-text-scale from a previous visit would otherwise sit on
    // <html> forever now that nothing writes or reads it.
    delete root.dataset.textScale;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch {
      /* storage blocked: the preference applies for this page view only */
    }
  }, [preferences]);

  const closePanel = useCallback((returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }, []);

  // Escape closes and hands focus back to the trigger, so a keyboard reader
  // is never left with focus on a control that has just disappeared.
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closePanel(true);
    };
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      closePanel(false);
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [open, closePanel]);

  /**
   * Any script on the page may ask for the panel, by dispatching
   * ACCESSIBILITY_OPEN_EVENT on window. That is the integration point for a
   * page that cannot reach React state: the game pages run plain scripts
   * from public/games/, and a full-screen game that hides the site chrome
   * needs a way to bring these controls back without reimplementing them.
   */
  useEffect(() => {
    const onRequest = () => setOpen(true);
    window.addEventListener(ACCESSIBILITY_OPEN_EVENT, onRequest);
    return () => window.removeEventListener(ACCESSIBILITY_OPEN_EVENT, onRequest);
  }, []);

  // Focus follows the panel when it was opened by something other than the
  // trigger, so a keyboard reader who asked for it lands inside it.
  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel || panel.contains(document.activeElement)) return;
    if (document.activeElement === triggerRef.current) return;
    panel.querySelector<HTMLElement>("button")?.focus();
  }, [open]);

  const reset = () => setPreferences(defaults);

  const toggle = (key: keyof Preferences) => setPreferences((value) => ({ ...(value ?? defaults), [key]: !(value ?? defaults)[key] }));

  return (
    <div className="accessibility-tools">
      <button
        type="button"
        className="accessibility-trigger"
        aria-label={open ? "סגירת אפשרויות נגישות" : "פתיחת אפשרויות נגישות"}
        aria-expanded={open}
        aria-controls="accessibility-panel"
        ref={triggerRef}
        onClick={() => (open ? closePanel(true) : setOpen(true))}
      >
        <AccessibilityIcon />
        <span>נגישות</span>
      </button>

      {open && (
        <section className="accessibility-panel" id="accessibility-panel" aria-label="אפשרויות נגישות" ref={panelRef}>
          <div className="accessibility-panel-heading">
            <h2>אפשרויות נגישות</h2>
            <button type="button" className="accessibility-close" aria-label="סגירת אפשרויות נגישות" onClick={() => closePanel(true)}>
              <span aria-hidden="true">×</span>
            </button>
          </div>
          <p>התאמות תצוגה שנשמרות בדפדפן הזה. להגדלת הטקסט אפשר להשתמש בזום של הדפדפן.</p>
          <button
            type="button"
            className="accessibility-toggle"
            aria-pressed={current.highContrast}
            onClick={() => toggle("highContrast")}
          >
            ניגודיות גבוהה
          </button>
          <button
            type="button"
            className="accessibility-toggle"
            aria-pressed={current.underlineLinks}
            onClick={() => toggle("underlineLinks")}
          >
            הדגשת קישורים
          </button>
          <button type="button" className="accessibility-reset" onClick={reset}>
            איפוס התאמות
          </button>
        </section>
      )}
    </div>
  );
}
