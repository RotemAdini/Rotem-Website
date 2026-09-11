# localStorage → Supabase favourites migration (design only)

Nothing in this document has been executed. It is the plan the migration will
follow, written now so the table and the policies could be designed against it.

## What exists today

Favourites live in `localStorage` under **`rotemFavorites`**, a plain JSON array
of strings. The token shapes are unchanged since before the CMS migration:

| Token shape | Example | Count |
| --- | --- | --- |
| `recipe-<legacy route id>` | `recipe-instagram-112` | 159 |
| `biscuit-cake-NN` | `biscuit-cake-07` | 15 |
| `date-a-b-NN` | `date-a-b-09` | 13 |
| | **total** | **187** |

Signed-out visitors keep using exactly this, unchanged, throughout and after
the migration.

## The alias map

Every Sanity document carries `legacyIds` — the exact tokens it must answer to.
That array is the migration's lookup table, and it already exists: the
importer wrote it from `data/migration/content-manifest.json`, and
`scripts/verify-sanity-import.ts` asserts on every run that all 187 tokens
resolve to exactly one document.

Verified against the live dataset:

- **187 tokens, all distinct**, across **172 documents** (159 recipes + 13 date ideas)
- **0 tokens resolve to more than one `contentId`**
- **15 documents carry two tokens each** — these are the merges, and they are
  precisely the case that must collapse to one row

Games hold no tokens and are not favouritable.

The query is already written, in `sanity/lib/queries.ts`:

```groq
*[_type in ["recipe", "dateIdea", "game"] && count(legacyIds) > 0]{
  contentId, "contentType": _type, legacyIds
}
```

Flattened, that gives `token → { contentId, contentType }`. Because 15
documents own two tokens, the map is **many-to-one**, and that is what makes a
reader who saved both `recipe-instagram-171` and `biscuit-cake-07` end up with
**one** favourite rather than two.

## The migration

Runs once per user, on their first sign-in.

1. **Read** `rotemFavorites`. Do not modify it.
2. **Resolve** each token through the alias map to `{ contentType, contentId }`.
   Deduplicate on `contentId` — this is where merged aliases collapse.
3. **Insert** the resulting rows for `auth.uid()`.
4. **Report** every token that did not resolve. Never drop one silently.
5. **Mark** completion with a separate key, e.g. `rotemFavoritesMigratedAt`.
   **Do not delete `rotemFavorites`.**

### Why it is idempotent

Two independent mechanisms, either of which alone would be enough:

- `unique (user_id, content_type, content_id)` in the table, combined with an
  upsert that ignores conflicts. Re-running inserts nothing.
- Deduplication on `contentId` before the insert, so one run cannot produce two
  rows for one item even from two aliases.

Running it twice, or on two devices, or after a partial failure, converges on
the same rows. That also makes merging a second device's local favourites into
an existing account safe.

### Why localStorage is not deleted

Three reasons, all of which have to hold before deletion is even considered:

- a partial or failed run must be retryable, and the source has to still be there;
- the reader may sign out again, and signed-out favourites must keep working;
- until the migration has been verified for a given user, `localStorage` is the
  only copy of their data.

The marker key records that the migration ran. Deleting `rotemFavorites` is a
later, separate decision — if ever.

### Unresolved tokens

A token that resolves to nothing is returned to the caller and persisted (an
`unmigrated_favorite_tokens` row, or a column on the user's profile), not
discarded. This is the one behaviour that must change from today: the current
`FavoritesGrid` filters unresolvable tokens out of the display with no trace,
so a reader whose token stopped resolving simply sees it vanish.

### During the transition

- Signed-out: `localStorage` only, exactly as today.
- Signed-in: Supabase is the source of truth; `localStorage` becomes a
  signed-out fallback and an offline cache in front of it.
- `lib/favorites-context.tsx` is the only module that touches storage, so this
  is one file's worth of change plus the migration call.

## What must be true before it runs

- Supabase project exists, the table and policies are applied.
- Authentication works end to end (a user can actually sign in).
- A CI assertion that all 187 tokens resolve to exactly one `contentId` — the
  existing verifier already performs this check.
