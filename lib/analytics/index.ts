"use client";

import {
  FORBIDDEN_PARAM_KEYS,
  normaliseGameId,
  type AnalyticsEvent,
  type AnalyticsEventName,
} from "./events";

/**
 * The site's analytics interface.
 *
 * **Nothing here sends anything today, and nothing will until a measurement
 * id is configured.** With no id there is no provider, no script is loaded,
 * no request is made and no cookie is set. `trackEvent` becomes a function
 * call that returns immediately. That is the shipped state, on purpose: the
 * point of this module is that instrumentation can be written into the site
 * now and switched on later, rather than the site being rewritten on the day
 * someone decides they want numbers.
 *
 * Three things it is built to guarantee:
 *
 *   1. **No provider leaks into the application.** Google Analytics 4 is the
 *      likely destination, but the word appears only in `sendToProvider()`
 *      below. Every call site speaks in this site's own events. Changing
 *      provider is a change to one function.
 *   2. **No personal data, even by accident.** The event union in ./events.ts
 *      makes it a build error in TypeScript, and `scrub()` here is the
 *      runtime backstop for callers that are not type-checked — specifically
 *      the games, which ship as plain JavaScript injected into the page.
 *   3. **Failure is silent and harmless.** A reader must never see a broken
 *      page because a measurement call went wrong. Everything is wrapped.
 */

/* --------------------------------------------------------- configuration */

/**
 * Reading the id at module scope is safe and deliberate: it is a
 * NEXT_PUBLIC_ value, so it is public by definition — a measurement id is
 * visible in the page source of every site that uses one — and it is inlined
 * at build time, so this costs nothing at runtime.
 *
 * Empty in every environment today. Setting it is one of the steps in
 * docs/analytics-plan.md, and it is not the only one: the privacy policy has
 * to change in the same deploy.
 */
const MEASUREMENT_ID = (process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "").trim();

/** Whether a destination is configured at all. Exported so a component can
 * avoid doing setup work that would be pointless — not so it can decide
 * whether to call trackEvent(), which is always safe to call. */
export function isAnalyticsEnabled(): boolean {
  return MEASUREMENT_ID.length > 0;
}

/**
 * Turns on console logging of every event instead of sending it.
 *
 * This is how the instrumentation gets reviewed before any provider exists:
 * run the site, use it, and read what would have been sent. It never
 * transmits.
 */
const DEBUG =
  typeof window !== "undefined" &&
  (() => {
    try {
      return window.localStorage.getItem("rotem-analytics-debug") === "1";
    } catch {
      return false;
    }
  })();

/* -------------------------------------------------------------- scrubbing */

/** Longest string a parameter value may be. A value longer than this is
 * almost certainly prose someone typed, which is exactly what must not be
 * here, so it is dropped rather than truncated. */
const MAX_VALUE_LENGTH = 100;

/**
 * Removes anything that must not be measured.
 *
 * Applied to every event on the way out, including events that came through
 * the type system and cannot contain anything bad — belt and braces costs
 * one pass over a handful of keys, and the one caller that bypasses the type
 * system is the one most likely to get it wrong.
 *
 * Three rules: a forbidden key is dropped whatever its value; a long string
 * is dropped because it is prose; anything that is not a string, number or
 * boolean is dropped because a nested object is where personal data hides.
 */
function scrub(params: Record<string, unknown>): Record<string, string | number | boolean> {
  const clean: Record<string, string | number | boolean> = {};

  for (const [key, value] of Object.entries(params)) {
    const lowered = key.toLowerCase();
    if (FORBIDDEN_PARAM_KEYS.includes(lowered)) {
      warn(`dropped forbidden parameter "${key}"`);
      continue;
    }
    if (value === null || value === undefined) continue;

    if (typeof value === "string") {
      if (value.length > MAX_VALUE_LENGTH) {
        warn(`dropped parameter "${key}": ${value.length} characters is free text, not a label`);
        continue;
      }
      clean[key] = value;
      continue;
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      clean[key] = value;
      continue;
    }
    if (typeof value === "boolean") {
      clean[key] = value;
      continue;
    }
    if (Array.isArray(value) && value.every((entry) => typeof entry === "string" && entry.length <= MAX_VALUE_LENGTH)) {
      // Small string arrays are the one structured value that is allowed —
      // game_ids on a bundle purchase is the reason.
      clean[key] = value.join(",");
      continue;
    }
    warn(`dropped parameter "${key}": only strings, numbers, booleans and short string arrays are allowed`);
  }

  return clean;
}

function warn(message: string): void {
  if (process.env.NODE_ENV !== "production") console.warn(`[analytics] ${message}`);
}

/* ----------------------------------------------------------------- public */

