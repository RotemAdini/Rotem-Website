# ID architecture audit — 7 September 2026

Pre-work for migrating content into Sanity and favorites into Supabase.
No IDs, URLs or favorites behaviour were changed by this audit.

## A. Public cleanup

Five internal working files were being served publicly from `public/recipes/`.
They were moved (not deleted, not modified) with `git mv`, so git records them
as 100% renames. Byte-for-byte identical copies also remain in the legacy
root-level `recipes/` folder, which was left untouched.

| Old path | New path |
| --- | --- |
| `public/recipes/instagram_content_catalog_1.csv` | `data/source-materials/recipes/instagram_content_catalog_1.csv` |
| `public/recipes/instagram_latest_70_clean.csv` | `data/source-materials/recipes/instagram_latest_70_clean.csv` |
| `public/recipes/מתכונים 3.docx` | `data/source-materials/recipes/מתכונים 3.docx` |
| `public/recipes/מתכונים 4.docx` | `data/source-materials/recipes/מתכונים 4.docx` |
| `public/recipes/מתכונים 5.docx` | `data/source-materials/recipes/מתכונים 5.docx` |

The nested `recipes/` sub-folder is deliberate: `data/recipes.json` records
provenance as `sourceFiles[].path = "recipes/מתכונים 3.docx"`, relative to the
project root. Placing the files under `data/source-materials/recipes/` keeps
those recorded paths resolvable, relative to `data/source-materials/`.

No `.docx`, `.csv`, `.xlsx` or `.doc` files remain anywhere under `public/`.
No images, game assets or website files were touched.

### Why this was safe

* No file under `app/`, `lib/`, `components/` or `tools/` references a `.docx`
  or `.csv` path.
* The only references are provenance metadata strings inside
  `data/recipes.json` (`sourceFiles[].path`), which are never resolved at
  runtime — they are records of where a recipe's text came from.
* `scripts/rebuild-recipes.ps1` defaults its `-SourceRoot` to `../recipes`
  (the legacy root folder), not `public/recipes`, so the regeneration script is
  unaffected.

## B. Current ID architecture

| Content type | Current data ID | Current route | Favourite / reference format | Risk |
| --- | --- | --- | --- | --- |
| Recipe — reviewed catalog (160) | `recipe.id` in `data/recipes.json`. 126 × `instagram-<sequenceId>`, 33 × raw Hebrew caption strings, 1 × flattened Instagram URL | `/recipes/<id>` — 33 of them percent-encoded | `recipe-<id>` | **High** — the same string is the database key, the URL and the favourite key |
| Recipe — legacy biscuit series (14) | `id` `"01"`–`"14"` in `lib/biscuit-cake-series.ts` | `/recipes/biscuit-cake-<id>` | `biscuit-cake-<id>` | **Medium** — positional numbers, and several duplicate a reviewed catalog record |
| DateIdea (13) | `id` `"01"`–`"13"` in `lib/date-series.ts` | `/dates/<id>` | `date-a-b-<id>` | **Medium** — positional numbers with no stable identity behind them |
| Game (4) | `slug` in `lib/games.ts` (`forest-game`, `race-game`, `memory-game`, `bundle`) | `/games/<slug>` — hard-coded route folders + `content/games/<slug>.html` | none — games are not favouritable today | **Medium** — slug is simultaneously the id, the route and the filename |
| Gift | none — no catalog exists | `/gifts` only, no detail routes | a `gift` tab exists in `FavoritesGrid`, but nothing can produce a `gift-*` token | Low |

Supporting facts:

* `data/recipes.json` holds 266 records; 160 pass the "reviewed" gate
  (`sequenceId` + `COMPLETE` + ingredients + instructions) and get a static
  route; 159 are listed (one is flagged `DUPLICATE_OF_SEQUENCE_146`).
* `recipe.sequenceId` is an integer, unique across all 160 reviewed recipes
  (range 2–200). It is the only stable numeric handle the data already has.
* Every reviewed recipe has a `sourceUrl` with a **unique Instagram shortcode**
  (160/160 unique). This is a genuine immutable natural key.
