import "server-only";

import type { ContactInput } from "./schema";

/**
 * Delivery of a contact-form message, via Resend.
 *
 * Why a plain fetch rather than the `resend` package. The whole integration is
 * one POST to one endpoint with a bearer token and a JSON body — the code
 * below is what the SDK would wrap. Adding a dependency buys retry-free
 * convenience and a typed response we do not otherwise need, at the cost of a
 * package in the deployment that has to be kept current for a single HTTP
 * call. If Resend's API ever grows something awkward here (batching, webhook
 * signature verification, attachments), the SDK earns its place then.
 *
 * Nothing in this module may be imported from a Client Component: it is
 * marked `server-only`, and none of its environment variables carry a
 * NEXT_PUBLIC_ prefix, so the API key cannot reach the browser bundle.
 */

/** Where messages go. Overridable so a staging deploy can point somewhere
 * else without a code change; documented in .env.example. */
const DEFAULT_TO = "rotemadini@gmail.com";

/**
 * The From address.
 *
 * Until a domain is chosen and verified in Resend, the only address the
 * account may send from is Resend's own onboarding sender. That is why this
 * has a default rather than being required: the integration is complete and
 * testable before the domain exists, and switching to noreply@<domain> is an
 * environment-variable change, not a deploy of new code.
 */
const DEFAULT_FROM = "רותם עדיני <onboarding@resend.dev>";

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export function getContactRecipient(): string {
  return process.env.CONTACT_TO_EMAIL?.trim() || DEFAULT_TO;
}

/**
 * Whether delivery can actually happen.
 *
 * The form checks this before it validates anything, so a misconfigured
 * deployment says "the form is not connected" rather than accepting a message
 * and dropping it. There is deliberately no fallback that pretends to send.
 */
export function isContactEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export type SendResult =
  | { ok: true; id: string | null }
  | { ok: false; reason: "not-configured" | "provider-error"; detail: string };

/**
 * Hands one message to Resend.
 *
 * The visitor's address goes in `reply_to`, never in `from`: sending as an
 * address on a domain we do not control is what gets a sender blocked by
 * SPF/DMARC. Rotem replies in Gmail as normal and it reaches the visitor.
 *
 * Both a text and an HTML part are sent. The text part is what most spam
 * filters actually score, and it is what a plain-text client shows.
 */
export async function sendContactEmail(input: ContactInput): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, reason: "not-configured", detail: "RESEND_API_KEY is not set." };
  }

  const to = getContactRecipient();
  const from = process.env.CONTACT_FROM_EMAIL?.trim() || DEFAULT_FROM;

  const text = [
    `שם: ${input.name}`,
    `אימייל: ${input.email}`,
    `נושא: ${input.subject}`,
    "",
    input.message,
    "",
    "—",
    "נשלח מטופס יצירת הקשר באתר רותם עדיני.",
  ].join("\n");

  let response: Response;
  try {
    response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: input.email,
        // The visitor's subject is prefixed so it is obvious in an inbox
        // where the message came from, and so a filter can match on it.
        subject: `[אתר] ${input.subject}`,
        text,
        html: toHtml(input),
      }),
      // A hung provider must not hold a serverless function open until the
      // platform kills it — the reader gets a real failure message instead.
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    return { ok: false, reason: "provider-error", detail: `Request to Resend failed: ${String(error)}` };
  }

  if (!response.ok) {
    // The body is Resend's own error description. It is logged by the caller,
    // never shown to the visitor.
    const body = await response.text().catch(() => "");
    return { ok: false, reason: "provider-error", detail: `Resend responded ${response.status}: ${body.slice(0, 400)}` };
  }

  const payload: unknown = await response.json().catch(() => null);
  const id = payload && typeof payload === "object" && "id" in payload ? String((payload as { id: unknown }).id) : null;
  return { ok: true, id };
}

/** Escapes the four characters that could otherwise close a tag or an
 * attribute. Everything in the message is visitor-supplied. */
function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function toHtml(input: ContactInput): string {
  const rows = [
    ["שם", escapeHtml(input.name)],
    ["אימייל", `<a href="mailto:${escapeHtml(input.email)}">${escapeHtml(input.email)}</a>`],
    ["נושא", escapeHtml(input.subject)],
  ]
    .map(([label, value]) => `<p style="margin:0 0 6px"><strong>${label}:</strong> ${value}</p>`)
    .join("");

  return [
    `<div dir="rtl" style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#2b1b22">`,
    rows,
    `<hr style="border:0;border-top:1px solid #e9dccb;margin:16px 0">`,
    `<div style="white-space:pre-wrap">${escapeHtml(input.message)}</div>`,
    `<hr style="border:0;border-top:1px solid #e9dccb;margin:16px 0">`,
    `<p style="margin:0;font-size:13px;color:#6b5762">נשלח מטופס יצירת הקשר באתר רותם עדיני.</p>`,
    `</div>`,
  ].join("");
}
