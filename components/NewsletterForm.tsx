import Link from "next/link";

/**
 * The homepage "join the updates" block.
 *
 * There is deliberately no email field here. A mailing list needs somewhere to
 * put the address, and nothing on this site stores one yet — the previous
 * version collected an email, dropped it, and told the reader
 * "נרשמת לעדכונים בהצלחה ♡". Rather than keep an input that goes nowhere
 * (honest toast or not), the block points at the channels that do work today.
 *
 * When a provider is wired up, this becomes a real form again; until then it
 * promises nothing it cannot keep.
 */
export default function NewsletterForm() {
  return (
    <div className="newsletter-links">
      <p className="newsletter-status">
        רשימת התפוצה עדיין בהקמה — בינתיים כל מתכון, משחק ורעיון חדש עולה קודם כל לאינסטגרם.
      </p>
      <div className="newsletter-actions">
        <a
          className="btn btn-primary"
          href="https://www.instagram.com/rotem_adini"
          target="_blank"
          rel="noopener noreferrer"
        >
          לעקוב באינסטגרם
        </a>
        <Link className="btn btn-secondary" href="/contact">
          לכתוב לי ישירות
        </Link>
      </div>
    </div>
  );
}
