# Content migration data

Working files for moving the site's content into Sanity (and, later, its
favourites into Supabase). None of this is served publicly and none of it is
read by the running website — the site still reads `data/recipes.json` and
`lib/*.ts` exactly as it did before.

## `content-manifest.json` — do not regenerate casually, do not hand-edit

The permanent record of **canonical identity**. It assigns one immutable
`contentId` to every real piece of content the site has, and lists every legacy
identifier that must keep resolving to it.

This file is the reason a recipe's URL can change later without breaking a
saved favourite. Supabase will store `contentId` values; Sanity documents use
`contentId` as their document id; the site's future route resolver falls back
to `legacyRouteIds`. If this file were regenerated with fresh ids, every one of
those links would break at once.

Rules:

- **It is committed to git.** That is what makes the ids permanent.
- **Never edit a `contentId` by hand.** Nothing else in the system can repair it.
- Re-running the builder is safe: an existing item is matched by its
  `naturalKey` and keeps the id it already has. The builder refuses to write if
  it would change or drop an id that already exists.
- New content added to `data/recipes.json` or `lib/*.ts` gets a new id the next
  time the builder runs. That is the intended way to grow the manifest.

Identifier roles, as agreed in `reports/id-architecture-audit-2026-09-07.md`:

| Field | Mutable? | Purpose |
| --- | --- | --- |
| `contentId` | never | canonical key; the only id Supabase may store |
| `slug` | freely | human-readable URL; never a relationship key |
| `legacyIds` | never | exact `rotemFavorites` localStorage tokens |
| `legacyRouteIds` | never | current URL segments, for permanent redirects |
| `naturalKey` | never | how the builder re-finds an item so ids stay stable |

### Slugs

Canonical slugs are **Hebrew, generated from the curated title** by
[`sanity/lib/slugify.ts`](../../sanity/lib/slugify.ts) — `חומוס ירוק` becomes
`חומוס-ירוק`. That one module is shared by the manifest builder and by the
Studio's "Generate" button so the two can never disagree.

Two rules follow from that and are enforced by
`scripts/verify-sanity-import.ts`:

- **An image-folder name is never a slug.** The English folders under
  `images/recipes/**` are a storage location. They are recorded on a recipe as
  `imageFolderSlug` / `legacyImageFolder` where the data already establishes
  the link, and they have no influence on any URL.
- **A title edit does not move the slug.** The initial slug is derived once.
  Afterwards the slug only changes when an editor changes it deliberately, and
  publishing that change appends the previous slug to `slugHistory` (see
  [`sanity/actions/publishWithSlugHistory.tsx`](../../sanity/actions/publishWithSlugHistory.tsx))
  so the old URL keeps resolving.

The four games keep their existing English slugs, because those are also their
route folders and landing-page filenames today.

### Series

There is **no biscuit-cake content type**. Every biscuit cake is an ordinary
Recipe document carrying `series = "עוגות ביסקוויטים"` and a `seriesPosition`.
14 recipes are in the series, one per position 1–14: 13 merged with a catalog
record, and 1 (episode 07) imported from the legacy series source alone because
no catalog record covers it.

### Holidays

`holidays` is a **fourth, independent axis** on a recipe, alongside
`siteCategory`, `foodType` and `series`. It changes none of them and is not
derived from them. A recipe carries zero, one or several holidays; most carry
none.

It exists for one purpose: the planned **חגים** section, where each holiday is a
circular filter and clicking it lists every recipe whose `holidays` array
contains that value. It is discovery metadata, **not a label** — nothing is
meant to render it as a badge on a recipe card. No frontend for it exists yet;
only the data model does.

The design that follows from "adding a holiday later must not cost a migration":

- The field is a plain `array of string` — no `holiday` reference, no holiday
  document type, no join table. A recipe in three holidays is three strings.
- The vocabulary is a single array,
  [`RECIPE_HOLIDAYS`](../../sanity/schemaTypes/taxonomy.ts). Appending to it
  makes a new tickbox appear in the Studio and changes no stored data. The
  Studio renders the vocabulary as a checklist (`options.list` +
  `layout: "grid"`), so nothing outside it can be entered.
- Stored values are stable English slugs (`pesach`, `shavuot`, …); the Hebrew
  titles are display labels only, held in `RECIPE_HOLIDAY_TITLES`. Rewording a
  label, or respelling `ראש השנה`, therefore touches no document — and the slug
  is what a future `/recipes?holiday=…` URL can carry.
- Holidays are pure editorial metadata: changing them never touches
  `contentId`, `slug` or `slugHistory`, so re-tagging a recipe cannot break a
  link or a saved favourite.
