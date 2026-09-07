"use client";

import { useDemoForm } from "@/lib/use-demo-form";

export default function ContactForm() {
  const onSubmit = useDemoForm("contact");
  return (
    <form className="contact-form panel" onSubmit={onSubmit}>
      <div className="form-row">
        <label>
          שם
          <input type="text" placeholder="איך קוראים לכם?" required />
        </label>
        <label>
          אימייל
          <input type="email" placeholder="name@example.com" required />
        </label>
      </div>
      <label>
        נושא
        <select required defaultValue="">
          <option value="">בחרו נושא</option>
          <option>שאלה על מתכון</option>
          <option>שאלה על משחק</option>
          <option>שיתוף פעולה</option>
          <option>משהו אחר</option>
        </select>
      </label>
      <label>
        הודעה
        <textarea rows={7} placeholder="כתבו לי כאן..." required />
      </label>
      <button className="btn btn-primary" type="submit">
        שליחת הודעה ♡
      </button>
      <p className="micro-note">הטופס כרגע הוא הדגמה בלבד ולא שולח הודעה אמיתית.</p>
    </form>
  );
}
