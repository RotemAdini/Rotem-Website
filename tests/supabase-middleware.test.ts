/**
 * Focused tests for the Supabase session proxy.
 *
 * The branch under test is the one that is hardest to reach by hand: Supabase
 * only calls setAll() when it actually rotates the access token, which happens
 * once an hour in real use and never inside a browser test run. These tests
 * drive that branch directly by standing in for @supabase/ssr, so the three
 * properties the response has to hold are pinned:
 *
 *   1. the rotated session cookies reach both the browser and the downstream
 *      render;
 *   2. the response becomes private/no-store, so no shared cache can keep a
 *      response carrying somebody's session;
 *   3. nothing written before the rebuild is lost — neither an earlier cookie
 *      batch nor an earlier header.
 *
 * Run with: npm run test:auth
 */
import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";

// Read at import time by lib/supabase/env.ts, so they must be set before the
// module under test is loaded. Values are placeholders; nothing here reaches
// the network, because createServerClient is replaced below.
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project-under-test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test-key";

type CookieAdapter = {
  getAll(): { name: string; value: string }[];
  setAll(cookies: { name: string; value: string; options: Record<string, unknown> }[]): void;
};

/** Set by the fake client on construction so a test can drive setAll(). */
let adapter: CookieAdapter | null = null;

/** What the fake getUser() should do — a test swaps this in to simulate either
 * a token rotation or a request that touches no cookies at all. */
let onGetUser: () => void = () => {};

mock.module("@supabase/ssr", {
  namedExports: {
    createServerClient(_url: string, _key: string, options: { cookies: CookieAdapter }) {
      adapter = options.cookies;
      return {
        auth: {
          async getUser() {
            onGetUser();
            return { data: { user: null }, error: null };
          },
        },
      };
    },
  },
});

const { updateSession, carryOverHeaders, SESSION_CACHE_CONTROL } = await import("../lib/supabase/middleware.ts");
const { NextRequest, NextResponse } = await import("next/server");

function setCookieHeaders(response: InstanceType<typeof NextResponse>): string[] {
  return response.headers.getSetCookie();
}

describe("updateSession — cookie rotation branch", () => {
  it("writes the rotated session cookies to the response and to the downstream request", async () => {
    onGetUser = () => {
      adapter!.setAll([
        { name: "sb-project-auth-token.0", value: "chunk-zero", options: { path: "/" } },
        { name: "sb-project-auth-token.1", value: "chunk-one", options: { path: "/" } },
      ]);
    };

    const request = new NextRequest("http://localhost:3000/dashboard");
    const response = await updateSession(request);

    const cookies = setCookieHeaders(response).join("\n");
    assert.match(cookies, /sb-project-auth-token\.0=chunk-zero/);
    assert.match(cookies, /sb-project-auth-token\.1=chunk-one/);
    assert.equal(response.cookies.get("sb-project-auth-token.0")?.value, "chunk-zero");

    // The page render reads cookies off the request, so a rotation that never
    // reaches request.cookies would render as signed-out for one request.
    assert.equal(request.cookies.get("sb-project-auth-token.1")?.value, "chunk-one");
  });

  it("marks a response that carries a session as private and uncacheable", async () => {
    onGetUser = () => {
      adapter!.setAll([{ name: "sb-project-auth-token.0", value: "chunk-zero", options: { path: "/" } }]);
    };

    const response = await updateSession(new NextRequest("http://localhost:3000/dashboard"));

    assert.equal(response.headers.get("cache-control"), SESSION_CACHE_CONTROL);
    assert.match(response.headers.get("cache-control")!, /private/);
    assert.match(response.headers.get("cache-control")!, /no-store/);
  });

  it("keeps every earlier cookie batch when setAll is called more than once", async () => {
    onGetUser = () => {
      adapter!.setAll([{ name: "sb-project-auth-token.0", value: "chunk-zero", options: { path: "/" } }]);
      adapter!.setAll([{ name: "sb-project-auth-token.1", value: "chunk-one", options: { path: "/" } }]);
      adapter!.setAll([{ name: "sb-project-code-verifier", value: "verifier", options: { path: "/" } }]);
    };

    const response = await updateSession(new NextRequest("http://localhost:3000/auth/callback"));
    const cookies = setCookieHeaders(response).join("\n");

    // Each setAll rebuilds the response, so without replaying the full list the
    // first two batches would be dropped and the visitor would be signed out.
    assert.match(cookies, /sb-project-auth-token\.0=chunk-zero/);
    assert.match(cookies, /sb-project-auth-token\.1=chunk-one/);
    assert.match(cookies, /sb-project-code-verifier=verifier/);
    assert.equal(response.headers.get("cache-control"), SESSION_CACHE_CONTROL);
  });
});

