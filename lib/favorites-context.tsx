"use client";

import {
  createContext,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useToast } from "./toast-context";
import {
  addFavoriteToken,
  getFavoritesSnapshot,
  mergeLocalFavorites,
  removeFavoriteTokens,
} from "./favorites/actions";
import {
  favoritesSyncReducer,
  initialSyncState,
  mergeOutcome,
  migrateLegacyMergeMarker,
  tokensPendingMerge,
  withMergedTokens,
  type MergedTokenRecord,
} from "./favorites/sync";
import { isSupabaseConfigured } from "./supabase/env";
import { getSupabaseBrowserClient } from "./supabase/client";

const STORAGE_KEY = "rotemFavorites";
/** Which tokens this browser has offered to which account, so favourites saved
 * as a guest after an earlier merge are still picked up on a later sign-in. */
const MERGED_TOKENS_KEY = "rotemFavoritesMergedTokens";
/** The first-generation marker: a list of accounts that had merged, with no
 * record of what. Read once to seed MERGED_TOKENS_KEY, then removed. */
const LEGACY_MERGED_KEY = "rotemFavoritesMergedFor";
/** Tokens the merge could not resolve. Written so they stay visible rather than
 * vanish; localStorage still holds the originals under STORAGE_KEY too. */
const UNRESOLVED_KEY = "rotemFavoritesUnresolved";

interface FavoritesContextValue {
  favorites: string[];
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => void;
  /**
   * Removes several tokens in one write.
   *
   * Needed because one recipe can now answer to more than one saved token:
   * merging two records leaves a reader who had favourited both with
   * `recipe-instagram-171` and `biscuit-cake-07` in storage, and un-hearting
   * that one recipe has to clear both or it reappears. Calling
   * toggleFavorite in a loop would not work — each call recomputes from the
   * `favorites` array captured at render, so the second would undo the first.
   */
  removeFavorites: (ids: string[]) => void;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

/**
 * Re-checks the session on every client-side navigation. Renders nothing.
 *
 * Sign-out is a Server Action: it clears the cookies on the server and
 * redirects. The browser-side auth client is never told, so no auth event
 * fires — and because the redirect is a client-side navigation, the provider
 * never unmounts either. Without this, the account's favourites stay on screen
 * after signing out, for as long as the tab lives.
 *
 * The query string is watched as well as the path, because signing out from
 * /account lands on /account?signedOut=1 — a different page, the same path.
 *
 * Split into its own component, wrapped in <Suspense> by the provider, so that
 * useSearchParams() does not opt every statically generated page on the site
 * into client-side rendering.
 */
function SessionWatcher({ onNavigate }: { onNavigate: () => void }) {
  const pathname = usePathname();
  const query = useSearchParams().toString();

  useEffect(() => {
    onNavigate();
  }, [pathname, query, onNavigate]);

  return null;
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Storage can be unavailable (private browsing); in-memory state still updates. */
  }
}

function readStoredFavorites(): string[] {
  return readJson<string[]>(STORAGE_KEY, []);
}

/**
 * Whether this browser is carrying a Supabase session cookie.
 *
 * Sign-out runs as a Server Action: it clears the cookies and redirects, which
 * the browser-side auth client never hears about. Checking the cookie directly
 * is what lets the provider notice, and it is a synchronous string read rather
 * than a request — which matters because this provider wraps every page on the
 * site and most visitors are not signed in.
 */
function hasSessionCookie(): boolean {
  try {
    return /(?:^|;\s*)sb-[^=]*-auth-token(?:\.\d+)?=/.test(document.cookie);
  } catch {
    return false;
  }
}

/**
 * Saved favourites, from localStorage when signed out and from Supabase when
 * signed in.
 *
 * The public API is unchanged, deliberately: everything a caller passes or
 * reads here is a legacy token — "recipe-<id>", "biscuit-cake-NN",
 * "date-a-b-NN" — exactly as the original static site wrote them. Signed in,
 * the server resolves those tokens to canonical contentIds, stores those, and
 * expands them back into tokens on the way out. So FavoriteButton, the
 * favourites grid and every card keep working without knowing which store is
 * behind them.
 *
 * Signed-out behaviour is untouched: same key, same values, same writes.
 * localStorage is never cleared, even after a successful merge — it stays as
 * the record of what this browser saved.
 *
 * The identity and staleness rules live in ./favorites/sync, where they can be
 * tested directly.
 */
