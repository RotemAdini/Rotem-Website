import "@/styles/studio.css";

/**
 * Layout for the embedded Sanity Studio.
 *
 * The site's root layout still wraps this (App Router allows only one root
 * layout without restructuring every page into a route group), but
 * components/SiteChrome.tsx suppresses the header, footer and accessibility
 * panel for /studio, and styles/studio.css resets the RTL/typography defaults
 * the Studio would otherwise inherit.
 */
export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return <div className="studio-root">{children}</div>;
}
