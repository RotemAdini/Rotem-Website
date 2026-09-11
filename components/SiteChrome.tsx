"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

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

  if (pathname?.startsWith("/studio")) return <>{children}</>;

  return (
    <>
      <a className="skip-link" href="#main-content">
        דילוג לתוכן הראשי
      </a>
      {header}
      <div id="main-content">{children}</div>
      {footer}
      {accessibilityControls}
    </>
  );
}
