"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useToast } from "./toast-context";

type DemoFormType = "newsletter" | "contact" | "login" | "register" | "checkout";

const MESSAGES: Record<DemoFormType, string> = {
  newsletter: "נרשמת לעדכונים בהצלחה ♡",
  contact: "הטופס נראה מעולה — כרגע זו הדגמה בלבד",
  login: "התחברות תהיה פעילה אחרי חיבור Backend",
  register: "הרשמה תהיה פעילה אחרי חיבור Backend",
  checkout: "הרכישה תחובר לסליקה בשלב הפיתוח ♡",
};

/** Every form on the site that isn't wired to a real backend yet shows a
 * toast instead of actually submitting — a direct port of script.js's
 * `[data-demo-form]` handler. `redirectTo` mirrors the login/register forms'
 * `data-redirect` attribute (navigate to the dashboard demo after a beat). */
export function useDemoForm(type: DemoFormType, options?: { redirectTo?: string }) {
  const { showToast } = useToast();
  const router = useRouter();

  return function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    showToast(MESSAGES[type]);
    if (type === "newsletter" || type === "contact") {
      event.currentTarget.reset();
    }
    if (options?.redirectTo) {
      setTimeout(() => router.push(options.redirectTo!), 500);
    }
  };
}