describe("updateSession — anonymous request", () => {
  it("leaves caching alone and sets no cookies when nothing rotates", async () => {
    onGetUser = () => {};

    const response = await updateSession(new NextRequest("http://localhost:3000/recipes"));

    // A public page must keep whatever caching it already had; forcing
    // no-store here would make every anonymous request uncacheable.
    assert.equal(response.headers.get("cache-control"), null);
    assert.equal(setCookieHeaders(response).length, 0);
  });
});

describe("carryOverHeaders", () => {
  it("copies headers already written to the outgoing response", () => {
    const from = NextResponse.next();
    from.headers.set("x-prior-header", "kept");
    const to = NextResponse.next();

    carryOverHeaders(from, to);

    assert.equal(to.headers.get("x-prior-header"), "kept");
  });

  it("does not copy Set-Cookie, which the caller replays itself", () => {
    const from = NextResponse.next();
    from.cookies.set("already-sent", "value", { path: "/" });
    const to = NextResponse.next();

    carryOverHeaders(from, to);

    // Copying it here as well as replaying the cookie list would send the
    // same cookie twice.
    assert.equal(to.headers.getSetCookie().length, 0);
  });
});

describe("updateSession — request headers handed to the render", () => {
  it("gives Server Components the refreshed cookie, not the pre-rotation one", async () => {
    onGetUser = () => {
      adapter!.setAll([{ name: "sb-project-auth-token.0", value: "FRESH", options: { path: "/" } }]);
    };

    const request = new NextRequest("http://localhost:3000/dashboard", {
      headers: { cookie: "sb-project-auth-token.0=STALE" },
    });
    const response = await updateSession(request);

    // Next.js passes the middleware's view of the request to the render in
    // x-middleware-request-*, regenerated from the updated request each time
    // NextResponse.next() is called. Copying the previous response's copy of
    // that header back over it reverts the rotation, and the page renders as
    // signed out even though the browser was just handed a valid session.
    const forwarded = response.headers.get("x-middleware-request-cookie");
    assert.ok(forwarded, "expected Next.js to forward the overridden cookie header");
    assert.match(forwarded, /sb-project-auth-token\.0=FRESH/);
    assert.doesNotMatch(forwarded, /STALE/);
  });

  it("keeps the refreshed request headers across several rebuilds", async () => {
    onGetUser = () => {
      adapter!.setAll([{ name: "sb-project-auth-token.0", value: "FRESH-0", options: { path: "/" } }]);
      adapter!.setAll([{ name: "sb-project-auth-token.1", value: "FRESH-1", options: { path: "/" } }]);
    };

    const request = new NextRequest("http://localhost:3000/dashboard", {
      headers: { cookie: "sb-project-auth-token.0=STALE; sb-project-auth-token.1=STALE" },
    });
    const response = await updateSession(request);

    const forwarded = response.headers.get("x-middleware-request-cookie") ?? "";
    assert.match(forwarded, /sb-project-auth-token\.0=FRESH-0/);
    assert.match(forwarded, /sb-project-auth-token\.1=FRESH-1/);
    assert.doesNotMatch(forwarded, /STALE/);
  });
});

describe("carryOverHeaders — Next.js internal headers", () => {
  it("leaves the new response's x-middleware-* headers alone", () => {
    const stale = new NextRequest("http://localhost:3000/dashboard", {
      headers: { cookie: "sb-project-auth-token.0=STALE" },
    });
    const from = NextResponse.next({ request: stale });

    const fresh = new NextRequest("http://localhost:3000/dashboard", {
      headers: { cookie: "sb-project-auth-token.0=STALE" },
    });
    fresh.cookies.set("sb-project-auth-token.0", "FRESH");
    const to = NextResponse.next({ request: fresh });

    carryOverHeaders(from, to);

    assert.match(to.headers.get("x-middleware-request-cookie") ?? "", /FRESH/);
    assert.doesNotMatch(to.headers.get("x-middleware-request-cookie") ?? "", /STALE/);
  });

  it("still carries over headers that are not Next.js internals", () => {
    const from = NextResponse.next();
    from.headers.set("x-prior-header", "kept");
    const to = NextResponse.next();

    carryOverHeaders(from, to);

    assert.equal(to.headers.get("x-prior-header"), "kept");
  });
});
