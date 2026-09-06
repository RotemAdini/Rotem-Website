import type { Metadata } from "next";
import ContactForm from "@/components/ContactForm";

export const metadata: Metadata = {
  title: "צור קשר | רותם עדיני",
  description: "רותם עדיני — מתכונים, דייטים, משחקים ומתנות.",
};

export default function ContactPage() {
  return (
    <main className="page-main">
      <section className="contact-page container">
        <div className="contact-copy">
          <span className="eyebrow">יש לכם שאלה, רעיון או הצעה?</span>
          <h1>
            בואו נדבר <span>♡</span>
          </h1>
          <p>אפשר לפנות אליי לגבי האתר, משחקים, מתכונים, שיתופי פעולה או כל דבר אחר שמתאים.</p>

          <div className="contact-cards">
            <a href="mailto:hello@rotemadini.com">
              <span>✉</span>
              <div>
                <strong>אימייל</strong>
                <small>hello@rotemadini.com</small>
              </div>
            </a>
            <a href="#">
              <span>◎</span>
              <div>
                <strong>Instagram</strong>
                <small>@rotemadini</small>
              </div>
            </a>
          </div>
        </div>

        <ContactForm />
      </section>
    </main>
  );
}
