/**
 * Accepts only a same-origin path for post-authentication navigation.
 *
 * OAuth return targets are untrusted input. Keeping this helper free of Next
 * or Supabase imports also makes the open-redirect boundary easy to test.
 */
export function safeNextPath(raw: string | null | undefined, fallback = "/dashboard"): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return fallback;
  if (/\p{Cc}/u.test(raw)) return fallback;

  try {
    const internalOrigin = "https://internal.invalid";
    const target = new URL(raw, internalOrigin);
    if (target.origin !== internalOrigin) return fallback;

    let decodedPathname: string;
    try {
      decodedPathname = decodeURIComponent(target.pathname);
    } catch {
      return fallback;
    }
    if (decodedPathname.includes("\\")) return fallback;

    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return fallback;
  }
}
