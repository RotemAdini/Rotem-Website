"use client";

import { useDemoForm } from "@/lib/use-demo-form";

export default function NewsletterForm() {
  const onSubmit = useDemoForm("newsletter");
  return (
    <form className="newsletter-form" onSubmit={onSubmit}>
      <input type="email" placeholder="כתובת האימייל שלכם" required />
      <button className="btn btn-primary" type="submit">
        הצטרפות
      </button>
    </form>
  );
}
