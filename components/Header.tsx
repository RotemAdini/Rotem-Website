"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";

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
  const navRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  // Distinguishes "the menu was closed" from "the menu never opened", so the
  // first render does not yank focus onto the burger button.
  const wasOpen = useRef(false);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  /** Closes the menu and puts focus back where the reader left it. Used by
   * Escape and by the click-outside handler; a link click navigates instead,
   * so it deliberately does not return focus. */
  const closeMenu = useCallback((returnFocus: boolean) => {
    setMenuOpen(false);
    if (returnFocus) menuButtonRef.current?.focus();
  }, []);

  /**
   * Moves focus into the menu when it opens.
   *
   * The nav sits *before* the burger button in the DOM — it has to, because on
   * desktop it is the centre column of the header grid. Below 980px it becomes
   * a fixed panel that drops below the button, so a reader who opened it with
   * the keyboard and pressed Tab used to sail straight past it into the page
   * and had to Shift+Tab ten times back to reach it. Below 980px this menu is
   * also the only route to search/favourites/account, since the icon row sheds
   * them at that width — so "unreachable menu" meant "unreachable account".
   *
   * Focusing the first link on open makes the panel behave the way its visual
   * position implies, and Escape/close hands focus back to the button.
   */
  useEffect(() => {
    if (menuOpen) {
      wasOpen.current = true;
      navRef.current?.querySelector<HTMLAnchorElement>("a")?.focus();
      return;
    }
    if (wasOpen.current) wasOpen.current = false;
  }, [menuOpen]);

  // Escape closes from anywhere, which is what a reader who has tabbed into
  // the page body still expects of an open overlay.
  useEffect(() => {
    if (!menuOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu(true);
    };
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (navRef.current?.contains(target) || menuButtonRef.current?.contains(target)) return;
      closeMenu(false);
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [menuOpen, closeMenu]);

  return (
    <header className="site-header">
      <div className="header-inner container">
        <Link href="/" className="brand" aria-label="רותם עדיני - דף הבית">
          <span className="brand-heart">♡</span>
          <span className="brand-name">רותם עדיני</span>
        </Link>

        <nav className={`main-nav${menuOpen ? " open" : ""}`} id="mainNav" aria-label="ניווט ראשי" ref={navRef}>
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={isActive(link.href) ? "active" : ""}
              aria-current={isActive(link.href) ? "page" : undefined}
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
              aria-current={isActive(link.href) ? "page" : undefined}
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* DOM order here is deliberate and is the RTL *reading* order of the
            row, not its left-to-right order.

            This row used to carry `direction:ltr` purely to lay itself out,
            which silently reversed the correspondence between what a Hebrew
            reader sees first (the rightmost control) and what Tab reaches
            first (the first element in the DOM). The row now inherits the
            document's RTL direction, so the first child renders rightmost and
            focus order matches reading order. The rendered geometry is
            unchanged at every breakpoint — the burger leads because it is the
            rightmost control on mobile, where it is the only one of the five
            that is visible alongside the two icons. */}
        <div className="header-actions">
          <button
            className="menu-btn"
            id="menuBtn"
            type="button"
            aria-label={menuOpen ? "סגירת תפריט" : "פתיחת תפריט"}
            aria-expanded={menuOpen}
            aria-controls="mainNav"
            ref={menuButtonRef}
            onClick={() => setMenuOpen((open) => !open)}
          >
            ☰
          </button>
          {/* Suspense keeps HeaderAccountPill's useSearchParams() from opting
              every statically generated page into client-side rendering. The
              fallback is the guest pill, which is what the static HTML would
              have shown anyway. */}
          <Suspense fallback={<GuestPill />}>
            <HeaderAccountPill />
          </Suspense>
          <Link className="icon-btn account-link" href="/account" aria-label="חשבון משתמש" title="חשבון משתמש">
            ♙
          </Link>
          <Link className="icon-btn account-link" href="/favorites" aria-label="מועדפים" title="מועדפים">
            ♡
          </Link>
          <Link className="icon-btn account-link search-link" href="/search" aria-label="חיפוש באתר" title="חיפוש">
            ⌕
          </Link>
        </div>
      </div>
    </header>
  );
}
