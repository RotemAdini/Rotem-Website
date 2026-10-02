import { signOut } from "@/lib/supabase/auth-actions";

/** Clears the session. A form + Server Action for the same reason as the
 * sign-in button: it works without client JavaScript. */
export default function SignOutButton({ className = "btn btn-secondary", label = "יציאה מהחשבון" }: { className?: string; label?: string }) {
  return (
    // data-analytics-logout: see listenForInteractionEvents() in lib/analytics.
    <form action={signOut} data-analytics-logout="">
      <button className={className} type="submit">
        {label}
      </button>
    </form>
  );
}
