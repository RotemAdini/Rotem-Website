import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { MAX_FORM_AGE_SECONDS, MIN_FILL_SECONDS } from "./schema";

/**
 * A signed "this form was rendered at" stamp, for the time-to-submit check.
 *
 * An unsigned timestamp in a hidden field would be pointless: a script posts
 * whatever value gets it past the check. Signing it means the server only
 * accepts a time it issued itself, so a bot has to fetch the page and then
 * genuinely wait — which is exactly the cost the check is meant to impose.
 *
 * The signing key is derived from RESEND_API_KEY rather than being its own
 * environment variable, so there is one secret to configure instead of two.
 * The derivation is a one-way HMAC over a fixed label, so a token never
 * exposes anything about the key. Two consequences worth knowing: rotating
 * the Resend key invalidates tokens issued in the previous couple of hours,
 * which costs a visitor one retry; and when no key is configured there is no
 * signing key either, which does not matter because the form reports itself
 * unconfigured before it ever looks at a token.
 */

const LABEL = "rotem-contact-form-token-v1";

function signingKey(): Buffer | null {
  const secret = process.env.RESEND_API_KEY?.trim();
  if (!secret) return null;
  return createHmac("sha256", secret).update(LABEL).digest();
}

function sign(payload: string, key: Buffer): string {
  return createHmac("sha256", key).update(payload).digest("base64url");
}

/** Issues a token for a form being rendered now. Returns "" when there is no
 * key, which only happens on a deployment that cannot send mail anyway. */
export function issueFormToken(now = Date.now()): string {
  const key = signingKey();
  if (!key) return "";
  const issued = String(Math.floor(now / 1000));
  return `${issued}.${sign(issued, key)}`;
}

export type TokenVerdict = "ok" | "too-fast" | "expired" | "invalid";

/**
 * Checks a token from a submission.
 *
 * `too-fast` and `expired` are distinguished from `invalid` so the caller can
 * tell a person who genuinely left the page open for hours ("the form
 * expired, please send again") apart from a forged or absent token, which
 * gets nothing useful.
 */
export function verifyFormToken(token: string, now = Date.now()): TokenVerdict {
  const key = signingKey();
  if (!key) return "invalid";

  const [issued, signature] = token.split(".");
  if (!issued || !signature || !/^\d+$/.test(issued)) return "invalid";

  const expected = sign(issued, key);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  // Lengths must match before timingSafeEqual, which throws otherwise.
  if (a.length !== b.length || !timingSafeEqual(a, b)) return "invalid";

  const ageSeconds = Math.floor(now / 1000) - Number(issued);
  // A token stamped in the future is a clock problem or a forgery attempt;
  // either way it is not a real fill.
  if (ageSeconds < 0) return "invalid";
  if (ageSeconds < MIN_FILL_SECONDS) return "too-fast";
  if (ageSeconds > MAX_FORM_AGE_SECONDS) return "expired";
  return "ok";
}
