"use client";

import { useState } from "react";
import { useDemoForm } from "@/lib/use-demo-form";

export default function AuthTabs() {
  const [tab, setTab] = useState<"login" | "register">("login");
  const onLoginSubmit = useDemoForm("login", { redirectTo: "/dashboard" });
  const onRegisterSubmit = useDemoForm("register", { redirectTo: "/dashboard" });

  return (
    <div className="auth-card">
      <div className="auth-tabs">
        <button className={tab === "login" ? "active" : ""} onClick={() => setTab("login")}>
          התחברות
        </button>
        <button className={tab === "register" ? "active" : ""} onClick={() => setTab("register")}>
          הרשמה
        </button>
      </div>

      <form className={`auth-form${tab === "login" ? " active" : ""}`} onSubmit={onLoginSubmit}>
        <h2>כיף שחזרתם</h2>
        <label>
          אימייל
          <input type="email" placeholder="name@example.com" required />
        </label>
        <label>
          סיסמה
          <input type="password" placeholder="••••••••" required />
        </label>
        <div className="form-inline">
          <label className="check-line">
            <input type="checkbox" /> לזכור אותי
          </label>
          <a href="#">שכחתי סיסמה</a>
        </div>
        <button className="btn btn-primary full" type="submit">
          התחברות
        </button>
      </form>

      <form className={`auth-form${tab === "register" ? " active" : ""}`} onSubmit={onRegisterSubmit}>
        <h2>נעים להכיר ♡</h2>
        <label>
          שם
          <input type="text" placeholder="השם שלכם" required />
        </label>
        <label>
          אימייל
          <input type="email" placeholder="name@example.com" required />
        </label>
        <label>
          סיסמה
          <input type="password" placeholder="לפחות 8 תווים" minLength={8} required />
        </label>
        <label className="check-line">
          <input type="checkbox" required /> אני מאשר/ת את תנאי השימוש
        </label>
        <button className="btn btn-primary full" type="submit">
          יצירת חשבון
        </button>
      </form>

      <p className="micro-note">בשלב הזה אין Backend — הטפסים מדגימים את ה-UX בלבד.</p>
    </div>
  );
}
