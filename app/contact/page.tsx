import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import ContactForm from "@/components/ContactForm";

export const metadata: Metadata = pageMetadata({
  title: "צור קשר | רותם עדיני",
  description: "שאלה על מתכון, על משחק, הצעה לשיתוף פעולה או כל דבר אחר — אפשר לכתוב לי דרך הטופס, במייל או באינסטגרם.",
  path: "/contact",
});

export default function ContactPage() {
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
            <a href="mailto:rotemadini@gmail.com">
              <span aria-hidden="true">✉</span>
              <div>
                <strong>אימייל</strong>
                <small lang="en">rotemadini@gmail.com</small>
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
        </div>

        <ContactForm />
      </section>
    </main>
  );
}
