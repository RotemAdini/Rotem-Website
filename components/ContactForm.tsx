"use client";

import { useActionState, useEffect, useId, useRef } from "react";

import { submitContact } from "@/app/contact/actions";
import { initialContactState, type ContactState } from "@/lib/contact/state";
import {
  CONTACT_FIELDS,
  FIELD_IDS,
  FIELD_LABELS,
  HONEYPOT_FIELD,
  LIMITS,
  TOKEN_FIELD,
  type ContactField,
} from "@/lib/contact/schema";

/**
 * The contact form.
 *
 * It posts to a Server Action, which validates and hands the message to the
 * email provider (see app/contact/actions.ts). The previous version composed
 * a mailto: link instead, which needed the reader to have a mail client
 * configured and could fail silently when they did not.
 *
 * Because it is a real form posting to a Server Action, it still works with
 * JavaScript switched off: the browser submits natively and the server
 * re-renders with the result. Everything below — the live error summary, the
 * focus move, the pending state — is enhancement on top of that.
 *
 * The accessibility contract, which is the part worth not breaking:
 *
 *   - every control has a real <label for>, never a placeholder as its name
 *   - an invalid control gets aria-invalid and aria-describedby pointing at
 *     its own error text, so the message is announced with the field
 *   - a summary above the form lists each error as a link to its field, so a
 *     screen-reader user hears the whole problem before walking the form
 *   - the summary is role="alert" and the confirmation is role="status", the
 *     two live-region politeness levels those cases call for
 *   - focus moves to the first invalid control on a rejected submit
 *   - the submit button reports aria-busy and disables itself while pending
 */
