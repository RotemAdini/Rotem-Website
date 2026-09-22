/**
 * The display preferences the accessibility panel writes, and the one-line
 * script that applies them before the page paints.
 *
 * The key and the attribute names live here rather than inside the panel
 * component because two places need them: the React component that lets a
 * reader change them, and a blocking script in <head> that has to apply the
 * stored answer before anything is drawn.
 *
 * Why the blocking script exists. The panel is a Client Component, so it can
 * only read localStorage after hydration. Measured on a cold load: at the
 * `load` event <html> still carried no data-high-contrast attribute, and the
 * high-contrast palette only appeared once React had hydrated. A reader who
 * has chosen high contrast because they cannot comfortably read the default
 * palette was therefore shown the default palette first, every single
 * navigation. Applying it in <head> removes that flash.
 */

export const ACCESSIBILITY_STORAGE_KEY = "rotem-accessibility-preferences";

export interface AccessibilityPreferences {
  highContrast: boolean;
  underlineLinks: boolean;
}

export const ACCESSIBILITY_DEFAULTS: AccessibilityPreferences = {
  highContrast: false,
  underlineLinks: false,
};

/**
 * A custom event any script on the page may dispatch on `window` to open the
 * accessibility panel:
 *
 *   window.dispatchEvent(new CustomEvent("rotem:accessibility-open"))
 *
 * This exists for pages that cannot reach React state — the game pages are
 * injected as raw HTML and driven by plain scripts under public/games/ — and
 * for a future full-screen game that hides the site chrome and needs its own
 * small trigger. The panel itself stays the single implementation; a caller
 * only asks for it to be shown.
 */
export const ACCESSIBILITY_OPEN_EVENT = "rotem:accessibility-open";

/**
 * Runs before first paint, inside a try/catch because localStorage throws
 * outright in a browser with site data blocked, and a throw here would abort
 * the rest of the inline script. Anything unreadable simply leaves the
 * defaults in place, which is what the panel would have rendered anyway.
 */
export const ACCESSIBILITY_INIT_SCRIPT = `try{var p=JSON.parse(localStorage.getItem(${JSON.stringify(
  ACCESSIBILITY_STORAGE_KEY,
)})||"{}");var d=document.documentElement;d.dataset.highContrast=String(p.highContrast===true);d.dataset.underlineLinks=String(p.underlineLinks===true)}catch(e){}`;
