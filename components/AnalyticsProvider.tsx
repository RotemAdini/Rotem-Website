"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { listenForGameEvents, trackPageView } from "@/lib/analytics";

/**
 * Mounts the site's analytics listeners.
 *
 * **It loads nothing and sends nothing.** With no measurement id configured —
 * which is every environment today — both things it does are inert: the page
 * view call returns immediately, and the bridge listener sits there with
 * nothing dispatching to it. No third-party script is injected from here; see
 * lib/analytics/index.ts for why loading the provider tag is deliberately a
 * separate, visible decision.
 *
 * Two jobs, and they exist for different reasons.
 *
 * The page view has to be explicit because of client-side navigation. Next
 * does not reload the document when a reader moves between pages, so a
 * provider's automatic page-view collection fires once per session and then
 * never again. Watching `usePathname()` is what makes the other 95% of a
 * visit visible.
 *
 * The bridge exists because the games cannot import anything. They are built
 * in separate projects and injected into the page as markup and plain
 * scripts, so they talk to the site by dispatching a DOM event. One
 * implementation of analytics for the whole site is the point — a game
 * carrying its own provider snippet would mean two configurations, two
 * consent states, and two places to check before claiming what the site
 * collects.
 */
export default function AnalyticsProvider() {
  const pathname = usePathname();

  useEffect(() => listenForGameEvents(), []);

  useEffect(() => {
    if (!pathname) return;
    trackPageView(pathname, document.title);
  }, [pathname]);

  return null;
}
