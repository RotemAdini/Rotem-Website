import Link from "next/link";

/** Shared site footer — identical on every page of the original site. */
export default function Footer() {
  return (
    <footer className="site-footer" id="contact-footer">
      <div className="footer-inner container">
        <div className="footer-brand">
          <div className="brand footer-logo">
            <span className="brand-heart">♡</span>
            <span className="brand-name">רותם עדיני</span>
          </div>
          <p>מתכונים, דייטים, משחקים ורעיונות שעושים קצת יותר כיף ביומיום.</p>
          <div className="social-row">
            <a
              href="https://www.instagram.com/rotem_adini?igsh=MTFrd3VlOXdqdDVubQ%3D%3D&utm_source=qr"
              target="_blank"
              rel="noopener"
              aria-label="Instagram"
            >
              ◎
            </a>
            <a href="https://www.facebook.com/share/16WJDMpdpV/?mibextid=wwXIfr" target="_blank" rel="noopener" aria-label="Facebook">
              f
            </a>
            <a href="https://www.tiktok.com/@rotem_adini?_t=ZS-8xCVScFHbYF&_r=1" target="_blank" rel="noopener" aria-label="TikTok">
              ♪
            </a>
            <a href="https://www.youtube.com/@rotemadini" target="_blank" rel="noopener" aria-label="YouTube">
              ▶
            </a>
          </div>
        </div>

        <div className="footer-col">
          <h3>ניווט מהיר</h3>
          <Link href="/">דף הבית</Link>
          <Link href="/recipes">כל המתכונים</Link>
          <Link href="/dates">רעיונות לדייטים</Link>
          <Link href="/games">משחקים לזוג</Link>
          <Link href="/gifts">מתנות</Link>
        </div>

        <div className="footer-col">
          <h3>עוד באתר</h3>
          <Link href="/about">קצת עליי</Link>
          <Link href="/account">החשבון שלי</Link>
          <Link href="/faq">שאלות ותשובות</Link>
          <Link href="/privacy">מדיניות פרטיות</Link>
          <Link href="/terms">תנאי שימוש</Link>
        </div>

        <div className="footer-col">
          <h3>בואו נדבר</h3>
          <Link href="/contact">צור קשר</Link>
          <a href="mailto:hello@rotemadini.com">hello@rotemadini.com ✉</a>
          <span>ישראל ♡</span>
        </div>
      </div>
      <div className="copyright">© 2026 רותם עדיני. כל הזכויות שמורות.</div>
    </footer>
  );
}
