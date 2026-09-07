"use client";

import { useDemoForm } from "@/lib/use-demo-form";

export default function NewsletterForm() {
  const onSubmit = useDemoForm("newsletter");
  return (
    <form className="newsletter-form" onSubmit={onSubmit}>
      <input type="email" name="email" aria-label="כתובת אימייל" placeholder="כתובת האימייל שלכם" required />
      <label className="newsletter-consent">
        <input type="checkbox" required />
        <span>אני מאשר/ת קבלת עדכונים במייל</span>
      </label>
      <button className="btn btn-primary" type="submit">
        הצטרפות
      </button>
    </form>
  );
}
