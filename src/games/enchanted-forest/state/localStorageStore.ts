/**
 * localStorage implementation of `ProgressStore`.
 *
 * The only file in the module that touches a browser storage API. Everything
 * else works against the interface, so a server-backed store can replace this
 * later without a single component changing (V1_ARCHITECTURE.md §8).
 *
 * Storage can fail for perfectly ordinary reasons — private browsing, blocked
 * site data, a full quota. None of them may break the game: every access is
 * guarded and failure degrades to an in-memory session.
 */

import {
  CONTENT_VERSION,
  LEGACY_PROGRESS_STORAGE_KEYS,
  PROGRESS_STORAGE_KEY,
  TOTAL_STATIONS,
} from '../constants.ts';
import type { Progress } from '../types/state.ts';
import { createMemoryProgressStore, deserializeProgress, serializeProgress } from './persistence.ts';
import type { ProgressStore } from './persistence.ts';

/** Minimal slice of the Storage API we rely on. Injectable for tests. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface LocalProgressStore extends ProgressStore {
  /** False when storage was unavailable and the store fell back to memory. */
  readonly persistent: boolean;
}

function probe(storage: StorageLike, key: string): boolean {
  try {
    const probeKey = `${key}:probe`;
    storage.setItem(probeKey, '1');
    storage.removeItem(probeKey);
    return true;
  } catch {
    return false;
  }
}

/** Returns `window.localStorage`, or null when it is unavailable or throws. */
export function detectStorage(): StorageLike | null {
  try {
    if (typeof globalThis === 'undefined') return null;
    const candidate = (globalThis as { localStorage?: StorageLike }).localStorage;
    if (!candidate) return null;
    return probe(candidate, PROGRESS_STORAGE_KEY) ? candidate : null;
  } catch {
    return null;
  }
}

export function createLocalProgressStore(
  storage: StorageLike | null = detectStorage(),
  key: string = PROGRESS_STORAGE_KEY,
  legacyKeys: readonly string[] = LEGACY_PROGRESS_STORAGE_KEYS,
): LocalProgressStore {
  if (!storage) {
    // No usable storage: play on, just without persistence.
    const memory = createMemoryProgressStore();
    return { ...memory, persistent: false };
  }

  const options = { totalStations: TOTAL_STATIONS, contentVersion: CONTENT_VERSION };

  /**
   * Move a save written under an older key onto the current one.
   *
   * Runs only when the current key holds nothing, so it can never overwrite a
   * live save with a stale one. The old key is removed whether or not its
   * contents survived validation — a value that does not parse is not going to
   * start parsing later, and leaving it behind defeats the namespace.
   */
  const migrateLegacy = (): string | null => {
    for (const legacyKey of legacyKeys) {
      if (legacyKey === key) continue;
      let raw: string | null = null;
      try {
        raw = storage.getItem(legacyKey);
      } catch {
        continue;
      }
      try {
        storage.removeItem(legacyKey);
      } catch {
        /* a read-only or full store still lets the value be used below */
      }
      if (raw === null || raw === '') continue;
      try {
        storage.setItem(key, raw);
      } catch {
        /* quota: the value is still returned for this session */
      }
      return raw;
    }
    return null;
  };

  return {
    persistent: true,

    load: async (): Promise<Progress | null> => {
      try {
        // Validated and repaired by `deserializeProgress`; corrupt data reads as "no save"
        // rather than throwing or poisoning state.
        const raw = storage.getItem(key) ?? migrateLegacy();
        return deserializeProgress(raw, options);
      } catch {
        return null;
      }
    },

    save: async (progress: Progress): Promise<void> => {
      try {
        storage.setItem(key, serializeProgress(progress));
      } catch {
        // Quota or a locked-down browser. Losing a save is not worth a crash.
      }
    },

    /**
     * Clear THIS game's progress and nothing else.
     *
     * Deliberately key-by-key rather than `storage.clear()`: on the host site
     * this origin is shared with the rest of rotemadini.com, and a restart
     * inside one game must never sign a visitor out of the site or wipe another
     * game's save. Legacy keys go too, so restarting also finishes the
     * migration for a couple who never re-loaded.
     */
    clear: async (): Promise<void> => {
      for (const target of [key, ...legacyKeys]) {
        try {
          storage.removeItem(target);
        } catch {
          /* ignore */
        }
      }
    },
  };
}
