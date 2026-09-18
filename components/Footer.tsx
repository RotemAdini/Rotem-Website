import Link from "next/link";

import { FEATURES } from "@/lib/features";

/** Shared site footer — identical on every page of the original site. */
export default function Footer() {
  return (
    <footer className="site-footer" id="contact-footer">
      <div className="footer-inner container">
        <div className="footer-brand">
          <div className="brand footer-logo">
            <span className="brand-heart" aria-hidden="true">
              ♡
            </span>
            <span className="brand-name">רותם עדיני</span>
          </div>
          <p>מתכונים, דייטים, משחקים ורעיונות שעושים קצת יותר כיף ביומיום.</p>
          {/* The network names are English words inside a lang="he" document.
              Without lang="en" a Hebrew screen reader applies Hebrew
              pronunciation rules to them (WCAG 3.1.2). The glyphs standing in
              for the logos are decoration — the aria-label carries the name. */}
          <nav className="social-row" aria-label="רשתות חברתיות">
            <a
              href="https://www.instagram.com/rotem_adini?igsh=MTFrd3VlOXdqdDVubQ%3D%3D&utm_source=qr"
              target="_blank"
              rel="noopener noreferrer"
              lang="en"
              aria-label="Instagram (נפתח בחלון חדש)"
            >
              <span aria-hidden="true">◎</span>
            </a>
            <a
              href="https://www.facebook.com/share/16WJDMpdpV/?mibextid=wwXIfr"
              target="_blank"
              rel="noopener noreferrer"
              lang="en"
              aria-label="Facebook (נפתח בחלון חדש)"
            >
              <span aria-hidden="true">f</span>
            </a>
            <a
              href="https://www.tiktok.com/@rotem_adini?_t=ZS-8xCVScFHbYF&_r=1"
              target="_blank"
              rel="noopener noreferrer"
              lang="en"
              aria-label="TikTok (נפתח בחלון חדש)"
            >
              <span aria-hidden="true">♪</span>
            </a>
            <a
              href="https://www.youtube.com/@rotemadini"
              target="_blank"
              rel="noopener noreferrer"
              lang="en"
              aria-label="YouTube (נפתח בחלון חדש)"
            >
              <span aria-hidden="true">▶</span>
            </a>
          </nav>
        </div>

        {/* h2, not h3: on a page whose only other heading is the <h1> these
            were the first headings after it, so the level jumped h1 -> h3
            (axe heading-order). They render at the same size as before. */}
        <div className="footer-col">
          <h2>ניווט מהיר</h2>
          <Link href="/">דף הבית</Link>
          <Link href="/recipes">כל המתכונים</Link>
          <Link href="/dates">רעיונות לדייטים</Link>
          <Link href="/games">משחקים לזוג</Link>
          {FEATURES.gifts && <Link href="/gifts">מתנות</Link>}
        </div>

        <div className="footer-col">
          <h2>עוד באתר</h2>
          <Link href="/about">קצת עליי</Link>
          <Link href="/account">החשבון שלי</Link>
          <Link href="/faq">שאלות ותשובות</Link>
          <Link href="/privacy">מדיניות פרטיות</Link>
          <Link href="/terms">תנאי שימוש</Link>
          {/* Regulation 35(ה) requires the accessibility statement to be
              published where it can be found from anywhere on the site. */}
          <Link href="/accessibility">הצהרת נגישות</Link>
        </div>

        <div className="footer-col">
          <h2>בואו נדבר</h2>
          <Link href="/contact">צור קשר</Link>
          <a href="mailto:rotemadini@gmail.com">
            <span lang="en">rotemadini@gmail.com</span> <span aria-hidden="true">✉</span>
          </a>
          <span>
            ישראל <span aria-hidden="true">♡</span>
          </span>
        </div>
      </div>
      <div className="copyright">© 2026 רותם עדיני. כל הזכויות שמורות.</div>
    </footer>
  );
}
