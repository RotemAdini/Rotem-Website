/**
 * The 18 stations.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ CONTENT                                                                 │
 * │                                                                         │
 * │ All Hebrew is transcribed verbatim from the PDF via PAGE_BY_PAGE_SPEC,  │
 * │ including its original spacing and typos. Long PDF paragraphs are split │
 * │ across steps so nothing ever needs scrolling — the words themselves are │
 * │ untouched.                                                              │
 * │                                                                         │
 * │ ONE deliberate edit: station 16's "לקראת השנה החדשה" became             │
 * │ "לקראת הימים הבאים", because the game is evergreen rather than a        │
 * │ New Year product.                                                       │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Presentation rules applied per station (V1_SCREEN_MAP.md §6):
 *   • A visible speaker gets a speech bubble; a place or a mood gets a panel.
 *   • The bubble sits OPPOSITE its tail, so it never covers the speaker:
 *       tail 'bottom-*' → bubble rides high   (speaker sits low in frame)
 *       tail 'top-*'    → bubble sits low     (speaker sits high in frame)
 */

import type { Station, StationCompletion, StationStep, TextBlock } from '../types/content.ts';
import { mapHotspotFor } from './mapLayout.ts';

/** Approved wording — see V1_ARCHITECTURE.md §6 (decisions B1/B2). */
export const STATION_COMPLETION: StationCompletion = {
  label: 'סיימנו ✓',
  revisitLabel: 'חזרה למפה',
  requiresAllSteps: true,
};

type Tail = 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end';

let blockSeq = 0;
const t = (text: string): TextBlock => ({ id: `b${(blockSeq += 1)}`, text });

/** A character in the artwork speaking. */
const say = (id: string, tail: Tail, blocks: TextBlock[], ctaLabel?: string): StationStep => ({
  kind: 'brief',
  id,
  presentation: 'bubble',
  tail,
  blocks,
  ...(ctaLabel ? { ctaLabel } : {}),
});

/** Narration, or a place rather than a face. */
const panel = (
  id: string,
  blocks: TextBlock[],
  opts: { tone?: 'default' | 'olive'; ctaLabel?: string } = {},
): StationStep => ({
  kind: 'brief',
  id,
  blocks,
  panel: { anchor: 'bottom', ...(opts.tone ? { tone: opts.tone } : {}) },
  ...(opts.ctaLabel ? { ctaLabel: opts.ctaLabel } : {}),
});

/**
 * One question of the gnome's rapid-fire round.
 *
 * Every question but the last carries 'השאלה הבאה', so the control under the
 * couple's thumb names what it does and the round reads as a run rather than as
 * ten separate screens. The last one hands over to his verdict instead.
 */
const quickfire = (
  id: string,
  index: number,
  total: number,
  question: string,
): StationStep => ({
  kind: 'quickfire',
  id,
  index,
  total,
  prompt: [t(question)],
  ...(index < total ? { ctaLabel: 'השאלה הבאה' } : { ctaLabel: 'המשך' }),
});

/**
 * The ten questions, in the order they are asked.
 *
 * Sequenced rather than listed. It opens on dates — the safest thing in the set,
 * and the one most likely to get a laugh before anyone is invested. The question
 * about who repairs a fight sits at 4, early enough that the round is still
 * light when it lands. The last one is the only question with any heat in it,
 * and it is last on purpose: the station ends on a ten-second kiss, and this is
 * what walks them towards it.
 */
const QUICKFIRE: readonly string[] = [
  'מי יותר יוזם דייטים?',
  'מי נרדם ראשון בדרך כלל?',
  'מי צריך יותר חיבוקים?',
  'מי בדרך כלל עושה את הצעד הראשון אחרי ריב?',
  'מי יותר ספונטני?',
  'מי יותר אוהב לפנק את השני?',
  'מי יותר קנאי?',
  'מי יותר מצחיק?',
  'מי יותר רומנטי?',
  'מי יותר סביר להציע משהו קצת שובב? 😏',
];

