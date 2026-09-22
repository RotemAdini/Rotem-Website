import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";

// lib/contact/token.ts imports "server-only", whose default Node resolution
// throws on purpose — that is the guard stopping it reaching a Client
// Component. Replacing it with an empty module is exactly what the
// "react-server" condition does inside Next, so the module under test
// behaves as it does in the app.
mock.module("server-only", { namedExports: {} });

// The signing key is derived from RESEND_API_KEY (see lib/contact/token.ts),
// so a value has to exist before that module is loaded. It is a placeholder:
// nothing in this file makes a network call.
process.env.RESEND_API_KEY = "re_test_key_used_only_for_signing";

import {
  LIMITS,
  MAX_FORM_AGE_SECONDS,
  MIN_FILL_SECONDS,
  readContactInput,
  validateContactInput,
  type ContactInput,
} from "../lib/contact/schema.ts";

/**
 * The contact form's two server-side gates: what counts as a valid message,
 * and what counts as a submission that a person actually filled in.
 *
 * These are the rules the browser cannot be trusted with. Everything the
 * client does — maxLength, type="email", required — is skipped by anyone who
 * posts the form directly, so these functions are the only thing that
 * decides, and they are worth pinning down.
 *
 * The token tests reach lib/contact/token.ts, which is marked `server-only`
 * and derives its signing key from RESEND_API_KEY; both are handled at the
 * top of this file, the same way tests/supabase-middleware.test.ts sets up
 * its own module under test.
 */

const VALID: ContactInput = {
  name: "רותם עדיני",
  email: "someone@example.com",
  subject: "שאלה על מתכון",
  message: "רציתי לשאול אם אפשר להחליף את החמאה במרגרינה במתכון הזה.",
};

describe("validateContactInput — a good message", () => {
  it("accepts a filled-in form", () => {
    assert.deepEqual(validateContactInput(VALID), {});
  });

  it("accepts the exact minimum and maximum of every field", () => {
    assert.deepEqual(
      validateContactInput({
        name: "א".repeat(LIMITS.name.min),
        email: "a@b.co",
        subject: "א".repeat(LIMITS.subject.min),
        message: "א".repeat(LIMITS.message.min),
      }),
      {},
    );
    assert.deepEqual(
      validateContactInput({
        name: "א".repeat(LIMITS.name.max),
        email: "a@b.co",
        subject: "א".repeat(LIMITS.subject.max),
        message: "א".repeat(LIMITS.message.max),
      }),
      {},
    );
  });
});

describe("validateContactInput — rejections", () => {
  const cases: [string, Partial<ContactInput>, keyof ContactInput][] = [
    ["a one-character name", { name: "ר" }, "name"],
    ["a name past the limit", { name: "א".repeat(LIMITS.name.max + 1) }, "name"],
    ["an empty name", { name: "" }, "name"],
    ["an address with no @", { email: "nobody.example.com" }, "email"],
    ["an address with no domain dot", { email: "nobody@example" }, "email"],
    ["an address with a space", { email: "no body@example.com" }, "email"],
    ["an empty address", { email: "" }, "email"],
    ["a two-character subject", { subject: "אב" }, "subject"],
    ["a subject past the limit", { subject: "א".repeat(LIMITS.subject.max + 1) }, "subject"],
    ["a nine-character message", { message: "א".repeat(LIMITS.message.min - 1) }, "message"],
    ["a message past the limit", { message: "א".repeat(LIMITS.message.max + 1) }, "message"],
  ];

  for (const [label, patch, field] of cases) {
    it(`rejects ${label}`, () => {
      const errors = validateContactInput({ ...VALID, ...patch });
      assert.ok(errors[field], `expected an error on ${field}`);
      // One bad field must not produce errors on the others: the summary
      // counts them, and an inflated count sends the reader hunting.
      assert.equal(Object.keys(errors).length, 1, `expected only ${field} to fail, got ${Object.keys(errors)}`);
    });
  }

  it("reports every bad field at once rather than stopping at the first", () => {
    const errors = validateContactInput({ name: "", email: "x", subject: "", message: "" });
    assert.deepEqual(Object.keys(errors).sort(), ["email", "message", "name", "subject"]);
  });
});

