"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useState } from "react";

import HeaderAccountPill, { GuestPill } from "./HeaderAccountPill";
import { FEATURES } from "@/lib/features";

// Filtered rather than commented out: this one list drives both the desktop
// nav and the mobile menu, so dropping the entry removes it from both. The
// nav is a flex row with gap, so no separator is left stranded.
const NAV_LINKS = [
  { href: "/", label: "בית" },
  { href: "/recipes", label: "מתכונים" },
  { href: "/dates", label: "דייטים" },
  { href: "/games", label: "משחקים" },
  ...(FEATURES.gifts ? [{ href: "/gifts", label: "מתנות" }] : []),
  { href: "/contact", label: "צור קשר" },
];

/** Repeated inside the mobile menu only — see the note at their render site. */
const UTILITY_LINKS = [
  { href: "/search", label: "חיפוש באתר" },
  { href: "/favorites", label: "המועדפים שלי" },
  { href: "/account", label: "החשבון שלי" },
];

/** Shared site header: brand, main nav (with active-link highlighting) and
 * the search/favorites/account icons + mobile menu toggle. Used on every
 * page, matching the identical header markup every original .html page
 * repeated. */
export default function Header() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className="site-header">
      <div className="header-inner container">
        <Link href="/" className="brand" aria-label="רותם עדיני - דף הבית">
          <span className="brand-heart">♡</span>
          <span className="brand-name">רותם עדיני</span>
        </Link>

        <nav className={`main-nav${menuOpen ? " open" : ""}`} id="mainNav" aria-label="ניווט ראשי">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={isActive(link.href) ? "active" : ""}
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          {/* Search, favourites and account live in the icon row on desktop,
              but that row sheds the search icon below 640px and the pill below
              980px — so on a phone these were unreachable. They are repeated
              inside the menu and hidden again on desktop (.nav-utility). */}
          {UTILITY_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`nav-utility${isActive(link.href) ? " active" : ""}`}
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="header-actions">
          <Link className="icon-btn account-link" href="/search" aria-label="חיפוש באתר" title="חיפוש">
            ⌕
          </Link>
          <Link className="icon-btn account-link" href="/favorites" aria-label="מועדפים" title="מועדפים">
            ♡
          </Link>
          <Link className="icon-btn account-link" href="/account" aria-label="חשבון משתמש" title="חשבון משתמש">
            ♙
          </Link>
          {/* Suspense keeps HeaderAccountPill's useSearchParams() from opting
              every statically generated page into client-side rendering. The
              fallback is the guest pill, which is what the static HTML would
              have shown anyway. */}
          <Suspense fallback={<GuestPill />}>
            <HeaderAccountPill />
          </Suspense>
          <button
            className="menu-btn"
            id="menuBtn"
            aria-label="פתיחת תפריט"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            ☰
          </button>
        </div>
      </div>
    </header>
  );
}
