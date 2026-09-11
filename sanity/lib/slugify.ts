/**
 * The single definition of how a canonical slug is derived from a title.
 *
 * Shared deliberately between three places that must never disagree:
 *   - data/migration/content-manifest.json (built by scripts/)
 *   - the Sanity Studio's "Generate" button on every slug field
 *   - any future check that verifies a slug still matches its title
 *
 * Slugs are Hebrew, generated from the curated title:
 *   "חומוס ירוק"            -> "חומוס-ירוק"
 *   "עוגת ביסקוויטים פיסטוק" -> "עוגת-ביסקוויטים-פיסטוק"
 *
 * Hebrew rather than a transliteration, because transliterating would mean
 * translating each title into English — a judgement call this project does not
 * make on Rotem's content. The English folder names under images/recipes/**
 * are a storage detail and never determine a URL.
 *
 * This module has no imports so that Node can execute it directly from the
 * migration scripts and the Studio can bundle it unchanged.
 */

/** Maximum slug length. Long enough for the longest curated title, short
 * enough that a percent-encoded URL stays manageable. */
const MAX_LENGTH = 80;

export function slugifyTitle(title: string): string {
  const cleaned = (title || "")
    // Bidi control marks: invisible, but they would survive into the URL.
    .replace(/[‎‏‪-‮⁦-⁩]/g, "")
    // Hebrew geresh/gershayim and quote marks are dropped rather than turned
    // into separators, so "קראנץ׳" stays one word.
    .replace(/[׳״'’‘"]/g, "")
    // Everything that is not a letter or a digit becomes a word separator.
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");

  if (cleaned.length <= MAX_LENGTH) return cleaned;
  // Cut at a word boundary so a slug never ends mid-word.
  const trimmed = cleaned.slice(0, MAX_LENGTH);
  const lastSeparator = trimmed.lastIndexOf("-");
  return lastSeparator > 20 ? trimmed.slice(0, lastSeparator) : trimmed;
}

/** Sanity's slug field calls its slugify with (input, schemaType, context). */
export const sanitySlugify = (input: string): string => slugifyTitle(input);
