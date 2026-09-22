import type { ContactFieldErrors, ContactInput } from "./schema";

/**
 * The shape passed between the contact form and its Server Action.
 *
 * It lives here rather than in app/contact/actions.ts because a `"use server"`
 * module may only export async functions — every other export in one becomes
 * a build error. Both the client component and the action import from here,
 * so there is still one definition.
 *
 * Deliberately free of any server import: the client bundles this file.
 */

export type ContactStatus = "idle" | "success" | "invalid" | "unconfigured" | "error" | "expired";

export interface ContactState {
  status: ContactStatus;
  fieldErrors: ContactFieldErrors;
  /** A message for the form-level alert, when the failure is not per-field. */
  formError: string | null;
  /** What the reader typed, so a rejected submission does not clear the form. */
  values: ContactInput;
  /** A fresh token, so the form stays submittable after a failure without a
   * reload. */
  token: string;
  /** Changes on every submission. The client keys its focus and announcement
   * effects on this, so submitting twice with the same mistake announces the
   * error twice rather than falling silent the second time. */
  nonce: number;
}

export const EMPTY_CONTACT_VALUES: ContactInput = { name: "", email: "", subject: "", message: "" };

export function initialContactState(token: string): ContactState {
  return { status: "idle", fieldErrors: {}, formError: null, values: EMPTY_CONTACT_VALUES, token, nonce: 0 };
}
