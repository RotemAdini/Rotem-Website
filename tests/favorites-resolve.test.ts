/**
 * Focused tests for the two id spaces favourites live in.
 *
 * These pin the invariants the localStorage -> Supabase merge depends on:
 * several legacy tokens for one item collapse to a single row, a token that
 * matches nothing is reported rather than dropped, and running the same
 * resolution twice produces the same result.
 *
 * Run with: npm run test:auth
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { expandContentIds, resolveTokens, type FavoriteAliasMap } from "../lib/favorites/resolve.ts";

/** A stand-in for what Sanity returns, shaped like the real thing:
 *  - a plain recipe with one token
 *  - a merged recipe answering to its own token AND an absorbed series card
 *  - a date idea */
function buildAliases(): FavoriteAliasMap {
  const byToken = new Map<string, { contentId: string; contentType: "recipe" | "dateIdea" }>([
    ["recipe-instagram-42", { contentId: "recipe_01ABCDEFGHJKMNPQRSTVWXYZ01", contentType: "recipe" }],
    ["recipe-instagram-171", { contentId: "recipe_01ABCDEFGHJKMNPQRSTVWXYZ02", contentType: "recipe" }],
    ["biscuit-cake-07", { contentId: "recipe_01ABCDEFGHJKMNPQRSTVWXYZ02", contentType: "recipe" }],
    ["date-a-b-03", { contentId: "date_01ABCDEFGHJKMNPQRSTVWXYZ03", contentType: "dateIdea" }],
  ]);

  const tokensByContentId = new Map<string, string[]>([
    ["recipe_01ABCDEFGHJKMNPQRSTVWXYZ01", ["recipe-instagram-42"]],
    ["recipe_01ABCDEFGHJKMNPQRSTVWXYZ02", ["recipe-instagram-171", "biscuit-cake-07"]],
    ["date_01ABCDEFGHJKMNPQRSTVWXYZ03", ["date-a-b-03"]],
  ]);

  return { byToken, tokensByContentId };
}

describe("resolveTokens", () => {
  it("collapses several aliases of one item into a single row", () => {
    const { resolved, unresolved } = resolveTokens(["recipe-instagram-171", "biscuit-cake-07"], buildAliases());

    // Two saved tokens, one saved thing. Writing both would hit the table's
    // unique (user_id, content_type, content_id) constraint.
    assert.equal(resolved.size, 1);
    assert.deepEqual([...resolved.keys()], ["recipe_01ABCDEFGHJKMNPQRSTVWXYZ02"]);
    assert.deepEqual(unresolved, []);
  });

  it("keeps distinct items distinct and tags each with its content type", () => {
    const { resolved } = resolveTokens(["recipe-instagram-42", "date-a-b-03"], buildAliases());

    assert.equal(resolved.size, 2);
    assert.equal(resolved.get("recipe_01ABCDEFGHJKMNPQRSTVWXYZ01")?.contentType, "recipe");
    assert.equal(resolved.get("date_01ABCDEFGHJKMNPQRSTVWXYZ03")?.contentType, "dateIdea");
  });

  it("reports tokens that match nothing instead of dropping them", () => {
    const { resolved, unresolved } = resolveTokens(
      ["recipe-instagram-42", "recipe-deleted-999", "gift-basket-01"],
      buildAliases(),
    );

    assert.equal(resolved.size, 1);
    // Losing a reader's save silently is the one unacceptable outcome, so an
    // unknown token has to come back to the caller.
    assert.deepEqual(unresolved, ["recipe-deleted-999", "gift-basket-01"]);
  });

  it("does not report the same unresolved token twice", () => {
    const { unresolved } = resolveTokens(["gift-basket-01", "gift-basket-01"], buildAliases());

    assert.deepEqual(unresolved, ["gift-basket-01"]);
  });

  it("is idempotent — resolving the same tokens again gives the same result", () => {
    const aliases = buildAliases();
    const tokens = ["recipe-instagram-171", "biscuit-cake-07", "date-a-b-03", "unknown-token"];

    const first = resolveTokens(tokens, aliases);
    const second = resolveTokens(tokens, aliases);

    assert.deepEqual([...first.resolved.keys()].sort(), [...second.resolved.keys()].sort());
    assert.deepEqual(first.unresolved, second.unresolved);
  });

  it("returns nothing for an empty list", () => {
    const { resolved, unresolved } = resolveTokens([], buildAliases());

    assert.equal(resolved.size, 0);
    assert.deepEqual(unresolved, []);
  });
});

describe("expandContentIds", () => {
  it("gives back every token a saved item answers to", () => {
    const tokens = expandContentIds(["recipe_01ABCDEFGHJKMNPQRSTVWXYZ02"], buildAliases());

    // Both, so the heart reads as saved on a card rendered under either token.
    assert.deepEqual(tokens.sort(), ["biscuit-cake-07", "recipe-instagram-171"]);
  });

  it("round-trips: resolve then expand covers the original tokens", () => {
    const aliases = buildAliases();
    const original = ["recipe-instagram-171", "biscuit-cake-07", "date-a-b-03"];

    const { resolved } = resolveTokens(original, aliases);
    const expanded = expandContentIds([...resolved.keys()], aliases);

    for (const token of original) {
      assert.ok(expanded.includes(token), `expected ${token} to survive the round trip`);
    }
  });

  it("ignores a contentId with no known tokens rather than throwing", () => {
    const tokens = expandContentIds(["recipe_01ZZZZZZZZZZZZZZZZZZZZZZZZ"], buildAliases());

    assert.deepEqual(tokens, []);
  });
});
