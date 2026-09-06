import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ToastProvider } from "@/lib/toast-context";
import { FavoritesProvider } from "@/lib/favorites-context";
import AccessibilityControls from "@/components/AccessibilityControls";

export const metadata: Metadata = {
  title: "רותם עדיני | מתכונים, דייטים ומשחקים",
  description: "רותם עדיני — מתכונים, דייטים, משחקים ומתנות.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" data-scroll-behavior="smooth">
      <head>
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
        <a className="skip-link" href="#main-content">דילוג לתוכן הראשי</a>
        <ToastProvider>
          <FavoritesProvider>
            <Header />
            <div id="main-content">{children}</div>
            <Footer />
            <AccessibilityControls />
          </FavoritesProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
