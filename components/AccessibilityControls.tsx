"use client";

import { useEffect, useState } from "react";

type TextScale = "default" | "large" | "larger";

const STORAGE_KEY = "rotem-accessibility-preferences";

interface Preferences {
  scale: TextScale;
  highContrast: boolean;
  underlineLinks: boolean;
}

const defaults: Preferences = { scale: "default", highContrast: false, underlineLinks: false };

/**
 * Small, local accessibility preference panel. It complements semantic HTML
 * and keyboard support; it does not claim to make the site legally compliant.
 */
export default function AccessibilityControls() {
  const [open, setOpen] = useState(false);
  const [preferences, setPreferences] = useState<Preferences>(defaults);

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
    root.dataset.textScale = preferences.scale;
    root.dataset.highContrast = String(preferences.highContrast);
    root.dataset.underlineLinks = String(preferences.underlineLinks);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  }, [preferences]);

  const reset = () => setPreferences(defaults);

  return (
    <div className="accessibility-tools">
      <button
        type="button"
        className="accessibility-trigger"
        aria-label="פתיחת אפשרויות נגישות"
        aria-expanded={open}
        aria-controls="accessibility-panel"
        onClick={() => setOpen((value) => !value)}
      >
        <span aria-hidden="true">♿</span>
        <span>נגישות</span>
      </button>

      {open && (
        <section className="accessibility-panel" id="accessibility-panel" aria-label="אפשרויות נגישות">
          <div className="accessibility-panel-heading">
            <h2>אפשרויות נגישות</h2>
            <button type="button" className="accessibility-close" aria-label="סגירת אפשרויות נגישות" onClick={() => setOpen(false)}>
              ×
            </button>
          </div>
          <p>התאימו את התצוגה לנוחותכם.</p>
          <fieldset>
            <legend>גודל טקסט</legend>
            <div className="accessibility-options">
              {(
                [
                  ["default", "רגיל"],
                  ["large", "גדול"],
                  ["larger", "גדול מאוד"],
                ] as const
              ).map(([scale, label]) => (
                <button
                  key={scale}
                  type="button"
                  className={preferences.scale === scale ? "active" : ""}
                  aria-pressed={preferences.scale === scale}
                  onClick={() => setPreferences((value) => ({ ...value, scale }))}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>
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
