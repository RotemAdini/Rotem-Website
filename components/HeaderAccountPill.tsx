"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

/** The signed-out pill. Also used as the Suspense fallback, so the header
 * never renders a hole while the pill resolves the session. */
export function GuestPill() {
  return (
    <Link className="guest-pill" href="/account">
      <span>שלום, אורחת</span>
      <strong>להתחברות</strong>
    </Link>
  );
}

/**
 * The header's "שלום, אורחת / להתחברות" pill, showing the signed-in name once
 * there is one.
 *
 * Deliberately client-side. The header renders on every page, so reading the
 * session on the server here would opt all ~200 statically generated recipe,
 * date and game pages into per-request rendering — a heavy price for one line
 * of text. Instead the guest label ships in the static HTML and is replaced
 * after hydration when a session exists.
 *
 * That does mean a signed-in visitor sees "אורחת" for a moment on first paint.
 * The alternative costs the whole static build, which is the worse trade.
 *
 * Must be rendered inside a <Suspense> boundary because of useSearchParams();
 * see the note on the effect below and the usage in Header.tsx.
 */
export default function HeaderAccountPill() {
  const [firstName, setFirstName] = useState<string | null>(null);
  const pathname = usePathname();
  const query = useSearchParams().toString();

  // The dependencies are the point of this effect, not an afterthought.
  //
  // Sign-in and sign-out are Server Actions: they set or clear the auth
  // cookies and then redirect. That redirect is a client-side navigation, so
  // the header never unmounts and a mount-only read would keep showing the
  // previous state until a full page reload.
  //
  // `pathname` alone is not enough. Signing out from /account redirects to
  // /account?signedOut=1 — same path, different page — so the query string has
  // to be watched as well.
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const supabase = getSupabaseBrowserClient();
    let active = true;

    const read = (user: { email?: string; user_metadata?: Record<string, unknown> } | null) => {
      if (!active) return;
      if (!user) {
        setFirstName(null);
        return;
      }
      const meta = user.user_metadata ?? {};
      const given = typeof meta.given_name === "string" ? meta.given_name : null;
      const full = typeof meta.full_name === "string" ? meta.full_name : typeof meta.name === "string" ? meta.name : null;
      setFirstName(given ?? full?.split(" ")[0] ?? user.email?.split("@")[0] ?? "חבר/ה");
    };

    supabase.auth.getUser().then(({ data }) => read(data.user));

    // Keeps the pill honest when the session changes in another tab, or when
    // sign-out happens elsewhere on the page.
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => read(session?.user ?? null));

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [pathname, query]);

  if (firstName) {
    return (
      <Link className="guest-pill" href="/dashboard">
        <span>שלום, {firstName}</span>
        <strong>לאזור האישי</strong>
      </Link>
    );
  }

  return <GuestPill />;
}
