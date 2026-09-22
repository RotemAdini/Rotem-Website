import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import ContactForm from "@/components/ContactForm";
import { getContactRecipient, isContactEmailConfigured } from "@/lib/contact/email";
import { issueFormToken } from "@/lib/contact/token";

export const metadata: Metadata = pageMetadata({
  title: "צור קשר | רותם עדיני",
  description: "שאלה על מתכון, על משחק, הצעה לשיתוף פעולה או כל דבר אחר — אפשר לכתוב לי דרך הטופס, במייל או באינסטגרם.",
  path: "/contact",
});

/**
 * Rendered per request, not prerendered.
 *
 * The form carries a signed, time-stamped token so the server can tell a
 * person filling it in from a script posting instantly (see
 * lib/contact/token.ts). A token baked in at build time would be hours or
 * weeks old by the time anyone saw it, and every submission would be
 * rejected as expired.
 */
export const dynamic = "force-dynamic";

export default function ContactPage() {
  const email = getContactRecipient();
  const configured = isContactEmailConfigured();

  return (
    <main className="page-main">
      <section className="contact-page container">
        <div className="contact-copy">
          <span className="eyebrow">יש לכם שאלה, רעיון או הצעה?</span>
          <h1>
            בואו נדבר <span aria-hidden="true">♡</span>
          </h1>
          <p>אפשר לפנות אליי לגבי האתר, משחקים, מתכונים, שיתופי פעולה או כל דבר אחר שמתאים.</p>

          <div className="contact-cards">
            {/* lang="en" on the English runs so a Hebrew screen reader does not
                apply Hebrew phonetics to them (WCAG 3.1.2), and the external
                link says so in its name rather than only in the new-window
                behaviour. */}
            <a href={`mailto:${email}`}>
              <span aria-hidden="true">✉</span>
              <div>
                <strong>אימייל</strong>
                <small lang="en">{email}</small>
              </div>
            </a>
            <a
              href="https://www.instagram.com/rotem_adini"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram: @rotemadini (נפתח בחלון חדש)"
            >
              <span aria-hidden="true">◎</span>
              <div>
                <strong lang="en">Instagram</strong>
                <small lang="en">@rotemadini</small>
              </div>
            </a>
          </div>

          {/* Shown only on a deployment where delivery is not wired up, so a
              reader is told before they write rather than after they press
              send. On production with RESEND_API_KEY set, this never
              renders. */}
          {!configured && (
            <p className="contact-offline-note" role="status">
              <strong>שימו לב:</strong> שליחת הטופס אינה פעילה בסביבה הזו עדיין. עד שתופעל, אפשר לכתוב אליי ישירות
              למייל שלמעלה.
            </p>
          )}
        </div>

        <ContactForm token={issueFormToken()} email={email} />
      </section>
    </main>
  );
}