* `recipe.slug` exists in the data and in `lib/types.ts` but is **never read by
  the application** — `recipe.id` does all the work. For 7 records `id` and
  `slug` disagree (`עו-5`…`עו-12` vs a shared `עו`), so the field is also
  unreliable.
* Favourites live in `localStorage` under the key `rotemFavorites` as a plain
  JSON array of strings (`lib/favorites-context.tsx`).
* `FavoritesGrid` resolves each token against a catalog and **silently drops
  anything it cannot resolve** (`.filter(row => Boolean(row.title))`) — the
  token stays in `localStorage` but disappears from the UI with no error.

### Cross-links between content items

* **Reviewed recipe → legacy biscuit item** (`getCoveredBiscuitIds`), matched
  either by image folder number (`images/biscuit-cakes/11-…` → `"11"`) or, for
  three photo-less items, by **exact title string** via
  `BISCUIT_SERIES_TITLE_MATCH`. Title-keyed, therefore fragile.
* **Series filter chip**: `RECIPE_SERIES_SLUGS` maps the Hebrew string
  `"עוגות ביסקוויטים"` to the filter slug `biscuit-cakes`.
* **Category / difficulty filters**: `categorySlug` and `difficultySlug` feed
  `/recipes?category=…` query links from the homepage carousel.
* **Related strips**: recipe and date detail pages link to siblings by `id`.
* **Search index** (`lib/search-index.ts`) rebuilds every href from the same
  ids, so any id change silently changes every search result URL too.

### The 33 unsuitable recipe IDs

All 33 reviewed recipes whose route id is a raw, run-together
Instagram-caption fragment rather than a real slug. Each already has a clean,
curated `title` — the id simply was never regenerated from it.

| # | sequenceId | Current id (= route segment) | Correct title |
| --- | --- | --- | --- |
| 1 | 130 | `עו-9` | עוגת קינמון עם קראמבל |
| 2 | 131 | `קינוחיכוסותאלפחורסשיוצאיםוואו` | קינוחי כוסות אלפחורס |
| 3 | 133 | `סלמוןעםניוקיוע` | סלמון עם ניוקי ועגבניות שרי ברוטב ירוק |
| 4 | 134 | `השמועהאומרתשבזמןשישמתקפהמאיראןהקלוריותלאנספרותכיחייבלהתנחםבמ` | סופלה בלונדי |
| 5 | 135 | `עו-10` | עוגת גבינה טריקולד מנומרת |
| 6 | 136 | `מוקפץעוףואטריותאודוןעםירקותשיוצאפשוטמושלםfullingredientsmeth` | מוקפץ עוף ואטריות אודון עם ירקות |
| 7 | 137 | `רולדתכדורישוקולדבלונדיעו` | רולדת כדורי שוקולד בלונדי |
| 8 | 139 | `עו-5` | עוגת ביסקוויטים סניקרס |
| 9 | 140 | `בורקסאסאדומושלםלערבשבת` | בורקס אסאדו |
| 10 | 141 | `עו-7` | עוגת קרמבו שוקולד לבן על בסיס ביסקוויטים |
| 11 | 142 | `עו-6` | עוגת שמרים דאבל שוקולד פרווה |
| 12 | 144 | `מתלבטתעודאיךלקרואלמתכוןהזהעו` | עוגיית שוקולד צ'יפס |
| 13 | 146 | `עו-12` | עוגת תפוזים |
| 14 | 147 | `שילבתיאתשניהדבריםשאניהכיאוהבתבעולםעו` | טבלת עוגת ביסקוויטים |
| 15 | 149 | `בורקס` | בורקס גבינה |
| 16 | 151 | `איןיותרמושלםומנחםמאשרלסייםאתהיוםעםקערתפסטהמפנקתתתאזהכנתילכםכ` | פסטה בטטטה |
| 17 | 152 | `ברוכיםהבאיםלסדרתהמתכוניםהחדשהשליאיךלשדר` | עוגת ביסקוויטים פיסטוק ושוקולד לבן |
| 18 | 154 | `ברצינותמישהואיפעםסירבלכםכשהצעתםלוחתיכתבראוניזלאשמעתיעלדברכזה` | בראוניז |
| 19 | 155 | `ברוכיםהבאיםלפרקהשניבסדרהשליאיךלשדר` | עוגת ביסקוויטים קרמבו |
| 20 | 156 | `מתכוןלמ` | מגולגלות נוטלה וקורנפלקס |
| 21 | 157 | `ברוכיםהבאיםלפרקהשלישיבסדרהשליאיךלשדר` | עוגת ביסקוויטים מוקה |
| 22 | 159 | `האניבאטרטוסטלאלהאמיןאיךקינוחבלישוקולדיכוללהיותכלכךטעיםומיוחד` | האני באטר טוסט |
| 23 | 164 | `טבלתשוקולדקרמלוביי` | טבלת שוקולד חלב עם קרמל ובייגלה |
| 24 | 166 | `הפרקהחמישיבסדרהשליאיךלשדר` | עוגת ביסקוויטים לימונענע |
| 25 | 167 | `הפרקהשישיבסדרהשלנואיךלשדר` | עוגת ביסקוויטים בתוך עוגת קרפים |
| 26 | 169 | `עו-11` | עוגיות בראוניז עם מילוי שוקולד לבן |
| 27 | 173 | `שוקופאימצההקינוחהכימושלםשאפשרלהכיןממצהfullpassovermatzahfren` | שוקו פאי מצה |
| 28 | 179 | `הפרקהתשיעיבסדרהשלנואיךלשדר` | כדורי עוגת ביסקוויטים |
| 29 | 182 | `טבלתשוקולדקרםעו` | טבלת שוקולד קרם עוגיות |
| 30 | 185 | `ברוכיםהבאיםלפרקהעשיריבסדרהשליאיךלשדר` | עוגת ביסקוויטים טריפל שוקולד |
| 31 | 188 | `ברוכיםהבאיםלפרק11בסדרהשליאיךלשדר` | עוגת בומב אוראו |
| 32 | 190 | `אמאלהאיךכלכךהרבהשניםלאידעתיכמהטובזהפקאןמסוכרקבלואתהפרקה12בסד` | עוגת ביסקוויטים פקאן מסוכר |
| 33 | 195 | `פרק13בסדרהאיךלשדר` | עוגת ביסקוויטים פירות יער ושוקולד לבן |

