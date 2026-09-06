"use client";

import { useToast } from "@/lib/toast-context";

export default function CopyLinkButton() {
  const { showToast } = useToast();
  return (
    <button
      className="btn btn-secondary"
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(location.href);
          showToast("הקישור הועתק ♡");
        } catch {
          showToast("אפשר להעתיק את הכתובת משורת הדפדפן");
        }
      }}
    >
      העתקת קישור
    </button>
  );
}