/**
 * Records one event.
 *
 * Always safe to call: on the server, before hydration, with no provider
 * configured, with a provider that fails. It never throws and never returns
 * anything a caller has to check.
 */
export function trackEvent<E extends AnalyticsEvent>(name: E["name"], params: E["params"]): void;
export function trackEvent(name: AnalyticsEventName, params: Record<string, unknown> = {}): void {
  try {
    // Server-side rendering has no visitor to attribute anything to, and a
    // page view is recorded by the browser in any case.
    if (typeof window === "undefined") return;

    const clean = scrub(params);

    if (DEBUG) {
      console.info(`[analytics] ${name}`, clean, isAnalyticsEnabled() ? "(would send)" : "(no provider configured)");
    }

    if (!isAnalyticsEnabled()) return;
    sendToProvider(name, clean);
  } catch (error) {
    // A measurement call must never be the reason a page misbehaves.
    warn(`event "${name}" failed: ${String(error)}`);
  }
}

/**
 * Records a page view.
 *
 * Separate from trackEvent because most providers treat page views as their
 * own concept, and because Next's client-side navigation means they do not
 * happen by themselves after the first load — a provider that auto-collects
 * page views will record exactly one per session without help.
 */
export function trackPageView(path: string, title?: string): void {
  try {
    if (typeof window === "undefined") return;

    // The path can carry a query string, and a query string can carry
    // anything. Only the pathname is ever recorded.
    let pathname = path;
    try {
      pathname = new URL(path, window.location.origin).pathname;
    } catch {
      pathname = path.split("?")[0].split("#")[0];
    }

    if (DEBUG) {
      console.info(`[analytics] page_view`, { pathname }, isAnalyticsEnabled() ? "(would send)" : "(no provider configured)");
    }

    if (!isAnalyticsEnabled()) return;
    sendPageViewToProvider(pathname, title);
  } catch (error) {
    warn(`page view failed: ${String(error)}`);
  }
}

/**
 * The bridge the games use.
 *
 * The three games are built in their own projects and are injected into the
 * page as markup plus plain scripts, so they cannot import this module. They
 * dispatch a DOM event instead, and this listener translates it. That keeps
 * one analytics implementation for the whole site — a game must never carry
 * its own GA4 snippet, because then there are two configurations, two
 * consent states and two things to audit.
 *
 * Everything arriving this way is untrusted: the game id is checked against
 * the known list, the event name against the known names, and the parameters
 * go through the same scrub as everything else.
 *
 * Called once, from the analytics provider component.
 */
export const ANALYTICS_EVENT_BRIDGE = "rotem:analytics";

const GAME_EVENT_NAMES: readonly string[] = [
  "game_start",
  "game_resume",
  "game_step_complete",
  "game_complete",
  "game_restart",
  "game_feedback_submit",
  "game_play_click",
];

export function listenForGameEvents(): () => void {
  const handler = (event: Event) => {
    const detail = (event as CustomEvent).detail as { name?: unknown; params?: unknown } | undefined;
    const name = typeof detail?.name === "string" ? detail.name : null;
    if (!name || !GAME_EVENT_NAMES.includes(name)) {
      warn(`ignored bridge event with unknown name: ${String(name)}`);
      return;
    }

    const raw = (detail?.params ?? {}) as Record<string, unknown>;
    const gameId = typeof raw.game_id === "string" ? normaliseGameId(raw.game_id) : null;
    if (!gameId) {
      warn(`ignored "${name}" from the bridge: unknown or missing game_id`);
      return;
    }

    trackEvent(name as AnalyticsEventName, { ...raw, game_id: gameId } as never);
  };

  window.addEventListener(ANALYTICS_EVENT_BRIDGE, handler);
  return () => window.removeEventListener(ANALYTICS_EVENT_BRIDGE, handler);
}

/* --------------------------------------------------------------- provider */

/**
 * The only place a provider is named, and the only thing that changes when
 * GA4 is switched on or swapped out.
 *
 * Both functions are unreachable while MEASUREMENT_ID is empty. When it is
 * set, the GA4 script still has to be loaded — see docs/analytics-plan.md.
 * That script is deliberately NOT loaded here: loading a third-party tag is
 * a decision with privacy-policy consequences, and it should be a visible
 * change in a layout file rather than a side effect of importing a helper.
 */
function sendToProvider(name: string, params: Record<string, string | number | boolean>): void {
  const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
  if (typeof gtag !== "function") {
    warn(`measurement id is set but no provider script is loaded — "${name}" was not sent`);
    return;
  }
  gtag("event", name, params);
}

function sendPageViewToProvider(pathname: string, title?: string): void {
  const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
  if (typeof gtag !== "function") return;
  gtag("event", "page_view", { page_path: pathname, ...(title ? { page_title: title } : {}) });
}
