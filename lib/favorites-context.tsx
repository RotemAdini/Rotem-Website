"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useToast } from "./toast-context";

const STORAGE_KEY = "rotemFavorites";

interface FavoritesContextValue {
  favorites: string[];
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => void;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

function readStoredFavorites(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

/** Favorites are stored in localStorage exactly like the original static
 * site (same key, same id shapes: "recipe-<id>", "biscuit-cake-<id>",
 * "date-a-b-<id>") so nothing here is a new data model — just a React
 * wrapper around the same mechanism, ready to be swapped for a Supabase-backed
 * store later without changing the ids callers use. */
export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<string[]>([]);
  const { showToast } = useToast();

  useEffect(() => {
    // Reading localStorage has to happen after mount (it isn't available
    // during server rendering, and must match the server's empty-array
    // output on the client's first render to avoid a hydration mismatch) —
    // this is the documented "synchronize from an external system" use of
    // an effect, not a computed/derived value.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFavorites(readStoredFavorites());
  }, []);

  const toggleFavorite = useCallback(
    (id: string) => {
      // Side effects (localStorage, showToast — which updates ToastProvider's
      // own state) belong in the event handler body, not inside a setState
      // updater function: React can invoke an updater during its render
      // pass, and calling another component's setState from in there throws
      // "Cannot update a component while rendering a different component."
      const isSaved = favorites.includes(id);
      const next = isSaved ? favorites.filter((item) => item !== id) : [...favorites, id];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* Storage can be unavailable (private browsing); the in-memory state still updates. */
      }
      setFavorites(next);
      showToast(isSaved ? "הוסר מהמועדפים" : "נשמר למועדפים ♡");
    },
    [favorites, showToast],
  );

  const isFavorite = useCallback((id: string) => favorites.includes(id), [favorites]);

  const value = useMemo(() => ({ favorites, isFavorite, toggleFavorite }), [favorites, isFavorite, toggleFavorite]);

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites(): FavoritesContextValue {
  const context = useContext(FavoritesContext);
  if (!context) throw new Error("useFavorites must be used within a FavoritesProvider");
  return context;
}