interface StationSeed {
  order: number;
  slug: string;
  titleHe: string;
  background: string;
  sourcePages: number[];
  steps: StationStep[];
}

const SEEDS: StationSeed[] = [
  /* ── 1 · ציפור המוזיקה — PDF p12 ─────────────────────────────────────
     The bird sits low-left, so its words ride high. */
  {
    order: 1, slug: 'music-bird', titleHe: 'ציפור המוזיקה',
    background: 'bg-st01-music-bird', sourcePages: [12],
    steps: [
      {
        ...say('s1-a', 'bottom-end', [
          t('המשימה שלי היא פשוטה'),
          t('אני מזמינה אתכם לבחור שיר רומנטי ששניכם אוהבים, לשמוע אותו יחד ולשתף למה אתם אוהבים אותו.'),
        ], 'המשך'),
        /*
         * Let the scene land before the text arrives — but only just.
         *
         * The reveal holds back the CTA as well as the copy, so for the length
         * of this delay the very first station the couple reach has no visible
         * control on it. At 1900ms that is long enough to tap, get nothing, and
         * conclude the game is broken; the same pattern on the elf's opening
         * screen is what the "Continue does not work" report was about. Just
         * over a second still gives the bird its moment.
         */
        revealDelayMs: 1100,
      },
      /*
       * The one station that sends the couple OUT of the app, and the only screen
       * in the game that talks about the app rather than the forest.
       *
       * She asks them to listen to a song and there is no player here, so on a
       * phone the task means leaving for Spotify or YouTube and coming back.
       * Progress has always survived that — a completion is written the moment it
       * happens, and leaving a station writes nothing at all — but the couple had
       * no way of knowing it at the exact moment they were being asked to switch
       * apps, which is a bad place to have to guess.
       *
       * It is a screen of its own rather than a third line above, because the
       * bird's bubble is budgeted at two lines and 210 characters (see the copy
       * budgets in `game.test.ts`) and this sits above her in the frame. It comes
       * BEFORE the ask for the same reason the fairy's standard does: the last
       * thing on a station should be what the couple are meant to do, not
       * housekeeping about the phone.
       */
      say('s1-b', 'bottom-end', [
        t('אם השיר לא נמצא כאן איתכם - פתחו את אפליקציית המוזיקה שלכם, ספוטיפיי או יוטיוב, ונגנו אותו משם.'),
        t('אל תדאגו, המסע שלכם נשמר, ואני אחכה לכם כאן בדיוק במקום הזה.'),
      ], 'המשך'),
      say('s1-c', 'bottom-end', [
        t('אולי השיר הזה מזכיר לכם רגעים יפים מהעבר או אולי יש לו משמעות מיוחדת עבורכם.'),
        t('אז, בחרו את השיר והיו כנים עם הלב שלכם. אני מחכה לשמוע מה תבחרו'),
      ]),
    ],
  },

  /* ── 2 · גמד הכימיה — original content, replacing PDF p14-21 ─────────
     ┌───────────────────────────────────────────────────────────────────────┐
     │ The one station in the game that is not the PDF.                      │
     │                                                                       │
     │ It was 'גמד החידות': three riddles — a shadow, time, fire — each with │
     │ a hidden answer behind a reveal button. Nine taps, the most of any     │
     │ station, spent on riddles that had nothing to do with the couple and   │
     │ no way to answer. It was the first thing in the journey that read as   │
     │ filler, and it arrived second.                                         │
     │                                                                       │
     │ What it was doing structurally was worth keeping: it is the only       │
     │ non-conversational beat in the first third, sitting between the        │
     │ gratitude flowers and the adventure stone, and it breaks up what would │
     │ otherwise be five talking stations in a row. The gnome is also the     │
     │ only character in the forest who teases.                               │
     │                                                                       │
     │ So the character and the job stay and the content changes: ten fast    │
     │ 'who is more' questions about each other, then a toll. Deliberately    │
     │ NOT a quiz — see the note on scoring below.                            │
     └───────────────────────────────────────────────────────────────────────┘
     The gnome sits mid-frame on his boulder, so his words ride high. */
  {
    order: 2, slug: 'chemistry-gnome', titleHe: 'גמד הכימיה',
    background: 'bg-st02-riddle-gnome',
    /*
     * The pages this station replaces, kept as provenance rather than as a
     * source: none of the copy below is from them. It is the record of which
     * eight PDF pages are accounted for, which is what `sourcePages` is read
     * for in visual QA — without it p14-21 would look simply lost.
     */
    sourcePages: [14, 15, 16, 17, 18, 19, 20, 21],
    steps: [
      say('s2-intro-a', 'bottom-start', [
        t('עצרו! אני גמד הכימיה של היער.'),
        t('שמעתי שאתם זוג די מתואם… אבל בואו נראה אם זה באמת נכון.'),
      ], 'המשך'),
      /*
       * The rules in full, on one screen, before the first question.
       *
       * All three lines matter and none of them can arrive late: how many there
       * are, what to physically do, and — the important one — that there is no
       * right answer. A couple who start pointing before reading the third line
       * are playing a quiz.
       */
      say('s2-intro-b', 'bottom-start', [
        t('מחכות לכם 10 שאלות מהירות.'),
        t('בכל שאלה, בלי להתייעץ ובלי לחשוב יותר מדי — הצביעו מיד על מי מכם שהכי מתאים.'),
        t('אין נכון או לא נכון 😉'),
      ], 'בואו נתחיל'),

      /*
       * Ten questions, ten taps, nothing recorded.
       *
       * There is no score, no tally and no winner, and that is a design rule
       * rather than an omission: the moment the game counts who was pointed at,
       * 'מי יותר קנאי' stops being a laugh and becomes a verdict one of them
       * lost. The phone's whole job here is to show a question and get out of
       * the way. That is also why these steps do not gate — see `stepIsGated`.
       *
       * The order is built, not shuffled: it opens on the safest question in the
       * set, keeps the one about repairing a fight in the first half where the
       * round is still light, and ends on the only one with any heat in it, so
       * the round lands the couple somewhere close rather than somewhere neutral.
       */
      ...QUICKFIRE.map((question, i) =>
        quickfire(`s2-q${i + 1}`, i + 1, QUICKFIRE.length, question),
      ),

      say('s2-verdict', 'bottom-start', [
        t('המממ… מעניין.'),
        t('נראה שאתם די מסונכרנים.'),
      ], 'המשך'),

      /*
       * The toll, and the end of the station.
       *
       * His pivot — 'אבל אצלי אף אחד לא עובר בחינם' — sits on the timer screen
       * rather than on one of its own, because it is the setup for the price and
       * splitting them costs a tap to deliver half a joke.
       *
       * `skippable: false` is the copy being true. He says he is counting, so
       * there is no 'דלגו על ההמתנה' to make a liar of him — and at ten seconds
       * a skip control would take longer to read than the wait it saves. The
       * chime at 0:00 is him calling time.
       */
      {
        kind: 'timer', id: 's2-toll', seconds: 10,
        intro: [
          t('אבל אצלי אף אחד לא עובר בחינם…'),
          t('מחיר המעבר שלכם: נשיקה של 10 שניות.'),
          t('בלי קיצורי דרך. אני סופר 👀'),
        ],
        startLabel: 'התחילו את עשר השניות',
        skippable: false,
      },
    ],
  },

  /* ── 3 · פרחי הטוב — PDF p23 ─────────────────────────────────────────
     The flowers carpet the lower half, so their words ride high. */
  {
    order: 3, slug: 'gratitude-flowers', titleHe: 'פרחי הטוב',
    background: 'bg-st03-gratitude-flowers', sourcePages: [23],
    steps: [
      say('s3-a', 'bottom-start', [
        t('שלום לכם אנחנו פרחי הכרת הטוב,'),
        t('כל פרח פורח בזכות הכרת תודה שהוא מקבל.'),
      ], 'המשך'),
      say('s3-b', 'bottom-start', [
        t('שתפו אותנו בחמישה דברים שאתם אסירי תודה עליהם מהשנה האחרונה, ואז נוכל לפנות לכם את הדרך'),
      ]),
    ],
  },

  /* ── 4 · אבן ההרפתקאות — PDF p25 ─────────────────────────────────── */
  {
    order: 4, slug: 'adventure-stone', titleHe: 'אבן ההרפתקאות',
    background: 'bg-st04-adventure-stone', sourcePages: [25],
    steps: [
      say('s4-a', 'bottom-start', [
        t('אני אבן ההרפתקאות.'),
        t('כדי לעבור אותי, עליכם לשתף אחד את השנייה:'),
      ], 'המשך'),
      say('s4-b', 'bottom-start', [
        t('במהלך השנה הקרובה, איפה הייתם רוצים לחוות רגע אינטימי ומיוחד ביחד?'),
        t('תשתפו ואז הדרך תהיה פתוחה לפניכם'),
      ]),
    ],
  },

  /* ── 5 · מדורת ההתחדשות — PDF p27 ────────────────────────────────── */
  {
    order: 5, slug: 'renewal-bonfire', titleHe: 'מדורת ההתחדשות',
    background: 'bg-st05-renewal-bonfire', sourcePages: [27],
    steps: [
      say('s5-a', 'bottom-start', [
        t('אני מדורת ההתחדשות, ושמחה לראות אתכם כאן'),
        t('עכשיו הגיע הזמן להתחמם ולשחרר את מה שכבר לא משרת אתכם.'),
      ], 'המשך'),
      // The question and "now throw them in" were separate taps, so the couple
      // answered on one screen and were told what to do with the answer on the
      // next. The instruction is now complete where it is given.
      say('s5-b', 'bottom-start', [
        t('האש שלי כאן כדי לעזור לכם להיפרד מהמיותר - איזה הרגל או מחשבה יש לכם שאתם רוצים לזרוק אל האש שלי, כדי לפנות מקום למשהו חדש ומרענן בחייכם?'),
        t('תזרקו אותם אל האש ותוכלו להמשיך במסע'),
      ]),
    ],
  },

  /* ── 6 · פיית האהבה — PDF p29 ────────────────────────────────────────
     Her face is high in the frame, so she speaks from below. */
  {
    order: 6, slug: 'love-fairy', titleHe: 'פיית האהבה',
    background: 'bg-st06-love-fairy', sourcePages: [29],
    steps: [
      say('s6-a', 'top-start', [
        t('שלום לכם, אני פיית האהבה,'),
        t('אני כל כך גאה בכם על הדרך שהגעתם עד כאן ביער הקסום שלנו.'),
      ], 'המשך'),
      say('s6-b', 'top-start', [
        t('אבל לפני שתעברו לשלב הבא, יש לי משימה קטנה עבורכם.'),
        t('תפקידי כאן הוא להפיץ את האהבה ולזכור לכל אחד את הסיבה שהוא אוהב את השני.'),
      ], 'המשך'),
      /*
       * She used to ask for the three reasons and only then, over two more taps,
       * say which reasons she would not accept — so a couple who answered on the
       * spot were told afterwards that they had answered wrongly. Her standard
       * now comes first and the ask is the last thing on screen. Same sentences,
       * three screens where there were four.
       */
      /*
       * What she wants leads; what she will not accept follows it.
       *
       * The caveat opened with 'אך' — "but" — which only makes sense after a
       * request, and the request is deliberately the LAST thing on this station
       * so that nobody answers before they have heard the standard. Read in the
       * old order the screen arrived as an objection to something that had not
       * been asked yet; the two lines are simply swapped, and the 'אך' dropped.
       */
      say('s6-c', 'top-start', [
        t('אני מחפשת סיבות מיוחדות, כאלה שעדיין לא אמרתם אחד לשני, שמגיעות מהלב ומראות עד כמה אתם מכירים אחד את השנייה באמת.'),
        t('שימו לב! אני לא רוצה לשמוע סיבות שגרתיות כמו ״אתה תמיד איתי״ או ״אתה מצחיק אותי״.'),
      ], 'המשך'),
      say('s6-d', 'top-start', [
        t('כדי להמשיך, תגידו לי 3 סיבות אמיתיות ומיוחדות למה אתם אוהבים אחד את השנייה.'),
        t('שתפו אותי, ואני אפתח לפניכם את הדרך להמשך'),
      ]),
    ],
  },

  /* ── 7 · פרפר הנשיקות — PDF p31 · with a 0/4 tally ───────────────── */
  {
    order: 7, slug: 'kiss-butterflies', titleHe: 'פרפר הנשיקות',
    background: 'bg-st07-kiss-butterflies', sourcePages: [31],
    steps: [
      say('s7-a', 'bottom-start', [
        t('אנחנו פרפרי הנשיקות, ואנחנו אוהבים לראות זוגות מאושרים. תבחרו מקומות מיוחדים, ואנחנו נביא לשם נשיקות קסם.'),
      ], 'המשך'),
      /*
       * The PDF's single line — 'תצטרכו לנשק אחד השנייה ב4 מקומות שונים לפי
       * בחירתו/בחירתה' — left three things open at once: whether four is the
       * total or four each, which of them picks the place, and whose turn it is.
       * A couple standing over one phone had to stop and negotiate the rules
       * instead of kissing. The rewrite answers all three and keeps the count at
       * four, which is what the tally has always been built for.
       */
      {
        kind: 'tally', id: 's7-tally', target: 4,
        intro: [
          t('ארבע נשיקות, בתורות. בכל תור אחד מכם בוחר מקום שבו הוא רוצה לקבל נשיקה - והשני מנשק בדיוק שם.'),
          t('החליטו מי מתחיל, ואחרי כל נשיקה מתחלפים. סמנו כאן כל נשיקה, ואחרי הרביעית נפנה לכם את הדרך.'),
        ],
        itemLabel: 'נשיקה נוספת',
      },
    ],
  },

  /* ── 8 · רוח הטלפתיה — PDF p33 ───────────────────────────────────── */
  {
    order: 8, slug: 'telepathy-spirit', titleHe: 'רוח הטלפתיה',
    background: 'bg-st08-telepathy-spirit', sourcePages: [33],
    steps: [
      // One screen. The second carried a single line telling them to keep trying —
      // a tap that added nothing to an instruction already complete above it, in
      // the middle of a task the couple were already doing.
      say('s8-a', 'bottom-start', [
        t('אני רוח הטלפתיה, אני כאן לעזור לכם לתאם את המחשבות שלכם.'),
        t('כל אחד מכם יחשוב על מילה שמרגישה לו נכונה, ואז ביחד, תנסו לומר את אותה המילה באותו הזמן.'),
        t('המשיכו לנסות עד שתצליחו להגיד את מילה משותפת ואז הדרך תפתח'),
      ]),
    ],
  },

  /* ── 9 · השדים — PDF p35 ─────────────────────────────────────────────
     Two demons hang in the upper half, so they speak from below. */
  {
    order: 9, slug: 'demons', titleHe: 'השדים',
    background: 'bg-st09-demons', sourcePages: [35],
    steps: [
      say('s9-a', 'top-start', [
        t('אנחנו השדים של היער, אל תדאגו, אנחנו לא כאלה מפחידים כמו שאתם חושבים.'),
        t('אנחנו כאן כדי לעזור לכם להתמודד עם הפחדים שלכם וללמד אתכם איך לשחרר אותם.'),
      ], 'המשך'),
      // Their reassurance used to arrive AFTER the couple had already named a
      // fear. It now sits with the rest of the framing, and the ask keeps only
      // the line that says when the station is finished.
      say('s9-b', 'top-start', [
        t('כל אחד מאיתנו חווה פחדים - לפעמים הם קטנים, לפעמים הם גדולים. אבל כל פחד הוא רק הזדמנות ללמוד ולצמוח.'),
        t('אנחנו כאן כדי להפוך את הדרך שלכם לקלה יותר, כי רק כשמשחררים את הפחד, אפשר להרגיש חופש אמיתי.'),
      ], 'המשך'),
      say('s9-c', 'top-start', [
        t('אז תעצמו עיניים, תחשבו על פחד שעדיין מעכב אתכם, ושתפו אותנו. איזה פחד הייתם רוצים לשחרר?'),
        t('ברגע שתשחררו את הפחדים תוכלו לעבור למשימה הבאה'),
      ]),
    ],
  },

  /* ── 10 · נהר הזכרונות — PDF p37 ─────────────────────────────────── */
  {
    order: 10, slug: 'memory-river', titleHe: 'נהר הזכרונות',
    background: 'bg-st10-memory-river', sourcePages: [37],
    steps: [
      say('s10-a', 'bottom-start', [
        t('אני נהר הזיכרונות, המים שלי זורמים ללא הפסקה בזכות הרגעים היפים של זוגות מאוהבים.'),
      ], 'המשך'),
      say('s10-b', 'bottom-start', [
        t('כל זיכרון מתוק מחייה את המים וממשיך את זרימתי. שתפו אותי ברגע קסום, רגע שאיחד אתכם השנה, ואני אשלח לכם רפסודה קסומה שתעזור לכם לחצות את הנהר אל ההרפתקה הבאה.'),
      ]),
    ],
  },

  /* ── 11 · הרפסודה — PDF p39 ──────────────────────────────────────── */
  {
    order: 11, slug: 'raft', titleHe: 'הרפסודה',
    background: 'bg-st11-raft', sourcePages: [39],
    steps: [
      say('s11-a', 'bottom-start', [
        t('שתפתם בזיכרונות מתוקים, ועכשיו תראו איך הדרך לפניכם מתבהרת והופכת ישרה. כך זה גם בחיים - כשמשתפים, כל דבר הופך לקל וברור יותר.'),
      ], 'המשך'),
      /*
       * 'בהצלחה במשימה הבאה!' is gone rather than merged.
       *
       * It was a screen of its own — four words and a tap — so it was folded in
       * here. But folding it in only moved the problem: it wished the couple luck
       * with the NEXT station while they were still standing in this one, on the
       * very screen that asks them to undress. The raft's own task is complete
       * without it, and the river behind them already handed them over.
       */
      say('s11-b', 'bottom-start', [
        t('הבאתי לכם רפסודה כדי שתוכלו לחצות אותי. אך יש לי חדשות:'),
        t('הרפסודה לא יכולה לשאת משקל רב, ולכן כל אחד מכם יצטרך להוריד פריט לבוש, כדי שהיא לא תשקע ותצליח להביא אתכם לחוף המבטחים.'),
      ]),
    ],
  },

  /* ── 12 · מעגל הזמן — PDF p41 ────────────────────────────────────────
     The glowing clock fills the upper half, so the words sit low on the boardwalk. */
  {
    order: 12, slug: 'time-circle', titleHe: 'מעגל הזמן',
    background: 'bg-st12-time-circle', sourcePages: [41],
    steps: [
      say('s12-a', 'top-start', [
        t('אני מעגל הזמן, אני שומר את כל הרגעים שמרכיבים את ההיסטוריה שלכם. כל זיכרון, כל חוויה, כל תקופה - כולם חקוקים בתוכי.'),
      ], 'המשך'),
      say('s12-b', 'top-start', [
        t('תספרו לי על תקופה אחת בחיים שלכם שהייתם רוצים לחזור אליה. אולי יש תקופה שעשיתם שינוי משמעותי? או רגעים ששימשו לכם מקור השראה?'),
        t('תשתפו אותי והדרך תפתח'),
      ]),
    ],
  },

  /* ── 13 · עץ החזיונות — PDF p43 ──────────────────────────────────── */
  {
    order: 13, slug: 'vision-tree', titleHe: 'עץ החזיונות',
    background: 'bg-st13-vision-tree', sourcePages: [43],
    steps: [
      say('s13-a', 'bottom-start', [
        t('אני עץ החזיונות, נטוע כאן ביער הקסום, ואני שומר את כל החלומות והשאיפות של הזוגות שבאים אליי. אני כאן כדי לעזור לכם לדמיין את העתיד המשותף שלכם יחד.'),
      ], 'המשך'),
      say('s13-b', 'bottom-start', [
        t('ספרו לי, איזה חלום גדול יש לכם לעתיד? איך אתם רואים את עצמכם בעוד 5, 10 או 20 שנה? תשתפו אותי בחזון שלכם, ואוכל לעזור לכם להתקדם במסע'),
      ]),
    ],
  },

  /* ── 14 · כוכב המגנט — PDF p45 · three-minute timer ──────────────────
     The star burns in the upper middle, so the words sit low over the pines.
     The PDF writes the duration twice — "למשל שלוש דקות" and "במשך 3 דקות".
     Both are kept verbatim; the timer runs 180 seconds. */
  {
    order: 14, slug: 'magnet-star', titleHe: 'כוכב המגנט',
    background: 'bg-st14-magnet-star', sourcePages: [45],
    steps: [
      /*
       * The explanation — why silence and facial expressions are the point — used
       * to come one tap AFTER the instruction to sit in silence, so the couple
       * either started early or sat waiting to be told why. Both halves of the
       * reason are now on the first screen, and the instruction is the last thing
       * they read before the timer starts.
       */
      say('s14-a', 'top-start', [
        t('אני כוכב המגנט, ולי יש את הכוח לקרב בין זוגות. אני נמצא כאן כדי להזכיר לכם את הכוח בתקשורת ללא מילים, ובקשר המיוחד שמחבר ביניכם.'),
        t('תנו למגנט שלי לחולל קסמים, כי לפעמים הבעות הפנים מספרות יותר מאלף מילים.'),
      ], 'המשך'),
      say('s14-b', 'top-start', [
        t('עכשיו, אני מבקש מכם לעשות צעד קטן ולהתקרב עוד יותר. שבו קרוב אחד לשני, הביטו בעיניים ואל תדברו למשל שלוש דקות,אך נסו לתקשר דרך הבעות הפנים.'),
      ], 'המשך'),
      {
        kind: 'timer', id: 's14-timer', seconds: 180,
        intro: [
          t('אם תצליחו להסתכל זה לזה בעיניים מבלי לדבר במשך 3 דקות תוכלו לעבור למשימה הבאה'),
        ],
        startLabel: 'התחילו את שלוש הדקות',
        skippable: true,
      },
    ],
  },

  /* ── 15 · אגם ההשתקפות — PDF p47 ─────────────────────────────────────
     A place rather than a face, so a panel rather than a bubble — and the only
     olive-toned panel in the game. Anchored low so the reflection, which IS the
     content of this station, stays visible. */
  {
    order: 15, slug: 'reflection-lake', titleHe: 'אגם ההשתקפות',
    background: 'bg-st15-reflection-lake', sourcePages: [47],
    steps: [
      panel('s15-a', [
        t('אני בריכת השתקפויות, ואני כאן כדי להזכיר לכם להסתכל לא רק על מה שנראה לעין, אלא גם על מה שמסתתר מעבר.'),
      ], { tone: 'olive', ctaLabel: 'המשך' }),
      panel('s15-b', [
        t('הביטו בי ושתפו את מה שאתם רואים, אך לא את הדמות שלכם, אלא את מי שנמצא לידכם.'),
      ], { tone: 'olive', ctaLabel: 'המשך' }),
      panel('s15-c', [
        t('תארו אחד את השני - לא במילים חיצוניות כמו בגדים או מראה, אלא במילים עמוקות שמתארות את האישיות, הרגשות והאנרגיה שהוא משדר.'),
      ], { tone: 'olive' }),
    ],
  },

  /* ── 16 · הספר העתיק — PDF p49 ───────────────────────────────────── */
  {
    order: 16, slug: 'ancient-book', titleHe: 'הספר העתיק',
    background: 'bg-st16-ancient-book', sourcePages: [49],
    steps: [
      say('s16-a', 'bottom-start', [
        t('ברוכים הבאים! כל הכבוד שהגעתם אליי. אתם לקראת סוף המסע'),
        t('אני הוא הספר העתיק בן ה1000 שנה'),
      ], 'המשך'),
      say('s16-b', 'bottom-start', [
        t('הסיבה שאני מצליח להישמר טוב כל השנים היא בזכות הברכות שאני צובר,'),
        t('ואני כאן כדי להזכיר לכם שכל התחלה צריכה להיות מלאה בכוונות טובות.'),
      ], 'המשך'),
      say('s16-c', 'bottom-start', [
        // Evergreen edit: the PDF reads "ברכו זה את זאת לקראת השנה החדשה".
        t('ברכו זה את זאת לקראת הימים הבאים, והדרך שלכם תתבהר'),
      ]),
    ],
  },

  /* ── 17 · חד קרן הפינוקים — PDF p51 ──────────────────────────────── */
  {
    order: 17, slug: 'pampering-unicorn', titleHe: 'חד קרן הפינוקים',
    background: 'bg-st17-pampering-unicorn', sourcePages: [51],
    steps: [
      say('s17-a', 'bottom-start', [
        t('אני חד קרן הפינוקים,'),
        t('אני נמצא כאן להזכיר לכם את החשיבות של פינוק הדדי. אחרי כל ההרפתקאות שעברתם, הגיע הזמן לפנק את בן/בת הזוג.'),
      ], 'המשך'),
      say('s17-b', 'bottom-start', [
        t('רק אם תתחייבו להפתיע ולהשקיע אחד בשני בשבוע הקרוב, תוכלו להמשיך בדרככם.'),
        t('המשימה שלכם היא:'),
      ], 'המשך'),
      // "Make this promise" was a tap on its own, after the promise had been
      // described and, in practice, already made.
      say('s17-c', 'bottom-start', [
        t('כל אחד מבטיח פינוק קטן או מחווה נעימה שיעניק לשני בשבוע הקרוב - זה יכול להיות מסאז׳, ארוחה אהובה, או יום מפנק ורגוע.'),
        t('עשו את ההבטחה הזו, וכך תוכלו להמשיך במסע שלכם'),
      ]),
    ],
  },

  /* ── 18 · שער הנשיקות — PDF p53 · one-minute timer, then the ending ── */
  {
    order: 18, slug: 'kiss-gate', titleHe: 'שער הנשיקות',
    background: 'bg-st18-kiss-gate', sourcePages: [53],
    steps: [
      say('s18-a', 'bottom-start', [
        t('אני שער הנשיקות, ואפשר לעבור דרכי רק אם תבטאו אהבה באופן הטבעי ביותר - דרך נשיקה אמיתית'),
      ], 'המשך'),
      {
        kind: 'timer', id: 's18-timer', seconds: 60,
        intro: [t('עליכם להתנשק במשך דקה שלמה על מנת שתוכלו לעבור בשער')],
        startLabel: 'התחילו את הדקה',
        skippable: true,
      },
    ],
  },
];

export const STATIONS: Station[] = SEEDS.map((seed) => ({
  id: `station-${String(seed.order).padStart(2, '0')}-${seed.slug}`,
  order: seed.order,
  slug: seed.slug,
  titleHe: seed.titleHe,
  background: seed.background,
  mapHotspot: mapHotspotFor(seed.order),
  steps: seed.steps,
  completion: STATION_COMPLETION,
  sourcePages: seed.sourcePages,
}));

export function stationByOrder(order: number): Station | undefined {
  return STATIONS.find((station) => station.order === order);
}
