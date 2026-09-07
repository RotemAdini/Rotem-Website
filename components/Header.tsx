"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV_LINKS = [
  { href: "/", label: "בית" },
  { href: "/recipes", label: "מתכונים" },
  { href: "/dates", label: "דייטים" },
  { href: "/games", label: "משחקים" },
  { href: "/gifts", label: "מתנות" },
  { href: "/contact", label: "צור קשר" },
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
          <Link className="guest-pill" href="/account">
            <span>שלום, אורחת</span>
            <strong>להתחברות</strong>
          </Link>
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
