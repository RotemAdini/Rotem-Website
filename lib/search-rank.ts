import type { SearchResult, SearchResultType } from "./types";

/**
 * Relevance ranking for the site search.
 *
 * The previous behaviour was a plain `search.includes(term)` over an index
 * built by concatenating dates, then games, then recipes — so results always
 * came out clustered by type, with every date idea ahead of every recipe no
 * matter what was typed.
 *
 * Kept free of React so the rules can be reasoned about (and tested) on their
 * own.
 */

/** Where a query token was found, best first. */
const WEIGHT = {
  titleExact: 120,
  titlePrefix: 90,
  titleWord: 70,
  titleAny: 50,
  metaWord: 30,
  keywordWord: 18,
  keywordAny: 10,
} as const;

/** Ties break in this order so a mixed-score page still reads sensibly. */
const TYPE_ORDER: Record<SearchResultType, number> = { recipe: 0, date: 1, game: 2, gift: 3 };

/**
 * Words that negate what follows them. Compared whole-word, never as a
 * substring: "בלינצ׳ס" opens with the same three letters as "בלי" and is not a
 * negation of anything.
 */
const NEGATION_WORDS = new Set(["בלי", "ללא", "בלא", "וללא", "ובלי"]);

/** A negation stops here — what follows belongs to a new clause.
 * "עוגה בלי גלוטן עם שמנת מתוקה" does contain sweet cream. */
const NEGATION_STOPPERS = new Set(["עם", "ועם", "בתוספת", "אבל"]);

/** How many words after a negation it is taken to cover. Two is the common
 * case ("בלי שמנת מתוקה"); three leaves room for a qualifier. */
const NEGATION_SCOPE = 3;

export function hasNegationWord(tokens: string[]): boolean {
  return tokens.some((token) => NEGATION_WORDS.has(token));
}

/**
 * The part of a title or meta line that the recipe actually claims to be or
 * contain, with any negated run removed.
 *
 * "עוגת גבינה פירורים בלי שמנת מתוקה" is the worst possible answer to a search
 * for שמנת מתוקה — it is the one cheesecake that deliberately has none — yet a
 * plain title match ranked it first. Dropping the negated run means the title
 * no longer answers for those words; the recipe can still surface on its real
 * ingredients, which is where a genuine match belongs.
 */
export function stripNegatedRuns(text: string): string {
  const words = text.split(" ").filter(Boolean);
  const kept: string[] = [];

  for (let i = 0; i < words.length; i += 1) {
    if (!NEGATION_WORDS.has(words[i])) {
      kept.push(words[i]);
      continue;
    }
    // Skip the negation word itself and the run it governs.
    let skipped = 0;
    while (skipped < NEGATION_SCOPE && i + 1 < words.length && !NEGATION_STOPPERS.has(words[i + 1])) {
      i += 1;
      skipped += 1;
    }
  }

  return kept.join(" ");
}

export function normalizeQuery(value: string): string {
  return (value || "")
    .toLowerCase()
    .replace(/[׳‘’]/g, "'")
    .replace(/[״“”]/g, '"')
    .replace(/[‎‏⁦-⁩]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function queryTokens(value: string): string[] {
  const normalized = normalizeQuery(value);
  return normalized ? normalized.split(" ").filter(Boolean) : [];
}

/** True when `token` starts a word inside `text`. Hebrew has no casing and the
 * common prefixes (ו־, ב־, ל־) are single letters, so a plain boundary test on
 * whitespace and punctuation is enough here. */
function hasWordStart(text: string, token: string): boolean {
  let from = 0;
  for (;;) {
    const at = text.indexOf(token, from);
    if (at === -1) return false;
    if (at === 0 || /[\s(),.\-־/|"']/.test(text[at - 1])) return true;
    from = at + 1;
  }
}

/**
 * How well one result answers one query. Zero means "does not answer it":
 * every token has to appear somewhere, so adding a word narrows the results
 * rather than widening them.
 */
/**
 * The minimum an item needs to be ranked. SearchResult satisfies it
 * structurally, and so does a recipe board card — which is how /recipes and
 * /search share one scoring engine instead of drifting apart.
 */
export interface Rankable {
  title: string;
  meta: string;
  keywords?: string;
}

export function scoreResult(item: Rankable, tokens: string[], respectNegation = true): number {
  if (!tokens.length) return 0;

  // Only title and meta are de-negated. Keywords carry the ingredient list and
  // the deliberate "ללא אפייה" trait, where "ללא" is the thing being described
  // rather than a denial of it.
  const title = respectNegation ? stripNegatedRuns(normalizeQuery(item.title)) : normalizeQuery(item.title);
  const meta = respectNegation ? stripNegatedRuns(normalizeQuery(item.meta)) : normalizeQuery(item.meta);
  const keywords = normalizeQuery(item.keywords || "");

  let total = 0;
  for (const token of tokens) {
    let best = 0;
    if (title === token) best = WEIGHT.titleExact;
    else if (title.startsWith(token)) best = WEIGHT.titlePrefix;
    else if (hasWordStart(title, token)) best = WEIGHT.titleWord;
    else if (title.includes(token)) best = WEIGHT.titleAny;
    else if (hasWordStart(meta, token)) best = WEIGHT.metaWord;
    else if (meta.includes(token)) best = WEIGHT.metaWord;
    else if (hasWordStart(keywords, token)) best = WEIGHT.keywordWord;
    else if (keywords.includes(token)) best = WEIGHT.keywordAny;

    if (best === 0) return 0; // a token nothing matched — this item is out
    total += best;
  }

  // A short title that matched is a better answer than a long one that merely
  // contains the words, so nudge by brevity without letting it swamp the
  // field weights.
  return total + Math.max(0, 12 - Math.floor(title.length / 8));
}

/**
 * Scores a list of rankable items against a query, dropping non-matches and
 * ordering best-first. Used on its own by the recipes board, which keeps its
 * own tie-breaking (the board's sort control), and by rankResults below.
 */
export function rankBy<T extends Rankable>(items: T[], query: string): T[] {
  const tokens = queryTokens(query);
  if (!tokens.length) return items;

  const respectNegation = !hasNegationWord(tokens);
  return items
    .map((item) => ({ item, score: scoreResult(item, tokens, respectNegation) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((row) => row.item);
}

/** The ranked answer to a query. An empty query returns nothing on purpose —
 * the page shows suggestions instead of dumping the whole catalogue. */
export function rankResults(index: SearchResult[], query: string): SearchResult[] {
  const tokens = queryTokens(query);
  if (!tokens.length) return [];

  // When the reader types the negation themselves — "ללא אפייה", "בלי גלוטן" —
  // they are asking for the negated thing, so the titles keep their negated
  // runs and match in full.
  const respectNegation = !hasNegationWord(tokens);

  const scored: { item: SearchResult; score: number }[] = [];
  for (const item of index) {
    const score = scoreResult(item, tokens, respectNegation);
    if (score > 0) scored.push({ item, score });
  }

  return scored
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const byType = TYPE_ORDER[a.item.type] - TYPE_ORDER[b.item.type];
      if (byType !== 0) return byType;
      return a.item.title.localeCompare(b.item.title, "he");
    })
    .map((row) => row.item);
}
