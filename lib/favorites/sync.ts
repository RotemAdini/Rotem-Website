/**
 * The bookkeeping behind signed-in favourites, kept as plain data so it can be
 * reasoned about — and tested — without React.
 *
 * Three things go wrong if this is done casually inside a component, and all
 * three are what this module exists to prevent:
 *
 *   1. One account's favourites staying on screen after a sign-out, or after a
 *      different account signs in. Identity is therefore part of the state, not
 *      a side note: the loaded list is always tagged with the user it belongs
 *      to, and any change of identity clears it immediately rather than when
 *      the replacement finally arrives.
 *   2. A merge that runs once and never again, so anything saved as a guest
 *      after that first login is stranded in localStorage forever. Tracking
 *      which tokens have been offered — rather than whether a merge happened —
 *      fixes that without resurrecting items the reader deleted since.
 *   3. An in-flight request finishing after the state it was started for is
 *      gone, and overwriting newer data with older. Every asynchronous result
 *      carries the generation it was started in and is dropped if that
 *      generation has moved on.
 */

export interface FavoritesRemote {
  /** The account this list belongs to. Never rendered without checking it. */
  userId: string;
  /** Saved items, expanded to every legacy token that resolves to them. */
  tokens: string[];
}

export interface SyncState {
  remote: FavoritesRemote | null;
  /**
   * Bumped whenever the identity being loaded for changes.
   *
   * This is what makes the whole thing safe under React Strict Mode, which
   * mounts, cleans up and remounts an effect. A boolean "already syncing" latch
   * cannot survive that — the cleanup runs, the restart sees the latch still
   * set and gives up, and favourites never load at all. A counter has no such
   * failure mode: the restart simply takes the next number, and the abandoned
   * run's result is recognised as stale when it lands.
   */
  generation: number;
}

export type SyncAction =
  /**
   * The signed-in identity changed — to somebody else, or to nobody.
   *
   * The generation is supplied by the caller rather than incremented here,
   * because the asynchronous load has to be started with the same number in
   * the same tick. Reading it back out of reducer state would mean reading it
   * before React has committed the update.
   */
  | { type: "identity"; generation: number; userId: string | null }
  /** A load or a write came back. Applied only if its generation is current. */
  | { type: "loaded"; generation: number; userId: string; tokens: string[] }
  /** A load or a write failed. Falls back to localStorage if still current. */
  | { type: "failed"; generation: number };

export const initialSyncState: SyncState = { remote: null, generation: 0 };

export function favoritesSyncReducer(state: SyncState, action: SyncAction): SyncState {
  switch (action.type) {
    case "identity": {
      // Always clears. Whether this is a sign-out or a different account
      // signing in, continuing to show the list that is on screen would be
      // showing one session's saves to another. Waiting for the replacement to
      // arrive is not good enough — if no request is in flight, or it fails,
      // the stale list would simply stay.
      return { remote: null, generation: action.generation };
    }

    case "loaded": {
      if (action.generation !== state.generation) return state;
      return { ...state, remote: { userId: action.userId, tokens: action.tokens } };
    }

    case "failed": {
      if (action.generation !== state.generation) return state;
      if (state.remote === null) return state;
      return { ...state, remote: null };
    }

    default:
      return state;
  }
}

/* ------------------------------------------------------------------ merge */

/** Which tokens this browser has already offered to which account. */
export type MergedTokenRecord = Record<string, string[]>;

/**
 * The tokens that still need offering to this account.
 *
 * Recording tokens rather than a "merged: yes" flag is the whole point. A
 * reader who saves three more recipes while signed out, then signs back in,
 * gets those three merged — a one-shot marker would strand them. And a recipe
 * they merged earlier and then un-hearted while signed in stays in this record,
 * so it is not offered again and does not come back from the dead.
 */
export function tokensPendingMerge(
  stored: readonly string[],
  record: MergedTokenRecord,
  userId: string,
): string[] {
  const alreadyOffered = new Set(record[userId] ?? []);
  const pending: string[] = [];
  for (const token of stored) {
    if (alreadyOffered.has(token) || pending.includes(token)) continue;
    pending.push(token);
  }
  return pending;
}

/** Adds tokens to what this account has been offered. */
export function withMergedTokens(
  record: MergedTokenRecord,
  userId: string,
  tokens: readonly string[],
): MergedTokenRecord {
  const merged = new Set([...(record[userId] ?? []), ...tokens]);
  return { ...record, [userId]: [...merged] };
}

/** What to do with a set of pending tokens once the merge has answered. */
export type MergeOutcome =
  /** The session was gone by the time the merge ran. Nothing was written. */
  | { kind: "session-lost" }
  /** The merge ran. `offered` may be marked; `unresolved` stays pending. */
  | { kind: "merged"; offered: string[]; unresolved: string[] };

/**
 * Decides what a merge result means for the pending tokens.
 *
 * The case that matters is a session expiring mid-merge. The action answers
 * signedIn:false and — because it never got as far as resolving anything — an
 * empty `unresolved` list. Read naively, "nothing failed to resolve" looks
 * identical to "everything resolved", so every pending token would be marked
 * as already offered and never merged again: the reader's guest favourites
 * would be silently stranded in localStorage forever.
 *
 * So signedIn is checked first, and a lost session marks nothing at all. The
 * tokens stay eligible and the next successful sign-in picks them up.
 */
export function mergeOutcome(
  pending: readonly string[],
  result: { signedIn: boolean; unresolved: readonly string[] },
): MergeOutcome {
  if (!result.signedIn) return { kind: "session-lost" };

  return {
    kind: "merged",
    offered: pending.filter((token) => !result.unresolved.includes(token)),
    unresolved: pending.filter((token) => result.unresolved.includes(token)),
  };
}

/**
 * Upgrades the first-generation marker, which recorded only *that* an account
 * had merged, not *what*.
 *
 * There is no way to recover which tokens that merge covered, so everything
 * currently in localStorage is treated as already offered. That errs towards
 * not resurrecting something the reader deleted, at the cost of possibly
 * skipping a token saved between the old merge and this upgrade — the safer of
 * the two mistakes, and only possible once.
 */
export function migrateLegacyMergeMarker(
  legacyUserIds: readonly string[],
  record: MergedTokenRecord,
  userId: string,
  stored: readonly string[],
): MergedTokenRecord {
  if (!legacyUserIds.includes(userId)) return record;
  if (record[userId]) return record;
  return withMergedTokens(record, userId, stored);
}