A **34th** id is equally unsuitable although it is ASCII and therefore easy to
miss: sequenceId **138**, id
`httpswwwinstagramcomrotemadinireeldl9xtdsoho1` (title: גלידוניות קראנץ׳) — a
flattened Instagram URL used as a route segment.

Note that seven of the 33 (`עו-5`…`עו-12`) are not captions at all but
collision-disambiguation artifacts: the generator truncated the title to `עו`
(the start of "עוגת") and then appended a counter. They carry no meaning
whatsoever.

## C. Recommended future architecture

The principle: **three separate identifiers, each with exactly one job.**

```
content_id  — immutable, opaque, the only thing anything else may point at
slug        — human-readable URL, editable, never a foreign key
legacy_id   — the old identifier, kept only so old data and old URLs resolve
```

### 1. `contentId` — the canonical key

Add an explicit `contentId` string field to every Sanity document type
(`recipe`, `dateIdea`, `game`), generated **once** at import and never edited
afterwards. Format:

```
recipe_01JB2XKQ9F7M3A0YV5C8N4TZQD
date_01JB2XKR2H8P1B6WQ3D7E9SXNM
game_01JB2XKS5J4K2C7RT8F6G0VYPL
```

A type prefix plus a ULID. ULID rather than a bare UUID because it is
lexicographically sortable by creation time, URL-safe, and case-stable.

Deliberately **not** Sanity's own `_id`. Sanity's `_id` is immutable and would
technically work, but making it the key that Supabase stores welds the
favourites database to one CMS vendor and to one dataset — a Sanity dataset
export/import or a future CMS change would then invalidate every saved
favourite. A `contentId` field is CMS-portable and costs nothing.

Protect it: mark the field `readOnly: true` in the schema and add a Sanity
document action that rejects any mutation changing it.

### 2. `slug` — the URL, and only the URL

* Sanity `slug` type, unique within its document type (validated).
* Derived from the curated `title` at import — hyphenated words, not the
  current run-together strings. This is what finally fixes the 33 (+1) bad ids.
