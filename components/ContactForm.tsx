"use client";

import { useState, type FormEvent } from "react";

const EMAIL = "rotemadini@gmail.com";

/**
 * The contact form.
 *
 * There is no message backend on this site, so this form does not pretend to
 * send anything: it composes the message and hands it to the reader's own mail
 * client through a mailto: link. That is a real, completed action — unlike the
 * previous version, which showed a toast and dropped the message.
 *
 * mailto: can fail silently (a browser with no mail handler configured), so a
 * successful submit also reveals the composed text and the address, letting
 * the reader copy it manually. The form never claims the message was sent —
 * only that the mail client was opened.
 */
export default function ContactForm() {
  const [composed, setComposed] = useState<{ subject: string; body: string } | null>(null);
  const [copied, setCopied] = useState(false);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const topic = String(data.get("topic") ?? "").trim();
    const message = String(data.get("message") ?? "").trim();

    const subject = `${topic} — ${name}`;
    const body = `${message}\n\n—\n${name}\n${email}`;

    setComposed({ subject, body });
    setCopied(false);
    window.location.href = `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  async function copyMessage() {
    if (!composed) return;
    try {
      await navigator.clipboard.writeText(`${composed.subject}\n\n${composed.body}`);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <form className="contact-form panel" onSubmit={onSubmit}>
      {/* Explicit label/for associations rather than wrapping.
      
          A wrapping <label> takes its accessible name from everything inside
          it, so the wrapped <select> computed its name as the label text plus
          the text of every <option> — "נושאבחרו נושאשאלה על מתכון…". Explicit
          htmlFor/id pairs give each control exactly its own label (WCAG
          4.1.2/3.3.2), and each field states that it is required in text as
          well as through the required attribute, so the obligation is not
          carried by the browser's tooltip alone (WCAG 3.3.2).
      
          autocomplete lets a browser or password manager fill the two
          personal fields, which matters most to readers with motor or
          cognitive disabilities (WCAG 1.3.5). */}
      <div className="form-row">
        <div className="field">
          <label htmlFor="contact-name">
            שם <span aria-hidden="true">*</span>
            <span className="sr-only">(שדה חובה)</span>
          </label>
          <input
            id="contact-name"
            type="text"
            name="name"
            autoComplete="name"
            placeholder="איך קוראים לכם?"
            required
            aria-required="true"
          />
        </div>
        <div className="field">
          <label htmlFor="contact-email">
            אימייל <span aria-hidden="true">*</span>
            <span className="sr-only">(שדה חובה)</span>
          </label>
          <input
            id="contact-email"
            type="email"
            name="email"
            autoComplete="email"
            placeholder="name@example.com"
            required
            aria-required="true"
          />
        </div>
      </div>
      <div className="field">
        <label htmlFor="contact-topic">
          נושא <span aria-hidden="true">*</span>
          <span className="sr-only">(שדה חובה)</span>
        </label>
        <select id="contact-topic" name="topic" required aria-required="true" defaultValue="">
          <option value="">בחרו נושא</option>
          <option>שאלה על מתכון</option>
          <option>שאלה על משחק</option>
          <option>שיתוף פעולה</option>
          <option>משהו אחר</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor="contact-message">
          הודעה <span aria-hidden="true">*</span>
          <span className="sr-only">(שדה חובה)</span>
        </label>
        <textarea
          id="contact-message"
          name="message"
          rows={7}
          placeholder="כתבו לי כאן..."
          required
          aria-required="true"
          aria-describedby="contact-form-explainer"
        />
      </div>
      <button className="btn btn-primary" type="submit">
        פתיחת ההודעה במייל ♡
      </button>
      {/* Deliberately not .micro-note (11px, faint): this line is what tells
          the reader the button opens their mail client rather than sending,
          so it has to be comfortably readable. */}
      <p className="form-explainer" id="contact-form-explainer">
        הכפתור פותח את תוכנת המייל שלכם עם ההודעה מוכנה — השליחה עצמה מתבצעת משם. אפשר גם לכתוב ישירות אל{" "}
        <a href={`mailto:${EMAIL}`}>{EMAIL}</a>.
      </p>

      {composed && (
        <div className="contact-fallback" role="status" aria-live="polite">
          <p>
            לא נפתחה תוכנת מייל? העתיקו את ההודעה ושלחו אותה אל <a href={`mailto:${EMAIL}`}>{EMAIL}</a>.
          </p>
          <pre>{`${composed.subject}\n\n${composed.body}`}</pre>
          <button className="btn btn-secondary compact" type="button" onClick={copyMessage}>
            {copied ? "הועתק ♡" : "העתקת ההודעה"}
          </button>
        </div>
      )}
    </form>
  );
}
