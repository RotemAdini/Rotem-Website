/**
 * The site's accessibility panel, opened from inside a full-screen game.
 *
 * rotemadini.com owns one accessibility system — contrast, text size, motion,
 * the statement page — and this game deliberately does NOT build a second one.
 * A game that shipped its own toggles would give a visitor two panels whose
 * settings disagree, and would silently stop honouring the site's own
 * preferences the moment the game went full-screen.
 *
 * So this file is the entire integration: one DOM event, dispatched on
 * `window`, that the host's panel listens for.
 *
 *   window.dispatchEvent(new CustomEvent('rotem:accessibility-open'))
 *
 * Nothing is imported, no provider is required, and there is no configuration.
 * If the host has no listener — a standalone build, or the game embedded
 * somewhere else — the event is dropped by the browser and the control simply
 * does nothing visible. That is why the button is not rendered conditionally on
 * some detected capability: there is nothing to detect, and guessing wrong in
 * either direction is worse than a control that occasionally no-ops.
 */

/** The DOM event the host site's accessibility panel listens for. Do not rename. */
export const ACCESSIBILITY_OPEN_EVENT = 'rotem:accessibility-open';

/** Injectable for tests; defaults to `window`. */
export interface AccessibilityTarget {
  dispatchEvent(event: Event): boolean;
}

function defaultTarget(): AccessibilityTarget | null {
  if (typeof window === 'undefined') return null;
  if (typeof window.dispatchEvent !== 'function') return null;
  return window;
}

/**
 * Ask the host site to open its accessibility panel.
 *
 * Never throws. Returns true only when an event was dispatched — which says
 * nothing about whether anybody listened, because the browser cannot tell us
 * that for a plain CustomEvent and the game has no business knowing.
 */
export function openSiteAccessibilityPanel(
  target: AccessibilityTarget | null = defaultTarget(),
): boolean {
  if (!target) return false;
  if (typeof CustomEvent !== 'function') return false;

  try {
    target.dispatchEvent(new CustomEvent(ACCESSIBILITY_OPEN_EVENT, { bubbles: true }));
    return true;
  } catch {
    return false;
  }
}
