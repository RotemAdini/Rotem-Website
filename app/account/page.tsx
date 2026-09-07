import type { Metadata } from "next";
import AuthTabs from "@/components/AuthTabs";

export const metadata: Metadata = {
  title: "התחברות והרשמה | רותם עדיני",
  description: "רותם עדיני — מתכונים, דייטים, משחקים ומתנות.",
};

export default function AccountPage() {
  return (
    <main className="page-main auth-page">
      <section className="auth-shell container panel">
        <div className="auth-visual">
          <span className="eyebrow">המקום שלכם באתר</span>
          <h1>
            שמרו את כל מה שאהבתם <span>♡</span>
          </h1>
          <p>חשבון משתמש יאפשר לשמור מתכונים, דייטים ומשחקים למועדפים ולחזור אליהם אחר כך.</p>
        </div>

        <AuthTabs />
      </section>
    </main>
  );
}
