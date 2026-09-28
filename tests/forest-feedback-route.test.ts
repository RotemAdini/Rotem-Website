import assert from "node:assert/strict";
import { beforeEach, describe, it, mock } from "node:test";

mock.module("server-only", { namedExports: {} });

let authenticatedUser: unknown = { id: "user-under-test" };
let entitled = true;
let insertedPayload: unknown = null;
let authLookupCount = 0;

mock.module(new URL("../lib/supabase/server.ts", import.meta.url).href, {
  namedExports: {
    async getSupabaseUser() {
      authLookupCount += 1;
      return authenticatedUser;
    },
    async createSupabaseServerClient() {
      return {
        from(table: string) {
          assert.equal(table, "game_feedback");
          return {
            async insert(payload: unknown) {
              insertedPayload = payload;
              return { error: null };
            },
          };
        },
      };
    },
  },
});

mock.module(new URL("../lib/entitlements/read.ts", import.meta.url).href, {
  namedExports: {
    async ownsGame() {
      return entitled;
    },
  },
});

const { POST } = await import("../app/api/game-feedback/route.ts");

function feedbackRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/game-feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

async function errorCode(response: Response): Promise<string> {
  return ((await response.json()) as { error: string }).error;
}

describe("POST /api/game-feedback", () => {
  beforeEach(() => {
    authenticatedUser = { id: "user-under-test" };
    entitled = true;
    insertedPayload = null;
    authLookupCount = 0;
  });

  it("accepts valid feedback from an entitled user", async () => {
    const response = await POST(feedbackRequest({
      game_id: "enchanted-forest",
      rating: 5,
      comment: "  מסע נהדר  ",
    }));

    assert.equal(response.status, 204);
    assert.deepEqual(insertedPayload, {
      game_id: "enchanted-forest",
      rating: 5,
      comment: "מסע נהדר",
    });
  });

  it("rejects an unauthenticated submission", async () => {
    authenticatedUser = null;

    const response = await POST(feedbackRequest({ game_id: "enchanted-forest", rating: 4 }));

    assert.equal(response.status, 401);
    assert.equal(await errorCode(response), "authentication_required");
    assert.equal(insertedPayload, null);
  });

  it("rejects a user without the Forest entitlement", async () => {
    entitled = false;

    const response = await POST(feedbackRequest({ game_id: "enchanted-forest", rating: 4 }));

    assert.equal(response.status, 403);
    assert.equal(await errorCode(response), "access_required");
    assert.equal(insertedPayload, null);
  });

  it("rejects a different game id", async () => {
    const response = await POST(feedbackRequest({ game_id: "memory-game", rating: 4 }));

    assert.equal(response.status, 422);
    assert.equal(await errorCode(response), "invalid_feedback");
    assert.equal(authLookupCount, 0);
  });

  it("rejects a rating outside 1–5", async () => {
    const response = await POST(feedbackRequest({ game_id: "enchanted-forest", rating: 6 }));

    assert.equal(response.status, 422);
    assert.equal(await errorCode(response), "invalid_feedback");
    assert.equal(authLookupCount, 0);
  });

  it("rejects a comment longer than 1000 characters", async () => {
    const response = await POST(feedbackRequest({
      game_id: "enchanted-forest",
      rating: 4,
      comment: "a".repeat(1001),
    }));

    assert.equal(response.status, 422);
    assert.equal(await errorCode(response), "invalid_feedback");
    assert.equal(authLookupCount, 0);
  });

  it("cancels and rejects a streamed payload as soon as it exceeds 4 KB", async () => {
    let cancelled = false;
    let pulls = 0;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulls += 1;
        if (pulls === 1) {
          controller.enqueue(new Uint8Array(4097));
          return;
        }
        controller.error(new Error("the route read past its limit"));
      },
      cancel() {
        cancelled = true;
      },
    });
    const request = new Request("http://localhost:3000/api/game-feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: stream,
      duplex: "half",
    } as RequestInit & { duplex: "half" });

    const response = await POST(request);

    assert.equal(response.status, 413);
    assert.equal(await errorCode(response), "payload_too_large");
    assert.equal(cancelled, true);
    assert.equal(pulls, 1);
    assert.equal(authLookupCount, 0);
  });

  it("rejects malformed JSON", async () => {
    const response = await POST(feedbackRequest('{"game_id":'));

    assert.equal(response.status, 400);
    assert.equal(await errorCode(response), "invalid_json");
    assert.equal(authLookupCount, 0);
  });
});
