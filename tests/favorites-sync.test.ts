/**
 * Regression tests for the ways signed-in favourites went wrong.
 *
 * Each suite below corresponds to one defect that shipped and had to be fixed:
 * one account's list surviving a sign-out, a merge that ran once and stranded
 * everything saved afterwards, a sync that a React Strict Mode remount left
 * permanently unloaded, and a session expiring mid-merge while the tokens it
 * never wrote were marked as done.
 *
 * Run with: npm run test:auth
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  favoritesSyncReducer,
  initialSyncState,
  mergeOutcome,
  migrateLegacyMergeMarker,
  tokensPendingMerge,
  withMergedTokens,
  type MergedTokenRecord,
  type SyncState,
} from "../lib/favorites/sync.ts";

const ALICE = "11111111-1111-4111-8111-111111111111";
const BOB = "22222222-2222-4222-8222-222222222222";

/** State as it looks with one account's favourites on screen. */
function loadedFor(userId: string, tokens: string[], generation = 1): SyncState {
  return { remote: { userId, tokens }, generation };
}

/* ------------------------------------------------------------------------ */
/* Finding 1 — identity                                                      */
/* ------------------------------------------------------------------------ */

describe("identity changes clear the loaded list", () => {
  it("drops the list on sign-out instead of leaving it on screen", () => {
    const signedIn = loadedFor(ALICE, ["recipe-a", "recipe-b"]);

    const next = favoritesSyncReducer(signedIn, { type: "identity", generation: 2, userId: null });

    // The whole point: a signed-out visitor must never still be looking at the
    // previous account's saves.
    assert.equal(next.remote, null);
    assert.equal(next.generation, 2);
  });

  it("drops the previous account's list the moment another account appears", () => {
    const asAlice = loadedFor(ALICE, ["recipe-a"]);

    const next = favoritesSyncReducer(asAlice, { type: "identity", generation: 2, userId: BOB });

    // Cleared immediately rather than when Bob's list arrives — otherwise Bob
    // sees Alice's favourites for the length of a round trip.
    assert.equal(next.remote, null);
  });

  it("ignores a response that belonged to the previous session", () => {
    const asAlice = loadedFor(ALICE, ["recipe-a"], 1);

    // Alice signs out; her in-flight request lands afterwards.
    const signedOut = favoritesSyncReducer(asAlice, { type: "identity", generation: 2, userId: null });
    const afterLateReply = favoritesSyncReducer(signedOut, {
      type: "loaded",
      generation: 1,
      userId: ALICE,
      tokens: ["recipe-a", "recipe-b"],
    });

    assert.equal(afterLateReply.remote, null, "a stale reply must not restore a signed-out list");
  });

  it("ignores one account's response arriving after another has signed in", () => {
    let state: SyncState = loadedFor(ALICE, ["recipe-a"], 1);
    state = favoritesSyncReducer(state, { type: "identity", generation: 2, userId: BOB });
    state = favoritesSyncReducer(state, { type: "loaded", generation: 2, userId: BOB, tokens: ["recipe-b"] });

    // Alice's request finally returns.
    const next = favoritesSyncReducer(state, {
      type: "loaded",
      generation: 1,
      userId: ALICE,
      tokens: ["recipe-a"],
    });

    assert.deepEqual(next.remote, { userId: BOB, tokens: ["recipe-b"] });
  });

  it("tags the loaded list with the account it belongs to", () => {
    const next = favoritesSyncReducer(initialSyncState, {
      type: "loaded",
      generation: 0,
      userId: ALICE,
      tokens: ["recipe-a"],
    });

    assert.equal(next.remote?.userId, ALICE);
  });

  it("falls back to localStorage when a current load fails", () => {
    const state = loadedFor(ALICE, ["recipe-a"], 3);

    const next = favoritesSyncReducer(state, { type: "failed", generation: 3 });

    assert.equal(next.remote, null);
  });

  it("ignores a failure belonging to an abandoned load", () => {
    const state = loadedFor(BOB, ["recipe-b"], 4);

    const next = favoritesSyncReducer(state, { type: "failed", generation: 2 });

    assert.deepEqual(next.remote, { userId: BOB, tokens: ["recipe-b"] });
  });
});

/* ------------------------------------------------------------------------ */
/* Finding 2 — merge marker                                                  */
/* ------------------------------------------------------------------------ */