* Freely editable by Rotem. **Never** used as a database relationship key,
  never stored in Supabase, never used to match content to content.
* Recommended form: Hebrew, hyphenated (`עוגת-ביסקוויטים-פיסטוק`). It stays
  percent-encoded on the wire, exactly as today, but is readable when pasted
  and decoded, and matches the site's language. A Latin transliteration is the
  alternative if you would rather have ASCII URLs — that is a presentation
  decision, and the architecture below is identical either way.

### 3. `slugHistory` — what makes URL edits safe

```ts
slugHistory: [{ slug: string, retiredAt: datetime }]
```

Appended automatically (Sanity document action, or a webhook on publish) every
time `slug.current` changes. Route resolution order in
`app/recipes/[slug]/page.tsx`:

1. match `slug.current` → render
2. else match an entry in `slugHistory` → **308 permanent redirect** to the
   current slug
3. else match `legacyId` → **308 permanent redirect** to the current slug
4. else 404

Step 3 is what keeps all 174 of today's recipe URLs (including the 33
percent-encoded ones and the 14 `biscuit-cake-NN` ones), all 13 date URLs and
all 4 game URLs alive permanently, without ever having to keep them as the
canonical route.

### 4. `legacyId` and `legacyFavoriteIds` — the migration bridge

```ts
legacyId: string            // today's route id, verbatim
legacyFavoriteIds: string[] // today's localStorage tokens, verbatim
```

`legacyId` examples: `instagram-112`, `עו-9`, `פרק13בסדרהאיךלשדר`,
`biscuit-cake-05`, `01` (date), `forest-game`.

`legacyFavoriteIds` is an **array**, not a single value, and that is the point.
The biscuit-cake series and the reviewed catalog contain the same recipe twice
in several cases — `getCoveredBiscuitIds` already knows which. For example the
recipe titled "עוגת קראנץ׳ נוטלה" is both `recipe-instagram-162` and
`biscuit-cake-04` today. Both tokens must map to the same `contentId`, so a
user who saved the legacy card and a user who saved the catalog record end up
on one canonical item. Modelling this as an array makes that many-to-one
mapping explicit instead of forcing an arbitrary choice.

Also keep, on recipes only:

```ts
instagramShortcode: string  // 'C1_uCrhIj-l' — unique across all 160
sequenceId: number          // unique across all 160
```

Both are immutable natural keys already present in the data. They are not the
primary key, but they are invaluable for verifying the import, de-duplicating,
and reconciling if anything goes wrong. Keep `sourceUrl` too.

### 5. Supabase schema

```sql
create table public.favorites (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  content_type text not null check (content_type in ('recipe','date','game','gift')),
  content_id   text not null,
  created_at   timestamptz not null default now(),
  unique (user_id, content_type, content_id)
);

alter table public.favorites enable row level security;
create policy "own favorites" on public.favorites
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index favorites_user_idx on public.favorites (user_id, created_at desc);
```

No slug. No title. No href. No image. Those all live in Sanity and are joined
at render time by `content_id`. This is the single rule that makes "changing a
recipe URL must not break a saved favourite" structurally true rather than
something to remember.

A second table carries the legacy mapping, populated from Sanity by webhook so
it can never drift:

```sql
create table public.content_aliases (
  legacy_favorite_id text primary key,   -- 'recipe-instagram-112'
  content_type       text not null,
  content_id         text not null,
  updated_at         timestamptz not null default now()
);
```