- `holidays` is a **seed-only field** in the importer. It is written when a
  document is created and never again — not even under `--update-existing` —
  so refreshing content from the local sources cannot wipe Rotem's Studio work.

Queries live in [`sanity/lib/queries.ts`](../../sanity/lib/queries.ts):
`recipesByHolidayQuery`, `holidayUsageQuery` and
`recipesWithoutHolidaysQuery`. None of them names a holiday value, which is why
a sixth holiday needs no query change either.

#### What was migrated, and what was not

`data/recipes.json` has no holiday field, so the values come from the Instagram
captions in `data/source-materials/recipes/`, recorded as
`HOLIDAY_ASSIGNMENTS` in `scripts/migration-source.ts` — the same
recorded-decision pattern as `corrections`, and for the same reason: the site's
own data files are never edited by this process.

The bar for an assignment is narrow on purpose, because a wrong holiday is
worse than a missing one: **the caption has to name the holiday and tie this
recipe to it.** 13 documents clear it — 12 catalog recipes, plus biscuit-series
item 07, whose own hand-authored title is `פירמידת ביסקוויטים כשרה לפסח` and
which is recorded separately in `BISCUIT_HOLIDAY_ASSIGNMENTS` because it has no
catalog record and therefore no `sequenceId`. A holiday-associated
dish (cheesecake, doughnuts, hamantaschen), a holiday custom named without the
holiday (`משלוח מנות`, `הדלקת נרות`), a bare `חג שמח` sign-off, or a publish
date that lands near a festival are all *not* enough — those 16 recipes import
with an empty `holidays` and are listed as `HOLIDAY_REVIEW_CANDIDATES` so Rotem
gets a worklist instead of a guess.

One entry there is a trap worth keeping: recipe #55 `חלת שקדים` says
`בשבועות האחרונים`, which means "in recent weeks" and has nothing to do with
Shavuot. It is recorded as a rejected match so a future keyword sweep does not
re-add it.

Captions were joined to catalog rows by **Instagram shortcode**. The CSVs' own
`sequence_id` column does not line up with `data/recipes.json`'s `sequenceId`
and must not be used for this.

`scripts/verify-sanity-import.ts` enforces the result: every stored value is in
the vocabulary, no duplicates within a recipe, and every recorded assignment
reached a document. The `holidays` block of `verification-report.json` carries
the per-holiday counts and the review worklist.

### Corrections

`corrections` holds decisions a person made that the source data does not
express — applied here rather than by editing `data/recipes.json`, which this
process never touches. Each entry names who decided it and why.

The one entry today merges catalog row 190 with legacy series item 12: they are
the same cake, the series title `עוגת ביסקוויטים פקאן סיני` is canonical, and it
is episode 12. The row's own wording is preserved in `alternateTitles`, and its
Instagram URL, shortcode, sequence number, ingredients and instructions all
carry over — the series item contributed the photo and the title.

### Merges

Two kinds of merge are recorded in `mergeDecisions`, and both exist because the
same real recipe currently lives under more than one legacy identity:

- **`BISCUIT_SERIES_MERGED_INTO_CATALOG_RECIPE`** — a legacy biscuit-cake card
  that is the same dish as a reviewed catalog record. Twelve of the fourteen.
  Derived from the matching the site already does in `getCoveredBiscuitIds()`.
- **`DUPLICATE_INSTAGRAM_POST_ABSORBED`** — two Instagram posts of the same
  dish. The record `data/recipes.json` already flags as the duplicate is
  absorbed into its counterpart; the absorbed post's URL survives in
  `alternateSourceUrls` and its review issues are folded into the survivor.

When an item is absorbed, any `contentId` a previous manifest had minted for it
is kept in the survivor's `retiredContentIds`, so a Supabase row written against
the old id can still be resolved. The builder's "refusing to drop an id" guard
allows a disappearance only when it is recorded this way.

## Generated artifacts

`import-plan.json` and `verification-report.json` are regenerable outputs, kept
so the state of a migration run is reviewable without re-running anything.
Deleting them loses nothing.

## Commands

```bash
npm run migration:manifest        # build or update the manifest
npm run migration:manifest:check  # verify no contentId would change (CI-friendly)
npm run migration:import:dry      # build every Sanity document locally, write import-plan.json
npm run migration:verify:offline  # check the plan against the live site data
npm run migration:import          # write to Sanity (needs .env.local credentials)
npm run migration:verify          # check the real Sanity dataset against the site data
```

`migration:import` only creates documents that do not exist yet and repairs the
read-only identity fields. Pass `--update-existing` to also refresh editorial
content from the local sources — that one overwrites editor changes, so it is
never the default.