describe("guest favourites saved after an earlier merge", () => {
  it("merges tokens added since the last sign-in", () => {
    // Alice merged two recipes on a previous login, then saved a third while
    // signed out.
    const record: MergedTokenRecord = { [ALICE]: ["recipe-a", "recipe-b"] };

    const pending = tokensPendingMerge(["recipe-a", "recipe-b", "recipe-c"], record, ALICE);

    // A one-shot "this account already merged" flag would strand recipe-c
    // in localStorage forever.
    assert.deepEqual(pending, ["recipe-c"]);
  });

  it("does not resurrect something merged before and deleted since", () => {
    // recipe-a was merged, then un-hearted while signed in. It is still in this
    // browser's localStorage, because localStorage is never rewritten.
    const record: MergedTokenRecord = { [ALICE]: ["recipe-a", "recipe-b"] };

    const pending = tokensPendingMerge(["recipe-a", "recipe-b"], record, ALICE);

    assert.deepEqual(pending, [], "already-offered tokens must never be offered again");
  });

  it("keeps each account's history separate", () => {
    const record: MergedTokenRecord = { [ALICE]: ["recipe-a"] };

    // Bob signing in on Alice's browser gets a merge of his own.
    assert.deepEqual(tokensPendingMerge(["recipe-a"], record, BOB), ["recipe-a"]);
    assert.deepEqual(tokensPendingMerge(["recipe-a"], record, ALICE), []);
  });

  it("offers everything on a first sign-in", () => {
    assert.deepEqual(tokensPendingMerge(["recipe-a", "date-a-b-03"], {}, ALICE), ["recipe-a", "date-a-b-03"]);
  });

  it("does not offer the same token twice from one list", () => {
    assert.deepEqual(tokensPendingMerge(["recipe-a", "recipe-a"], {}, ALICE), ["recipe-a"]);
  });

  it("accumulates offered tokens without duplicating them", () => {
    let record = withMergedTokens({}, ALICE, ["recipe-a"]);
    record = withMergedTokens(record, ALICE, ["recipe-a", "recipe-b"]);

    assert.deepEqual(record[ALICE].sort(), ["recipe-a", "recipe-b"]);
  });

  it("leaves other accounts untouched when recording", () => {
    const record = withMergedTokens({ [BOB]: ["recipe-b"] }, ALICE, ["recipe-a"]);

    assert.deepEqual(record[BOB], ["recipe-b"]);
    assert.deepEqual(record[ALICE], ["recipe-a"]);
  });

  describe("upgrading the first-generation marker", () => {
    it("treats everything currently stored as already offered", () => {
      // The old marker recorded only that Alice had merged, not what. Assuming
      // the current list was covered is the choice that cannot resurrect a
      // deleted favourite.
      const record = migrateLegacyMergeMarker([ALICE], {}, ALICE, ["recipe-a", "recipe-b"]);

      assert.deepEqual(record[ALICE].sort(), ["recipe-a", "recipe-b"]);
      assert.deepEqual(tokensPendingMerge(["recipe-a", "recipe-b"], record, ALICE), []);
    });

    it("still merges anything saved after the upgrade", () => {
      const record = migrateLegacyMergeMarker([ALICE], {}, ALICE, ["recipe-a"]);

      assert.deepEqual(tokensPendingMerge(["recipe-a", "recipe-c"], record, ALICE), ["recipe-c"]);
    });

    it("does nothing for an account the old marker never listed", () => {
      const record = migrateLegacyMergeMarker([ALICE], {}, BOB, ["recipe-a"]);

      assert.deepEqual(record, {});
      assert.deepEqual(tokensPendingMerge(["recipe-a"], record, BOB), ["recipe-a"]);
    });

    it("never overwrites a record that already exists", () => {
      const existing: MergedTokenRecord = { [ALICE]: ["recipe-a"] };

      const record = migrateLegacyMergeMarker([ALICE], existing, ALICE, ["recipe-a", "recipe-z"]);

      assert.deepEqual(record[ALICE], ["recipe-a"]);
    });
  });
});

/* ------------------------------------------------------------------------ */
/* Finding 3 — Strict Mode and stale requests                                */
/* ------------------------------------------------------------------------ */

