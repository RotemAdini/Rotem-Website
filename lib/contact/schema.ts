/**
 * The contact form's field rules, in one place so the browser and the server
 * cannot disagree about them.
 *
 * The client uses LIMITS to set maxLength and to describe each field in its
 * help text; the server uses validateContactInput() as the only thing that
 * actually decides. Client-side validation here is a convenience — every rule
 * is re-checked on the server, because anything the browser enforces can be
 * skipped by posting the form directly.
 *
 * No dependency: the rules are four length checks and one email shape, which
 * is not worth a schema library the rest of the project does not already use.
 */

export const LIMITS = {
  name: { min: 2, max: 80 },
  email: { min: 3, max: 254 },
  subject: { min: 3, max: 120 },
  message: { min: 10, max: 4000 },
} as const;

export type ContactField = "name" | "email" | "subject" | "message";

export const CONTACT_FIELDS: ContactField[] = ["name", "email", "subject", "message"];

export interface ContactInput {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export type ContactFieldErrors = Partial<Record<ContactField, string>>;

/**
 * A deliberately permissive email check.
 *
 * It rejects what is obviously not an address — no @, nothing before or after
 * it, no dot in the domain, whitespace — and accepts everything else. Trying
 * to encode RFC 5322 in a regular expression is how real addresses get
 * rejected, and the only test that actually proves an address works is
 * sending to it. The reply-to on the delivered mail is what finds out.
 */
const EMAIL_SHAPE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

/** Collapses the runs of whitespace a paste tends to bring with it, without
 * touching the line breaks inside a message. */
function tidy(value: FormDataEntryValue | null, keepNewlines = false): string {
  const raw = typeof value === "string" ? value : "";
  const collapsed = keepNewlines ? raw.replace(/[^\S\n]+/g, " ") : raw.replace(/\s+/g, " ");
  return collapsed.trim();
}

/** Pulls the four fields out of a submitted form, tidied but not yet judged. */
export function readContactInput(form: FormData): ContactInput {
  return {
    name: tidy(form.get("name")),
    email: tidy(form.get("email")),
    subject: tidy(form.get("subject")),
    message: tidy(form.get("message"), true),
  };
}

/**
 * The single source of truth for whether a submission is acceptable.
 *
 * Returns one message per bad field, in Hebrew, phrased as what to do rather
 * than what went wrong — an error that says "נא להזין שם באורך 2–80 תווים"
 * tells the reader how to fix it; "שדה לא תקין" does not (WCAG 3.3.3).
 */
export function validateContactInput(input: ContactInput): ContactFieldErrors {
  const errors: ContactFieldErrors = {};

  if (input.name.length < LIMITS.name.min || input.name.length > LIMITS.name.max) {
    errors.name = `נא להזין שם באורך ${LIMITS.name.min}–${LIMITS.name.max} תווים.`;
  }

  if (!input.email) {
    errors.email = "נא להזין כתובת אימייל, כדי שאוכל לחזור אליכם.";
  } else if (input.email.length > LIMITS.email.max || !EMAIL_SHAPE.test(input.email)) {
    errors.email = "כתובת האימייל לא נראית תקינה. בדקו אותה ונסו שוב.";
  }

  if (input.subject.length < LIMITS.subject.min || input.subject.length > LIMITS.subject.max) {
    errors.subject = `נא להזין נושא באורך ${LIMITS.subject.min}–${LIMITS.subject.max} תווים.`;
  }

  if (input.message.length < LIMITS.message.min) {
    errors.message = `נא לכתוב הודעה באורך ${LIMITS.message.min} תווים לפחות.`;
  } else if (input.message.length > LIMITS.message.max) {
    errors.message = `ההודעה ארוכה מדי — עד ${LIMITS.message.max} תווים.`;
  }

  return errors;
}

/** The Hebrew label each field is announced by, used in the error summary so
 * a reader hears which field a message belongs to before they reach it. */
export const FIELD_LABELS: Record<ContactField, string> = {
  name: "שם",
  email: "אימייל",
  subject: "נושא",
  message: "הודעה",
};

/** The DOM id of each control, shared by the label, the error text and the
 * summary's links. */
export const FIELD_IDS: Record<ContactField, string> = {
  name: "contact-name",
  email: "contact-email",
  subject: "contact-subject",
  message: "contact-message",
};

/* ------------------------------------------------------- spam heuristics */

/** The name of the honeypot input. Deliberately plausible: a bot fills fields
 * it recognises, and "website" is one of the first it reaches for. */
export const HONEYPOT_FIELD = "website";

/** The hidden field carrying the signed render time. */
export const TOKEN_FIELD = "t";

/**
 * How quickly a submission may arrive after the form was rendered.
 *
 * Three seconds is below what it takes a person to type a name, an address, a
 * subject and ten characters of message, and above what a script needs. The
 * upper bound exists so a token cannot be captured once and replayed for
 * weeks; two hours is long enough that someone who opened the page, went away
 * and came back to finish writing is not punished for it.
 */
export const MIN_FILL_SECONDS = 3;
export const MAX_FORM_AGE_SECONDS = 2 * 60 * 60;