describe("readContactInput", () => {
  function form(values: Record<string, string>): FormData {
    const data = new FormData();
    for (const [key, value] of Object.entries(values)) data.append(key, value);
    return data;
  }

  it("trims the fields", () => {
    const input = readContactInput(form({ name: "  רותם  ", email: " a@b.co ", subject: " נושא ", message: " שלום " }));
    assert.deepEqual(input, { name: "רותם", email: "a@b.co", subject: "נושא", message: "שלום" });
  });

  it("keeps the line breaks inside a message but collapses runs of spaces", () => {
    const input = readContactInput(form({ message: "שורה   ראשונה\n\nשורה שנייה" }));
    assert.equal(input.message, "שורה ראשונה\n\nשורה שנייה");
  });

  it("treats a missing field as empty rather than throwing", () => {
    assert.deepEqual(readContactInput(form({})), { name: "", email: "", subject: "", message: "" });
  });
});

describe("form token — the time-to-submit gate", () => {
  // Imported lazily so the module mock above is registered first.
  async function tokenModule() {
    return import("../lib/contact/token.ts");
  }

  it("accepts a token that is old enough but not stale", async () => {
    const { issueFormToken, verifyFormToken } = await tokenModule();
    const now = Date.now();
    const token = issueFormToken(now);
    assert.equal(verifyFormToken(token, now + (MIN_FILL_SECONDS + 1) * 1000), "ok");
  });

  it("rejects a submission that arrives faster than a person can type", async () => {
    const { issueFormToken, verifyFormToken } = await tokenModule();
    const now = Date.now();
    const token = issueFormToken(now);
    assert.equal(verifyFormToken(token, now), "too-fast");
    assert.equal(verifyFormToken(token, now + (MIN_FILL_SECONDS - 1) * 1000), "too-fast");
  });

  it("rejects a token older than the replay window", async () => {
    const { issueFormToken, verifyFormToken } = await tokenModule();
    const now = Date.now();
    const token = issueFormToken(now);
    assert.equal(verifyFormToken(token, now + (MAX_FORM_AGE_SECONDS + 60) * 1000), "expired");
  });

  it("rejects a forged timestamp — the signature is what makes the gate real", async () => {
    const { issueFormToken, verifyFormToken } = await tokenModule();
    const now = Date.now();
    const token = issueFormToken(now);
    const [, signature] = token.split(".");
    // A bot's obvious move: keep the signature, backdate the timestamp so the
    // submission looks like it took a minute.
    const backdated = `${Math.floor(now / 1000) - 60}.${signature}`;
    assert.equal(verifyFormToken(backdated, now), "invalid");
  });

  it("rejects a tampered signature, a malformed token and an empty one", async () => {
    const { issueFormToken, verifyFormToken } = await tokenModule();
    const now = Date.now();
    const token = issueFormToken(now);
    const [issued, signature] = token.split(".");
    const flipped = signature.slice(0, -1) + (signature.endsWith("A") ? "B" : "A");

    assert.equal(verifyFormToken(`${issued}.${flipped}`, now + 10_000), "invalid");
    assert.equal(verifyFormToken(`${issued}.`, now + 10_000), "invalid");
    assert.equal(verifyFormToken(issued, now + 10_000), "invalid");
    assert.equal(verifyFormToken("", now + 10_000), "invalid");
    assert.equal(verifyFormToken("notanumber.abc", now + 10_000), "invalid");
  });

  it("rejects a token stamped in the future", async () => {
    const { issueFormToken, verifyFormToken } = await tokenModule();
    const now = Date.now();
    const token = issueFormToken(now + 60_000);
    assert.equal(verifyFormToken(token, now), "invalid");
  });
});
