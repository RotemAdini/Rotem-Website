"use client";

import { usePathname } from "next/navigation";
import { useCallback, type MouseEvent, type ReactNode } from "react";

interface SiteChromeProps {
  header: ReactNode;
  footer: ReactNode;
  accessibilityControls: ReactNode;
  children: ReactNode;
}

/**
 * Wraps the site's shared header/footer/accessibility chrome so that the
 * embedded Sanity Studio at /studio can render on its own.
 *
 * The Studio is a full-screen application: the site's RTL header, footer and
 * floating accessibility panel would overlap it and fight its own layout. The
 * alternative — a (site) route group with its own root layout — would mean
 * moving every existing page folder, which this migration is not allowed to
 * do, so a pathname check is the smaller change. Site pages render exactly as
 * before.
 */
export default function SiteChrome({ header, footer, accessibilityControls, children }: SiteChromeProps) {
  const pathname = usePathname();

  /**
   * Moves focus to the page's own <main> landmark.
   *
   * `href="#main-content"` alone pointed at a plain <div> with no tabindex.
   * Whether that actually moves focus — rather than just scrolling — varies by
   * browser and assistive technology, and it is the documented way for a skip
   * link to look like it works while leaving the next Tab back at the top of
   * the page. Focusing the real landmark is unambiguous, and every page here
   * renders exactly one <main> inside this wrapper.
   *
   * The wrapper keeps its id and tabIndex so the plain fragment jump still
   * lands somewhere sensible if this handler never runs.
   */
  const focusMain = useCallback((event: MouseEvent<HTMLAnchorElement>) => {
    const wrapper = document.getElementById("main-content");
    const target = wrapper?.querySelector("main") ?? wrapper;
    if (!target) return;
    event.preventDefault();
    // A <main> is not focusable by default. Setting this on the way in rather
    // than in the page markup keeps all 21 page components untouched, and it
    // is idempotent, so repeated skips are fine.
    if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
    target.focus();
    target.scrollIntoView({ block: "start" });
  }, []);

  if (pathname?.startsWith("/studio")) return <>{children}</>;

  return (
    <>
      <a className="skip-link" href="#main-content" onClick={focusMain}>
        דילוג לתוכן הראשי
      </a>
      {/* Second in the tab order, straight after the skip link, although it
          renders fixed at the bottom-left corner either way.

          It used to be last: measured on the homepage, its trigger was the
          55th and final focusable element, so a keyboard or screen-reader
          user had to traverse the whole page — header, nav, every card, the
          whole footer — before they could reach the control that adjusts the
          display for them. Moving it here costs sighted keyboard users one
          Tab stop and costs nothing visually, because the element is
          position:fixed. */}
      {accessibilityControls}
      {header}
      <div id="main-content" tabIndex={-1}>
        {children}
      </div>
      {footer}
    </>
  );
}
