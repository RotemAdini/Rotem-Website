"use server";

import { HONEYPOT_FIELD, TOKEN_FIELD, readContactInput, validateContactInput } from "@/lib/contact/schema";
import { EMPTY_CONTACT_VALUES, type ContactState } from "@/lib/contact/state";
import { isContactEmailConfigured, sendContactEmail } from "@/lib/contact/email";
import { issueFormToken, verifyFormToken } from "@/lib/contact/token";

/**
 * The contact form's submit handler.
 *
 * A Server Action rather than a Route Handler for two reasons: the form
 * works with JavaScript disabled, because the browser posts it natively; and
 * `useActionState` gives the client per-field errors without any fetch
 * plumbing to write or keep in step.
 *
 * The one rule this file is built around: never tell someone their message
 * was delivered unless Resend accepted it. A deployment with no API key says
 * so plainly — see the `unconfigured` status — instead of showing a
 * confirmation and dropping the message, which is what the previous
 * mailto-only form could do whenever a browser had no mail handler.
 *
 * ContactState and initialContactState live in lib/contact/state.ts, not
 * here: a "use server" module may only export async functions, so any other
 * export in this file is a build error.
 */
export async function submitContact(previous: ContactState, form: FormData): Promise<ContactState> {
  const values = readContactInput(form);
  const nonce = previous.nonce + 1;
  const base = { values, nonce, token: issueFormToken() };

  /* ------------------------------------------------------------ honeypot */

  // A field positioned off-screen, hidden from assistive technology and
  // removed from the tab order (see ContactForm). A person does not reach
  // it; a bot filling everything it finds does.
  //
  // This reports success on purpose, and it is the one place that does so
  // without sending. Telling a bot it failed teaches it which field to leave
  // alone next time, and no human can land here to be misled.
  if (String(form.get(HONEYPOT_FIELD) ?? "").trim() !== "") {
    return { ...base, status: "success", fieldErrors: {}, formError: null, values: EMPTY_CONTACT_VALUES };
  }

  /* -------------------------------------------------- configuration gate */

  // Checked before validation so a misconfigured deployment cannot walk a
  // visitor through correcting their message and then swallow it.
  if (!isContactEmailConfigured()) {
    return {
      ...base,
      status: "unconfigured",
      fieldErrors: {},
      formError:
        "טופס יצירת הקשר עדיין לא מחובר לשליחה בסביבה הזו, וההודעה לא נשלחה. " +
        "אפשר לכתוב לי ישירות למייל שמופיע בצד — אענה משם.",
    };
  }

  /* --------------------------------------------------------- timing gate */

  const verdict = verifyFormToken(String(form.get(TOKEN_FIELD) ?? ""));
  if (verdict === "expired") {
    return {
      ...base,
      status: "expired",
      fieldErrors: {},
      formError: "הטופס היה פתוח יותר מדי זמן וההודעה לא נשלחה. הטקסט נשמר — אפשר ללחוץ שוב על שליחה.",
    };
  }
  if (verdict !== "ok") {
    // "too-fast" and "invalid" both mean this did not come from a person
    // filling in the rendered form. The wording stays neutral rather than
    // explaining the heuristic, and the message is not sent.
    return {
      ...base,
      status: "error",
      fieldErrors: {},
      formError: "לא הצלחנו לאמת את השליחה וההודעה לא נשלחה. נסו שוב, או כתבו לי ישירות למייל שמופיע בצד.",
    };
  }

  /* ---------------------------------------------------------- validation */

  const fieldErrors = validateContactInput(values);
  if (Object.keys(fieldErrors).length > 0) {
    return { ...base, status: "invalid", fieldErrors, formError: null };
  }

  /* ------------------------------------------------------------- deliver */

  const result = await sendContactEmail(values);
  if (!result.ok) {
    // The provider's own text goes to the server log, never to the visitor:
    // it can carry account details, and it is not actionable by them.
    console.error(`[contact] delivery failed (${result.reason}): ${result.detail}`);
    return {
      ...base,
      status: "error",
      fieldErrors: {},
      formError: "משהו השתבש בשליחה וההודעה לא נשלחה. אפשר לנסות שוב, או לכתוב לי ישירות למייל שמופיע בצד.",
    };
  }

  return { ...base, status: "success", fieldErrors: {}, formError: null, values: EMPTY_CONTACT_VALUES };
}
