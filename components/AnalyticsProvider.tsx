"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { consumePendingLogin, listenForGameEvents, listenForInteractionEvents, trackPageView } from "@/lib/analytics";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

/** Whether the browser holds a session, read locally from the auth cookie.
 * Used only to tell a completed sign-in from an abandoned one for analytics;
 * nothing is authorised by it. */
async function hasBrowserSession(): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const { data } = await getSupabaseBrowserClient().auth.getSession();
  return Boolean(data.session);
}

/**
 * Mounts the site's analytics listeners.
 *
 * **It loads nothing and sends nothing.** With no measurement id configured —
 * which is every environment today — everything it does is inert: the page
 * view call returns immediately, and the listeners turn what they observe
 * into trackEvent() calls that return immediately too. No third-party script
 * is injected from here, and no cookie is set; see
 * lib/analytics/index.ts for why loading the provider tag is deliberately a
 * separate, visible decision.
 *
 * Three jobs, and they exist for different reasons. The third — the click
 * and submit listener behind game-card, purchase-CTA and sign-in events — is
 * documented with listenForInteractionEvents() in lib/analytics/index.ts.
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
  useEffect(() => listenForInteractionEvents(), []);

  useEffect(() => {
    if (!pathname) return;
    trackPageView(pathname, document.title);
    // Returns at once unless a Google sign-in was started in this tab.
    void consumePendingLogin(hasBrowserSession);
  }, [pathname]);

  return null;
}
