"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
const STORAGE_KEY = "rotem-games-promo-dismissed-at";
const HIDE_FOR_MS = 7 * 24 * 60 * 60 * 1000;
export default function GamesPromoPopup() {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      const dismissedAt = stored ? Number(stored) : 0;
      if (dismissedAt && Date.now() - dismissedAt < HIDE_FOR_MS) {
        return;
      }
    } catch {
      // If localStorage is unavailable, the popup may still be shown.
    }
    const timer = window.setTimeout(() => {
      previousFocusRef.current = document.activeElement as HTMLElement | null;
      setOpen(true);
    }, 450);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const getFocusable = () =>
      Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );
    getFocusable()[0]?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closePopup();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = getFocusable();
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = oldOverflow;
    };
  }, [open]);
  function rememberDismissal() {
    try {
      window.localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {
      // Ignore storage failures.
    }
  }
  function closePopup() {
    rememberDismissal();
    setOpen(false);
    window.setTimeout(() => {
      previousFocusRef.current?.focus();
    }, 0);
  }
  if (!open) return null;
  return (
    <div
      className="games-promo-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          closePopup();
        }
      }}
    >
      <div
        ref={dialogRef}
        className="games-promo-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="games-promo-title"
        aria-describedby="games-promo-description"
      >
        <button
          type="button"
          className="games-promo-close"
          onClick={closePopup}
          aria-label="סגירת חלון המשחקים"
        >
          ×
        </button>
        <div className="games-promo-art" aria-hidden="true">
          <span>♡</span>
          <span>🎲</span>
          <span>♡</span>
        </div>
        <span className="section-kicker">לערב זוגי קצת אחר</span>
        <h2 id="games-promo-title">
          על המשחקים שלנו כבר שמעתם? <span aria-hidden="true">♡</span>
        </h2>
        <p id="games-promo-description">
          משחקים דיגיטליים לזוגות לערב מצחיק, מקרב ותחרותי — בלי לצאת מהבית.
        </p>
        <Link
          className="btn btn-primary games-promo-cta"
          href="/games"
          onClick={rememberDismissal}
        >
          לכל המשחקים
        </Link>
        <button
          type="button"
          className="games-promo-later"
          onClick={closePopup}
        >
          אולי בפעם אחרת
        </button>
      </div>
    </div>
  );
}