export default function ContactForm({ token, email }: { token: string; email: string }) {
  const [state, formAction, pending] = useActionState<ContactState, FormData>(submitContact, initialContactState(token));

  const formRef = useRef<HTMLFormElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const successRef = useRef<HTMLDivElement>(null);
  const summaryId = useId();

  const errorEntries = CONTACT_FIELDS.filter((field) => state.fieldErrors[field]).map(
    (field) => [field, state.fieldErrors[field] as string] as const,
  );
  const hasFieldErrors = errorEntries.length > 0;

  /**
   * Move focus where the reader needs to be after a submission.
   *
   * Keyed on `nonce` rather than on `status`, so submitting twice with the
   * same mistake moves focus both times instead of the effect deciding
   * nothing changed.
   */
  useEffect(() => {
    if (state.nonce === 0) return;

    if (hasFieldErrors) {
      const first = formRef.current?.querySelector<HTMLElement>("[aria-invalid='true']");
      // The summary is what explains the whole problem, so it is read first;
      // the field itself is one Tab away through the summary's own link.
      summaryRef.current?.focus();
      if (!summaryRef.current) first?.focus();
      return;
    }

    if (state.status === "success") {
      successRef.current?.focus();
      return;
    }

    if (state.formError) summaryRef.current?.focus();
    // `hasFieldErrors`, `state.status` and `state.formError` are all derived
    // from the same state object that `nonce` identifies.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.nonce]);

  const describedBy = (field: ContactField, extra?: string) =>
    [state.fieldErrors[field] ? `${FIELD_IDS[field]}-error` : null, extra].filter(Boolean).join(" ") || undefined;

  return (
    <form className="contact-form panel" action={formAction} ref={formRef} noValidate>
      {/* The server reissues a token on every response, so the form stays
          submittable after a failure without needing a page reload. */}
      <input type="hidden" name={TOKEN_FIELD} value={state.token} />

      {/* Honeypot. Off-screen rather than display:none — some bots skip
          anything that is not rendered — and removed from both the tab order
          and the accessibility tree, so no reader can reach it by keyboard
          or hear it announced. autoComplete="off" keeps a password manager
          from filling it on a person's behalf. */}
      <div className="contact-hp" aria-hidden="true">
        <label htmlFor="contact-website">אל תמלאו שדה זה</label>
        <input id="contact-website" type="text" name={HONEYPOT_FIELD} tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>

      {(hasFieldErrors || state.formError) && (
        <div className="form-alert is-error" role="alert" tabIndex={-1} ref={summaryRef} id={summaryId}>
          {hasFieldErrors && (
            <>
              <h2>
                {errorEntries.length === 1 ? "יש שדה אחד שצריך תיקון" : `יש ${errorEntries.length} שדות שצריכים תיקון`}
              </h2>
              <ul>
                {errorEntries.map(([field, message]) => (
                  <li key={field}>
                    <a href={`#${FIELD_IDS[field]}`}>
                      {FIELD_LABELS[field]}: {message}
                    </a>
                  </li>
                ))}
              </ul>
            </>
          )}
          {state.formError && <p>{state.formError}</p>}
        </div>
      )}

      {state.status === "success" && (
        <div className="form-alert is-success" role="status" tabIndex={-1} ref={successRef}>
          <h2>ההודעה נשלחה ♡</h2>
          <p>
            תודה שכתבתם. ההודעה הגיעה אליי למייל ואחזור אליכם לכתובת שהשארתם, בדרך כלל תוך כמה ימים.
          </p>
        </div>
      )}

      <div className="form-row">
        <Field
          field="name"
          type="text"
          autoComplete="name"
          placeholder="איך קוראים לכם?"
          defaultValue={state.values.name}
          error={state.fieldErrors.name}
          describedBy={describedBy("name")}
        />
        <Field
          field="email"
          type="email"
          autoComplete="email"
          placeholder="name@example.com"
          defaultValue={state.values.email}
          error={state.fieldErrors.email}
          hint="כדי שאוכל לחזור אליכם"
          describedBy={describedBy("email", `${FIELD_IDS.email}-hint`)}
        />
      </div>

      <Field
        field="subject"
        type="text"
        placeholder="על מה תרצו לכתוב?"
        defaultValue={state.values.subject}
        error={state.fieldErrors.subject}
        describedBy={describedBy("subject")}
      />

      <div className="field">
        <label htmlFor={FIELD_IDS.message}>
          {FIELD_LABELS.message} <span aria-hidden="true">*</span>
          <span className="sr-only">(שדה חובה)</span>
        </label>
        <textarea
          id={FIELD_IDS.message}
          name="message"
          rows={7}
          placeholder="כתבו לי כאן..."
          required
          aria-required="true"
          maxLength={LIMITS.message.max}
          defaultValue={state.values.message}
          aria-invalid={state.fieldErrors.message ? true : undefined}
          aria-describedby={describedBy("message")}
        />
        {state.fieldErrors.message && (
          <p className="field-error" id={`${FIELD_IDS.message}-error`}>
            <span aria-hidden="true">⚠</span> {state.fieldErrors.message}
          </p>
        )}
      </div>

      <button className="btn btn-primary" type="submit" disabled={pending} aria-busy={pending}>
        {pending ? "שולח…" : "שליחת ההודעה ♡"}
      </button>

      <p className="form-explainer">
        ההודעה נשלחת אליי למייל ואני עונה משם. אפשר גם לכתוב ישירות אל{" "}
        <a href={`mailto:${email}`} lang="en">
          {email}
        </a>
        .
      </p>
    </form>
  );
}

/** One labelled text input, with its error text wired to it. */
function Field({
  field,
  type,
  autoComplete,
  placeholder,
  defaultValue,
  error,
  hint,
  describedBy,
}: {
  field: Exclude<ContactField, "message">;
  type: "text" | "email";
  autoComplete?: string;
  placeholder: string;
  defaultValue: string;
  error?: string;
  hint?: string;
  describedBy?: string;
}) {
  const id = FIELD_IDS[field];
  return (
    <div className="field">
      <label htmlFor={id}>
        {FIELD_LABELS[field]} <span aria-hidden="true">*</span>
        <span className="sr-only">(שדה חובה)</span>
      </label>
      <input
        id={id}
        type={type}
        name={field}
        autoComplete={autoComplete}
        placeholder={placeholder}
        required
        aria-required="true"
        maxLength={LIMITS[field].max}
        defaultValue={defaultValue}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
      />
      {hint && (
        <p className="field-hint" id={`${id}-hint`}>
          {hint}
        </p>
      )}
      {error && (
        <p className="field-error" id={`${id}-error`}>
          <span aria-hidden="true">⚠</span> {error}
        </p>
      )}
    </div>
  );
}
