/**
 * Pure text/date helpers for recipe presentation.
 *
 * Extracted verbatim from lib/recipes.ts so that components and the Sanity
 * data layer can use them without importing that module, which is marked
 * `server-only` and reads data/recipes.json off disk at import time.
 * lib/recipes.ts re-exports everything here, so it keeps working unchanged as
 * the fallback/reference implementation.
 */

/** Source dates are DD/MM/YYYY. Anything unparseable sorts to the very end
 * (oldest) rather than breaking the newest-first order of everything else. */
export function parseIsraeliDate(value: string | undefined | null): number | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec((value || "").trim());
  if (!match) return null;
  return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1])).getTime();
}

/* ------------------------------------------------------------------ shared */

/**
 * The imported captions mix three apostrophe/quote conventions (׳ ״, ’ ”, ' ")
 * and four dash characters. Normalising first means every pattern below can be
 * written once instead of once per variant.
 */
function normalize(line: string | null | undefined): string {
  return (line || "")
    .replace(/[׳‘’ʼ]/g, "'")
    .replace(/[״“”]/g, '"')
    .replace(/[–—−]/g, "-")
    .replace(/[‎‏⁦-⁩]/g, "") // stray bidi marks
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * A unit or amount word. A line carrying one is naming a quantity of
 * something, which makes it an ingredient rather than a section label —
 * this is what keeps "ליטר מים" and "כף רוטב סויה" out of the heading rules.
 */
const MEASURE_WORD =
  /(?:^|[\s(])(?:כוסות|כוס|כפות|כפיות|כפית|כף|גרם|גר'|ק"ג|קילו|מ"ל|מיליליטר|ליטר|קורט|חבילות|חבילה|חבילת|שקיות|שקית|קופסה|קופסת|צלוחית|גביע|מיכלים|מיכל|פרוסות|פרוסה|יחידות|יחידה|שיני|שן|טבלת|טבלה|חצי|רבע|שליש)(?:[\s)]|$)/u;

/** A line that opens with an amount — "250 גרם…", "½ כפית…", "חצי כוס…". */
const QUANTITY_START = /^(?:\d|[½¼¾⅓⅔⅛]|(?:חצי|רבע|שליש|כוס|כף|כפית|קורט|שקית|חבילת|קופסת|גביע|מיכל|טבלת)\s)/u;

/**
 * Real foods and adverbials that begin with ל, so the "ל + component" rule
 * below does not read them as "for the …". Kept deliberately short: it only
 * needs the words that actually open an ingredient line.
 */
const LAMED_NOT_A_LABEL =
  /^(?:לימונים|לימון|ליים|לבנה|לבן|לחמניות|לחמנייה|לחם|ליטר|לפתן|לפת|לביבות|לביבה|לשון|לפי|לרוב)(?:\s|$)/u;

/**
 * Component nouns that can head a sub-list on their own, with no ל and no
 * colon — "מילוי", "קרם", "גנאש שוקולד מריר". Matched only under the extra
 * positional guards in classifyIngredientLines(), because the same words also
 * open perfectly ordinary ingredients ("רוטב פיצה", "בצק עלים").
 */
const SECTION_NOUN =
  /^(?:מילוי|מלית|קרם|קרמים|גנאש|גנאשים|בצק|ציפוי|רוטב|תחתית|בסיס|קישוט|סירופ|קרמל|קראמבל|פרלין|בלילה|קצפת|תערובת|פירורים)(?:\s|$)/u;

/**
 * Whether the line carries its own content after a leading label, as in
 * "לקישוט - פיסטוק גרוס" or "אופציונלי- מלח גס". Those are ingredients that
 * happen to name their purpose first, not headings.
 *
 * A dash at the very end is the opposite signal — "לבצק-" is exactly how
 * several imported recipes mark a section — so it is stripped before asking.
 */
function hasContentAfterDash(text: string): boolean {
  const withoutTrailingDash = text.replace(/\s*-\s*$/, "");
  const dash = withoutTrailingDash.indexOf("-");
  return dash !== -1 && withoutTrailingDash.slice(dash + 1).trim().length > 0;
}

/* ------------------------------------------------------------- ingredients */

export type IngredientLineKind = "heading" | "item";
export interface ClassifiedIngredientLine {
  text: string;
  kind: IngredientLineKind;
}

/**
 * A source line that is really a sub-heading for the ingredients that follow
 * it ("לרוטב טחינה ביתי:", "מצרכים לקרמל", "להרכבה") rather than an
 * ingredient in its own right.
 *
 * This is the context-free half of the rules; classifyIngredientLines() adds
 * the ones that need to see the neighbouring lines. It replaces an earlier
 * fixed whitelist of section words, which missed every label outside the list
 * — "להרכבה", "לקרפים", "לקרמל בוטנים" and two dozen more all rendered as
 * tickable ingredients.
 */
export function isIngredientHeading(line: string): boolean {
  const text = normalize(line);
  if (!text) return false;

  // Explicit markers, and the only ones allowed to apply to a line carrying
  // digits ("ערכים לחתיכה:", "מצרכים ל-2 כוסות:"). The question mark is here
  // because every "?"-terminated ingredient line in the data is one of these
  // openers — "מה נצטרך?", "מה תצטרכו?" — never an ingredient.
  if (/[:?]+$/.test(text)) return true;
  if (/^מצרכים(\s|$)/.test(text)) return true;

  // Past this point a label must look like a label: no amounts, and short.
  if (/\d/.test(text)) return false;
  if (MEASURE_WORD.test(text)) return false;
  if (hasContentAfterDash(text)) return false;

  const label = text.replace(/\s*-\s*$/, "");
  if (label.length > 34 || label.split(" ").length > 4) return false;

  // "ל…" = "for the …": the workhorse pattern in these imported recipes.
  return /^ל/.test(label) && !LAMED_NOT_A_LABEL.test(label);
}

/**
 * Splits an ingredient list into section headings and tickable items.
 *
 * Two rules here need the neighbours rather than just the line:
 *
 *  - A heading must have something under it. A label-shaped final line is far
 *    more likely to be a loose ingredient ("תוספות שאוהבים") than a heading
 *    for nothing, so the last line is never promoted.
 *  - A bare component noun ("מילוי", "גנאש שוקולד לבן") only counts as a
 *    heading when the next line opens with an amount. That is what separates
 *    them from ingredients built on the same nouns — "רוטב פיצה" is followed
 *    by "גבינה צהובה…", never by "100 גרם…".
 */
export function classifyIngredientLines(lines: string[]): ClassifiedIngredientLine[] {
  const texts = (lines || []).map((line) => (line || "").trim());

  return texts.map((text, index) => {
    if (!text) return { text, kind: "item" as const };

    const normalized = normalize(text);
    const explicit = /[:?]+$/.test(normalized) || /^מצרכים(\s|$)/.test(normalized);

    // A label with nothing beneath it heads nothing. Colon-marked labels are
    // exempt: the author typed the colon, so the intent is not in doubt.
    const isLast = texts.slice(index + 1).every((rest) => !rest);
    if (isLast && !explicit) return { text, kind: "item" as const };

    if (isIngredientHeading(text)) return { text, kind: "heading" as const };

    const next = normalize(texts.slice(index + 1).find((rest) => rest) || "");
    // The trailing dash some recipes use as the label marker ("מלית-") has to
    // come off before matching the noun, exactly as it does for the ל rule.
    const label = normalized.replace(/\s*-\s*$/, "");
    const bareNoun =
      SECTION_NOUN.test(label) &&
      !/\d/.test(label) &&
      !MEASURE_WORD.test(label) &&
      !hasContentAfterDash(normalized) &&
      label.split(" ").length <= 4 &&
      QUANTITY_START.test(next);

    return { text, kind: bareNoun ? ("heading" as const) : ("item" as const) };
  });
}

/* ------------------------------------------------------------ instructions */

/** Source instructions are sometimes already numbered ("1.\t...") from the
 * original document, and the template also numbers each step — producing a
 * visible double number. Strip the prefix only when it matches this step's
 * own position. */
export function stripRedundantStepNumber(text: string, stepNumber: number): string {
  const match = /^\s*(\d+)[.)]\s*/.exec(text || "");
  if (match && Number(match[1]) === stepNumber) return text.slice(match[0].length);
  return text;
}

export type InstructionLineKind = "step" | "heading" | "nutrition" | "nutrition-heading" | "note";

/**
 * A nutrition line. The unit between the number and the nutrient is what the
 * previous pattern missed: it required "32.6 חלבון" and so let every real
 * "32.6 גרם חלבון" through into the numbered cooking steps.
 *
 * The nutrient noun itself stays mandatory, which is what keeps the genuine
 * "160 גרם שקדים טחונים" (an ingredient line that lives inside חלת שקדים's
 * instructions) out of this branch.
 */
const NUTRITION_LINE =
  /^(?:ערכים(?:\s+תזונתיים)?|קלוריות|חלבון|שומן|פחמימ)|^\d+(?:[.,]\d+)?\s*(?:גרם|גר'|ג'|מ"ג|מ"ל)?\s*(?:קלור|חלבו|שומן|פחמימ)/u;

/** Preserve every imported instruction line, but keep section labels,
 * nutritional values and closing notes out of the numbered cooking flow. */
export function getInstructionLineKind(line: string): InstructionLineKind {
  const text = normalize(line);
  if (!text) return "step";

  if (NUTRITION_LINE.test(text)) {
    // A nutrition line ending in a colon introduces a block of values rather
    // than being one ("ערכים לכל הכמות עם סוכר:"). Recipes that publish two
    // sets of values need that label to read differently from the numbers
    // under it, or the two blocks look like duplicated data.
    return /:$/.test(text) ? "nutrition-heading" : "nutrition";
  }
  if (/^(?:ובת?אבון|בתי?אבון|שימו לב)/.test(text)) return "note";

  // A short line ending in a colon — or in the dash some recipes use instead —
  // introduces the lines beneath it ("אופן הכנת הבצק:", "בצק-"). The length
  // cap keeps a genuine instruction that happens to end in a colon numbered.
  if (/:$/.test(text) && text.length <= 45) return "heading";
  if (/-$/.test(text) && text.length <= 30 && !/[.!?]/.test(text)) return "heading";

  return "step";
}

export interface ClassifiedInstructionLine {
  text: string;
  kind: InstructionLineKind;
  /** 1-based position in the cooking flow; null for anything but a step. */
  stepNumber: number | null;
  /** The text to print, with a redundant source number already stripped. */
  display: string;
}

/**
 * Classifies a whole instruction list and numbers only the actual steps.
 *
 * Numbering belongs here rather than in the component: it is a property of the
 * list, and doing it per line meant re-scanning the prefix for every entry.
 */
export function classifyInstructionLines(lines: string[]): ClassifiedInstructionLine[] {
  let step = 0;
  return (lines || []).map((line) => {
    const text = (line || "").trim();
    const kind = getInstructionLineKind(text);
    if (kind !== "step") return { text, kind, stepNumber: null, display: text };
    step += 1;
    return { text, kind, stepNumber: step, display: stripRedundantStepNumber(text, step) };
  });
}

/** Image paths are stored relative to the project root (e.g.
 * "images/recipes/…"); Next.js needs a leading "/" to serve them from
 * /public. */
export function toPublicPath(path: string | null | undefined): string | null {
  if (!path) return null;
  return path.startsWith("/") ? path : `/${path}`;
}
