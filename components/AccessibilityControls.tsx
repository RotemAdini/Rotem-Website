"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "rotem-accessibility-preferences";

interface Preferences {
  highContrast: boolean;
  underlineLinks: boolean;
}

const defaults: Preferences = { highContrast: false, underlineLinks: false };

/**
 * Small, local accessibility preference panel.
 *
 * It complements semantic HTML, contrast and keyboard support — it does not
 * make the site conformant and must never be described as doing so, on this
 * page or in the accessibility statement. Conformance comes from the site's
 * own markup; this is a convenience layer on top of it.
 *
 * It deliberately offers only what the browser and OS do *not* already do
 * well. A text-size control used to live here and has been removed: the
 * stylesheet declares its type scale in px, so scaling the root font size
 * changed almost nothing on screen while the control claimed "גדול מאוד".
 * Browser zoom does that job correctly (the layout reflows to 320px), so a
 * switch that did not do what it said was worse than no switch at all.
 */
export default function AccessibilityControls() {
  const [open, setOpen] = useState(false);
  const [preferences, setPreferences] = useState<Preferences>(defaults);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- browser-only restoration after hydration
      setPreferences({ ...defaults, ...JSON.parse(stored) });
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.highContrast = String(preferences.highContrast);
    root.dataset.underlineLinks = String(preferences.underlineLinks);
    // A stale data-text-scale from a previous visit would otherwise sit on
    // <html> forever now that nothing writes or reads it.
    delete root.dataset.textScale;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
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

  const reset = () => setPreferences(defaults);

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
        <span aria-hidden="true">♿</span>
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
            aria-pressed={preferences.highContrast}
            onClick={() => setPreferences((value) => ({ ...value, highContrast: !value.highContrast }))}
          >
            ניגודיות גבוהה
          </button>
          <button
            type="button"
            className="accessibility-toggle"
            aria-pressed={preferences.underlineLinks}
            onClick={() => setPreferences((value) => ({ ...value, underlineLinks: !value.underlineLinks }))}
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