Read-only to clients (`select` policy for `authenticated`; writes only from the
webhook's service role). Keeping the map in Postgres rather than in the client
bundle means the migration runs server-side, atomically and idempotently, and
can be re-run if it ever fails halfway.

### 6. Applying the same philosophy to all three types

| | Recipe | DateIdea | Game |
| --- | --- | --- | --- |
| `contentId` | `recipe_<ulid>` | `date_<ulid>` | `game_<ulid>` |
| `slug` | from title, editable | from title, editable | from title, editable |
| `legacyId` | `instagram-112` / `עו-9` / `biscuit-cake-05` | `01`–`13` | `forest-game` |
| `legacyFavoriteIds` | `recipe-<id>`, `biscuit-cake-<id>` | `date-a-b-<id>` | *(none yet)* |
| natural key kept | `instagramShortcode`, `sequenceId` | series position | product SKU |

Games have no favourites today, so their `legacyFavoriteIds` starts empty — but
they get a `contentId` from day one, so making games favouritable later is a
schema-free change. The same holds for gifts once that catalog exists.

Two rules to state explicitly in the schema review, because both are violated
by the current code:

* **Titles are never IDs.** `BISCUIT_SERIES_TITLE_MATCH` and
  `RECIPE_SERIES_SLUGS` both key off exact Hebrew title/series strings today.
  In Sanity these become real references (`series` → a `series` document by
  `contentId`, `coveredBy` → a `recipe` document by `contentId`), so a typo fix
  in a title can no longer break a relationship.
* **Slugs are never foreign keys.** Games currently use their slug as route,
  id, CSS hook and HTML filename simultaneously; splitting `contentId` from
  `slug` is what lets a game be renamed later.

## D. Migration implications for existing `rotemFavorites`

Existing entries are migratable with no guessing, because every token in
circulation is mechanically derivable from data that still exists.

**Step 0 — change nothing now.** Keep the `rotemFavorites` key and its exact
token format while Sanity and Supabase are being built. The current site keeps
working untouched.

**Step 1 — build the alias table during content import.** For each imported
document, emit its `legacyFavoriteIds` and write one `content_aliases` row per
token:

| legacy token | source | count |
| --- | --- | --- |
| `recipe-<id>` | the 160 reviewed catalog records | 160 |
| `biscuit-cake-<id>` | `lib/biscuit-cake-series.ts`, ids `01`–`14` | 14 |
| `date-a-b-<id>` | `lib/date-series.ts`, ids `01`–`13` | 13 |

187 rows, all derived, none invented. Where a biscuit token and a recipe token
refer to the same dish, both rows carry the **same** `content_id` (use the
existing `getCoveredBiscuitIds` logic — image-folder number first, then the
three explicit title matches — as the import-time input, and record the result
as data so the fuzzy matching never has to run again).

**Step 2 — migrate on first authenticated load.** Client reads `rotemFavorites`
and posts the raw array to a server action:

```
POST /api/favorites/migrate  { tokens: string[] }
→ select content_type, content_id from content_aliases
     where legacy_favorite_id = any($1)
→ insert into favorites (user_id, content_type, content_id)
     select ... on conflict (user_id, content_type, content_id) do nothing
→ return { migrated, alreadyPresent, unresolved: string[] }
```

`on conflict do nothing` makes it idempotent and makes merging a second
device's local favourites into an existing account safe.

**Step 3 — never drop an unresolved token silently.** Any token with no alias
row is returned in `unresolved` and persisted (a `unmigrated_favorite_tokens`
table, or a jsonb column on the user's profile) rather than discarded. This is
the one behaviour that must change from today: `FavoritesGrid` currently
filters unresolvable tokens out of the display with no trace.

**Step 4 — mark, don't delete.** On success write
`rotemFavoritesMigratedAt` to `localStorage` and **leave `rotemFavorites` in
place**. A partial or failed run can then be retried, and a user who signs out
still has their local list.

**Step 5 — anonymous users keep the local path.** `localStorage` becomes the
signed-out fallback and an offline cache in front of Supabase, not a second
source of truth. `lib/favorites-context.tsx` is already the single place that
touches storage, so this is one file's worth of change.

**What must be true before step 2 runs:** every one of the 187 tokens resolves
to exactly one `content_id`. That is a testable assertion — assert it in CI
against the alias table before the migration endpoint is ever enabled.

## E. Verification

Run after the `public/` move, on an otherwise clean tree:

| Command | Result |
| --- | --- |
| `npm run lint` | Pass — no errors, no warnings |
| `npx tsc --noEmit` | Pass — exit 0, no diagnostics |
| `npm run build` | Pass — 211 static pages generated, including 174 `/recipes/[id]` and 13 `/dates/[id]` paths |

No route changed, no id changed, no favourites behaviour changed.