export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [localFavorites, setLocalFavorites] = useState<string[]>([]);
  const [sync, dispatch] = useReducer(favoritesSyncReducer, initialSyncState);
  const { showToast } = useToast();

  /**
   * The generation counter, and the identity it belongs to.
   *
   * Refs rather than state because both are read from asynchronous callbacks
   * that must see the value as of *now*, not as of the render they closed
   * over. The reducer mirrors the generation so that a result can be checked
   * against it; these two are the writable copy.
   */
  const generationRef = useRef(0);
  const remoteUserRef = useRef<string | null>(null);

  useEffect(() => {
    // Reading localStorage has to happen after mount (it isn't available
    // during server rendering, and must match the server's empty-array
    // output on the client's first render to avoid a hydration mismatch) —
    // this is the documented "synchronize from an external system" use of
    // an effect, not a computed/derived value.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocalFavorites(readStoredFavorites());
  }, []);

  /**
   * Drops back to localStorage.
   *
   * Bumping the generation is what makes this safe to call while a load is in
   * flight: that load's result will find the counter has moved and discard
   * itself instead of restoring the list that was just cleared.
   */
  const clearIdentity = useCallback(() => {
    if (remoteUserRef.current === null) return;
    remoteUserRef.current = null;
    dispatch({ type: "identity", generation: ++generationRef.current, userId: null });
  }, []);

  /**
   * Notices a session that ended without the browser client hearing about it.
   *
   * Only the clearing direction is handled here. A new sign-in always arrives
   * through a full page load — the OAuth callback redirects to /dashboard — so
   * onAuthStateChange reports it on mount.
   */
  const recheckSession = useCallback(() => {
    if (hasSessionCookie()) return;
    clearIdentity();
  }, [clearIdentity]);

  /**
   * Loads the given account's favourites, merging anything this browser saved
   * as a guest that the account has not been offered yet.
   *
   * Every result is checked against the generation it was started in. If the
   * signed-in account changed — or signed out — while the request was in
   * flight, the answer is thrown away rather than written over newer state.
   */
  const loadFor = useCallback(
    async (userId: string, generation: number) => {
      const stale = () => generationRef.current !== generation;

      try {
        const snapshot = await getFavoritesSnapshot();
        if (stale()) return;

        // The server is the authority on identity. A cookie can be stale, and a
        // session can end between the cookie check and the request landing.
        if (!snapshot.signedIn || !snapshot.userId) {
          clearIdentity();
          return;
        }
        if (snapshot.userId !== userId) return;

        const stored = readStoredFavorites();
        const legacyUserIds = readJson<string[]>(LEGACY_MERGED_KEY, []);
        let record = readJson<MergedTokenRecord>(MERGED_TOKENS_KEY, {});
        record = migrateLegacyMergeMarker(legacyUserIds, record, userId, stored);

        const pending = tokensPendingMerge(stored, record, userId);
        if (pending.length === 0) {
          dispatch({ type: "loaded", generation, userId, tokens: snapshot.tokens });
          return;
        }

        const result = await mergeLocalFavorites(pending);
        if (stale()) return;

        const outcome = mergeOutcome(pending, result);
        if (outcome.kind === "session-lost") {
          // The session ended while the merge was running, so nothing was
          // written to the account. Mark nothing, touch no storage, and drop
          // back to localStorage — every pending token stays eligible for the
          // next successful sign-in.
          clearIdentity();
          return;
        }

        // Only what actually resolved is marked as offered. An unresolved token
        // is left pending so a later sign-in tries again — if the item comes
        // back, the save comes back with it.
        writeJson(MERGED_TOKENS_KEY, withMergedTokens(record, userId, outcome.offered));
        try {
          localStorage.removeItem(LEGACY_MERGED_KEY);
        } catch {
          /* Storage unavailable; the merge still happened server-side. */
        }

        if (result.unresolved.length > 0) {
          writeJson(UNRESOLVED_KEY, result.unresolved);
          // Loud rather than silent. The tokens are still in localStorage
          // under rotemFavorites, and now under rotemFavoritesUnresolved.
          console.warn(
            `[favorites] ${result.unresolved.length} saved token(s) matched no known item and were not migrated:`,
            result.unresolved,
          );
        }

        dispatch({ type: "loaded", generation, userId, tokens: result.tokens });
      } catch (error) {
        // Falling back to localStorage is the safe failure: the reader keeps
        // seeing their saves instead of an empty list.
        console.error("[favorites] could not load saved favourites from the server", error);
        dispatch({ type: "failed", generation });
      }
    },
    [clearIdentity],
  );

  /**
   * Reconciles the provider with whoever is signed in now.
   *
   * Bumping the generation here — before the load starts, in the same tick as
   * the dispatch — is what makes an abandoned load harmless: it will compare
   * its own number against a counter that has already moved on.
   */
  const observeIdentity = useCallback(
    (userId: string | null) => {
      const next = userId && hasSessionCookie() ? userId : null;
      if (next === remoteUserRef.current) return;

      remoteUserRef.current = next;
      const generation = ++generationRef.current;
      dispatch({ type: "identity", generation, userId: next });
      if (next) void loadFor(next, generation);
    },
    [loadFor],
  );

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    // No cookie means no session and no request — the common case for a
    // visitor who is just browsing recipes.
    if (!hasSessionCookie()) {
      observeIdentity(null);
      return;
    }

    const supabase = getSupabaseBrowserClient();

    // onAuthStateChange emits the session held in cookies immediately, then
    // again on sign-in, sign-out, token refresh and account change — so this
    // one subscription covers both the initial read and every later change,
    // including one made in another tab.
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      observeIdentity(session?.user?.id ?? null);
    });

    // Covers a sign-out performed in another tab, and a return from the
    // back/forward cache. Navigation inside this tab is covered by
    // SessionWatcher.
    window.addEventListener("focus", recheckSession);
    window.addEventListener("pageshow", recheckSession);
    document.addEventListener("visibilitychange", recheckSession);

    return () => {
      subscription.subscription.unsubscribe();
      window.removeEventListener("focus", recheckSession);
      window.removeEventListener("pageshow", recheckSession);
      document.removeEventListener("visibilitychange", recheckSession);
    };
  }, [observeIdentity, recheckSession]);

  const remote = sync.remote;
  const signedIn = remote !== null;
  const favorites = remote?.tokens ?? localFavorites;

  /** Applies a write's result, unless the session moved on while it ran. */
  const applyWrite = useCallback(
    async (userId: string, generation: number, run: () => Promise<{ signedIn: boolean; tokens: string[] }>) => {
      const result = await run();
      if (generationRef.current !== generation) return;
      if (!result.signedIn) {
        clearIdentity();
        return;
      }
      dispatch({ type: "loaded", generation, userId, tokens: result.tokens });
    },
    [clearIdentity],
  );

  const toggleFavorite = useCallback(
    (id: string) => {
      // Side effects (localStorage, showToast — which updates ToastProvider's
      // own state) belong in the event handler body, not inside a setState
      // updater function: React can invoke an updater during its render
      // pass, and calling another component's setState from in there throws
      // "Cannot update a component while rendering a different component."
      const isSaved = favorites.includes(id);

      if (signedIn && remote) {
        const generation = generationRef.current;
        const previous = remote.tokens;
        // Optimistic: flip the heart now, then take the server's list as
        // authoritative — it knows the other tokens this item answers to.
        dispatch({
          type: "loaded",
          generation,
          userId: remote.userId,
          tokens: isSaved ? previous.filter((item) => item !== id) : [...previous, id],
        });
        showToast(isSaved ? "הוסר מהמועדפים" : "נשמר למועדפים ♡");

        void applyWrite(remote.userId, generation, () =>
          isSaved ? removeFavoriteTokens([id]) : addFavoriteToken(id),
        ).catch((error) => {
          console.error("[favorites] could not save the change", error);
          if (generationRef.current !== generation) return;
          dispatch({ type: "loaded", generation, userId: remote.userId, tokens: previous });
          showToast("לא הצלחנו לשמור את השינוי");
        });
        return;
      }

      const next = isSaved ? favorites.filter((item) => item !== id) : [...favorites, id];
      writeJson(STORAGE_KEY, next);
      setLocalFavorites(next);
      showToast(isSaved ? "הוסר מהמועדפים" : "נשמר למועדפים ♡");
    },
    [favorites, remote, signedIn, applyWrite, showToast],
  );

  const removeFavorites = useCallback(
    (ids: string[]) => {
      const removing = new Set(ids);

      if (signedIn && remote) {
        const generation = generationRef.current;
        const previous = remote.tokens;
        const next = previous.filter((item) => !removing.has(item));
        if (next.length === previous.length) return;

        dispatch({ type: "loaded", generation, userId: remote.userId, tokens: next });
        showToast("הוסר מהמועדפים");

        void applyWrite(remote.userId, generation, () => removeFavoriteTokens(ids)).catch((error) => {
          console.error("[favorites] could not remove the favourite", error);
          if (generationRef.current !== generation) return;
          dispatch({ type: "loaded", generation, userId: remote.userId, tokens: previous });
          showToast("לא הצלחנו לשמור את השינוי");
        });
        return;
      }

      const next = localFavorites.filter((item) => !removing.has(item));
      if (next.length === localFavorites.length) return;
      writeJson(STORAGE_KEY, next);
      setLocalFavorites(next);
      showToast("הוסר מהמועדפים");
    },
    [localFavorites, remote, signedIn, applyWrite, showToast],
  );

  const isFavorite = useCallback((id: string) => favorites.includes(id), [favorites]);

  const value = useMemo(
    () => ({ favorites, isFavorite, toggleFavorite, removeFavorites }),
    [favorites, isFavorite, toggleFavorite, removeFavorites],
  );

  return (
    <FavoritesContext.Provider value={value}>
      <Suspense fallback={null}>
        <SessionWatcher onNavigate={recheckSession} />
      </Suspense>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites(): FavoritesContextValue {
  const context = useContext(FavoritesContext);
  if (!context) throw new Error("useFavorites must be used within a FavoritesProvider");
  return context;
}
