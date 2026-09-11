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
      <div className="form-row">
        <label>
          שם
          <input type="text" name="name" placeholder="איך קוראים לכם?" required />
        </label>
        <label>
          אימייל
          <input type="email" name="email" placeholder="name@example.com" required />
        </label>
      </div>
      <label>
        נושא
        <select name="topic" required defaultValue="">
          <option value="">בחרו נושא</option>
          <option>שאלה על מתכון</option>
          <option>שאלה על משחק</option>
          <option>שיתוף פעולה</option>
          <option>משהו אחר</option>
        </select>
      </label>
      <label>
        הודעה
        <textarea name="message" rows={7} placeholder="כתבו לי כאן..." required />
      </label>
      <button className="btn btn-primary" type="submit">
        פתיחת ההודעה במייל ♡
      </button>
      {/* Deliberately not .micro-note (11px, faint): this line is what tells
          the reader the button opens their mail client rather than sending,
          so it has to be comfortably readable. */}
      <p className="form-explainer">
        הכפתור פותח את תוכנת המייל שלכם עם ההודעה מוכנה — השליחה עצמה מתבצעת משם. אפשר גם לכתוב ישירות אל{" "}
        <a href={`mailto:${EMAIL}`}>{EMAIL}</a>.
      </p>

      {composed && (
        <div className="contact-fallback" role="status">
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