describe("survives a Strict Mode cleanup and restart", () => {
  it("loads on the restarted run after the first is abandoned", () => {
    // React mounts, cleans up, and mounts again. Run 1 is abandoned mid-flight;
    // run 2 starts with a fresh generation.
    let state = favoritesSyncReducer(initialSyncState, { type: "identity", generation: 1, userId: ALICE });
    state = favoritesSyncReducer(state, { type: "identity", generation: 2, userId: ALICE });

    // Run 1 replies late and must be ignored...
    state = favoritesSyncReducer(state, { type: "loaded", generation: 1, userId: ALICE, tokens: ["stale"] });
    assert.equal(state.remote, null);

    // ...and run 2 must still be able to load. The earlier implementation used
    // a boolean "already syncing" latch that the cleanup left set, so the
    // restart gave up here and favourites never appeared at all.
    state = favoritesSyncReducer(state, { type: "loaded", generation: 2, userId: ALICE, tokens: ["recipe-a"] });
    assert.deepEqual(state.remote, { userId: ALICE, tokens: ["recipe-a"] });
  });

  it("does not let a slow first request overwrite a faster second one", () => {
    let state = favoritesSyncReducer(initialSyncState, { type: "identity", generation: 1, userId: ALICE });
    state = favoritesSyncReducer(state, { type: "identity", generation: 2, userId: ALICE });

    // The newer request wins the race...
    state = favoritesSyncReducer(state, { type: "loaded", generation: 2, userId: ALICE, tokens: ["fresh"] });
    // ...and the older one lands afterwards.
    state = favoritesSyncReducer(state, { type: "loaded", generation: 1, userId: ALICE, tokens: ["stale"] });

    assert.deepEqual(state.remote?.tokens, ["fresh"]);
  });

  it("does not let an abandoned run's failure clear a newer loaded list", () => {
    let state = favoritesSyncReducer(initialSyncState, { type: "identity", generation: 1, userId: ALICE });
    state = favoritesSyncReducer(state, { type: "identity", generation: 2, userId: ALICE });
    state = favoritesSyncReducer(state, { type: "loaded", generation: 2, userId: ALICE, tokens: ["recipe-a"] });

    state = favoritesSyncReducer(state, { type: "failed", generation: 1 });

    assert.deepEqual(state.remote, { userId: ALICE, tokens: ["recipe-a"] });
  });

  it("keeps an optimistic write from being undone by an older in-flight load", () => {
    let state = favoritesSyncReducer(initialSyncState, { type: "identity", generation: 1, userId: ALICE });
    state = favoritesSyncReducer(state, { type: "loaded", generation: 1, userId: ALICE, tokens: ["recipe-a"] });

    // The reader hearts something; the optimistic update rides the current
    // generation, so a reply from an earlier generation cannot roll it back.
    state = favoritesSyncReducer(state, {
      type: "loaded",
      generation: 1,
      userId: ALICE,
      tokens: ["recipe-a", "recipe-b"],
    });
    state = favoritesSyncReducer(state, { type: "loaded", generation: 0, userId: ALICE, tokens: [] });

    assert.deepEqual(state.remote?.tokens, ["recipe-a", "recipe-b"]);
  });
});

/* ------------------------------------------------------------------------ */
/* Session expiry during the merge                                           */
/* ------------------------------------------------------------------------ */

describe("a session that expires while the merge is running", () => {
  const pending = ["recipe-a", "recipe-b", "date-a-b-03"];

  it("marks nothing as offered when the merge reports no session", () => {
    // The action returns signedIn:false with an empty `unresolved` list,
    // because it never got as far as resolving anything.
    const outcome = mergeOutcome(pending, { signedIn: false, unresolved: [] });

    assert.equal(outcome.kind, "session-lost");
  });

  it("leaves every pending token eligible for the next successful login", () => {
    const outcome = mergeOutcome(pending, { signedIn: false, unresolved: [] });

    // Nothing is recorded, so the record is untouched...
    const record: MergedTokenRecord = outcome.kind === "session-lost" ? {} : withMergedTokens({}, ALICE, outcome.offered);

    // ...and all three are still waiting when the reader signs in again.
    assert.deepEqual(tokensPendingMerge(pending, record, ALICE), pending);
  });

  it("would have stranded every token if signedIn were ignored", () => {
    // The bug this replaces: the old code derived `offered` from `unresolved`
    // alone. With a lost session that list is empty, which reads as "everything
    // resolved", so all three got marked offered and were never merged again —
    // the reader's guest favourites lost for good.
    const asTheOldCodeDidIt = withMergedTokens({}, ALICE, pending);
    assert.deepEqual(tokensPendingMerge(pending, asTheOldCodeDidIt, ALICE), []);

    // Nothing may be recorded now, so nothing is stranded.
    const outcome = mergeOutcome(pending, { signedIn: false, unresolved: [] });
    assert.notEqual(outcome.kind, "merged");
  });

  it("still records normally when the session held", () => {
    const outcome = mergeOutcome(pending, { signedIn: true, unresolved: ["date-a-b-03"] });

    assert.equal(outcome.kind, "merged");
    if (outcome.kind !== "merged") return;
    assert.deepEqual(outcome.offered, ["recipe-a", "recipe-b"]);
    assert.deepEqual(outcome.unresolved, ["date-a-b-03"]);

    // The unresolved one stays pending; the two that landed do not.
    const record = withMergedTokens({}, ALICE, outcome.offered);
    assert.deepEqual(tokensPendingMerge(pending, record, ALICE), ["date-a-b-03"]);
  });

  it("marks everything when the session held and all tokens resolved", () => {
    const outcome = mergeOutcome(pending, { signedIn: true, unresolved: [] });

    assert.equal(outcome.kind, "merged");
    if (outcome.kind !== "merged") return;
    assert.deepEqual(outcome.offered, pending);

    const record = withMergedTokens({}, ALICE, outcome.offered);
    assert.deepEqual(tokensPendingMerge(pending, record, ALICE), []);
  });
});
