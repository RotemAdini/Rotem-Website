import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ToastProvider } from "@/lib/toast-context";
import { FavoritesProvider } from "@/lib/favorites-context";
import AccessibilityControls from "@/components/AccessibilityControls";
import SiteChrome from "@/components/SiteChrome";
import { SITE_NAME, SITE_URL } from "@/lib/seo";
import { ACCESSIBILITY_INIT_SCRIPT } from "@/lib/accessibility-preferences";

/**
 * `metadataBase` is the piece that has to live here rather than on a page: it
 * is what every relative URL in a page's metadata — canonical, og:image — is
 * resolved against. Without it Next resolves them against its own
 * http://localhost:3000 fallback and logs a build warning, which is exactly
 * what the two pages declaring a canonical were doing.
 *
 * Deliberately NOT set here: `alternates` and a per-page `openGraph`. Next
 * merges metadata shallowly down the tree, so a canonical or an og:title
 * declared at the root is inherited verbatim by every page that does not
 * override it — which would point the whole site's canonicals at the
 * homepage. Pages build their own through `pageMetadata()` in lib/seo.ts.
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: `${SITE_NAME} | מתכונים, דייטים ומשחקים`,
  description: "רותם עדיני — מתכונים, דייטים, משחקים ומתנות.",
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning covers exactly one thing: the inline script
    // below writes data-high-contrast / data-underline-links onto this
    // element before React hydrates, which React otherwise reports as a
    // server/client attribute mismatch and refuses to reconcile. It is
    // scoped to <html> itself and does not extend to any child, so a real
    // mismatch inside the page is still reported.
    <html lang="he" dir="rtl" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        {/* Applies a saved high-contrast / underline-links preference before
            the first paint. It has to be a blocking inline script rather
            than an effect: the panel is a Client Component, so anything it
            does happens after hydration, and a reader who needs high
            contrast would see the default palette flash first on every
            navigation. See lib/accessibility-preferences.ts. */}
        <script dangerouslySetInnerHTML={{ __html: ACCESSIBILITY_INIT_SCRIPT }} />
        {/* Google Fonts loaded as plain <link> tags (rather than next/font) so
            the site CSS — carried over verbatim from the original static
            site — can keep referencing the literal "Heebo"/"Rubik" family
            names it already uses everywhere without a rewrite. Switching to
            next/font for automatic optimization is a good follow-up once the
            visual migration is verified. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* The current visual migration intentionally retains the existing font-family names. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700;800&family=Rubik:wght@400;500;600;700&family=Frank+Ruhl+Libre:wght@500;600;700&family=Assistant:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ToastProvider>
          <FavoritesProvider>
            {/* SiteChrome renders the header/footer exactly as before on every
                site page, and steps out of the way for the embedded Sanity
                Studio at /studio, which needs the full viewport. */}
            <SiteChrome header={<Header />} footer={<Footer />} accessibilityControls={<AccessibilityControls />}>
              {children}
            </SiteChrome>
          </FavoritesProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
