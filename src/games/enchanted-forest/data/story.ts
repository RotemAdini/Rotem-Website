/**
 * The three story flows that precede the map.
 *
 * story-origin and story-elf are transcribed verbatim from the PDF via
 * PAGE_BY_PAGE_SPEC.md, including original spacing and typos.
 * story-intro is the approved rewrite: two screens, no New Year reference.
 *
 * Mapping (V1_SCREEN_MAP.md §3):
 *   story-intro   rewritten            2 steps, one shared background
 *   story-origin  PDF pages 4-6        3 steps, three backgrounds
 *   story-elf     PDF pages 7-9 + 10   6 steps, one background, speech bubbles
 */

import type { StoryFlowDef } from '../types/content.ts';

export const STORY_FLOWS: StoryFlowDef[] = [
  {
    // Two screens only, per the approved rewrite. The former welcome / "איך משחקים?"
    // screen is gone, which also retires the PDF's "swipe between pages" sentence.
    // The New Year reference has been removed — the game is evergreen, not seasonal.
    id: 'story-intro',
    next: { type: 'flow', id: 'story-origin' },
    steps: [
      {
        id: 'intro-questions',
        background: 'bg-cover-forest-day',
        ctaLabel: 'המשך',
        blocks: [
          { id: 'q1', text: 'אתם בטח שואלים את עצמכם:' },
          { id: 'q2', text: 'מה זה היער הקסום הזה בכלל?' },
          { id: 'q3', text: 'איך פתאום מצאתם את עצמכם בו?' },
          { id: 'q4', text: 'ומה אתם צריכים לעשות כדי לצאת ממנו?' },
        ],
      },
      {
        id: 'intro-premise',
        background: 'bg-cover-forest-day',
        ctaLabel: 'בואו נגלה',
        blocks: [
          { id: 'p1', text: 'היער הזה הוא לא סתם מקום.' },
          { id: 'p2', text: 'הוא מלא הפתעות, אתגרים ורגעים מפתיעים.' },
          { id: 'p3', text: 'הדרך היחידה לברוח ממנו היא לעבור 18 משימות' },
          { id: 'p4', text: 'שיבדקו אתכם, יחברו ביניכם' },
          { id: 'p5', text: 'ויגלו צדדים חדשים אחד של השני.' },
          { id: 'p6', text: 'האם תצליחו להתמודד עם הכל ולהימלט,' },
          { id: 'p7', text: 'או שתישארו לכודים בקסם של היער לנצח?' },
          { id: 'p8', text: 'אז איך הכל התחיל?' },
        ],
      },
    ],
  },

  {
    id: 'story-origin',
    next: { type: 'flow', id: 'story-elf' },
    steps: [
      {
        id: 'origin-trip',
        background: 'bg-story-night-forest-couple',
        // The couple sit across the middle of this photograph, candles between
        // them; a centred panel covered both of them and the picnic itself.
        panel: { anchor: 'top' },
        ctaLabel: 'המשך',
        blocks: [
          { id: 'o1', text: 'הכל התחיל ביום שבו רציתם קצת לברוח מהשגרה.' },
          { id: 'o2', text: 'בחרתם לצאת לטיול ביער קטן ולא מוכר, רק כדי לשנות אווירה' },
          {
            id: 'o3',
            text: 'הכנתם אוכל לפיקניק ארגנתם ציוד ונסעתם למקום מיוחד באמצע היער',
          },
          {
            id: 'o4',
            text: 'זה היה רק אתם לאור ירח באווירה הרומנטית והמיוחדת ששניכם חיכיתם לה',
          },
        ],
      },
      {
        id: 'origin-roadside',
        background: 'bg-story-forest-road-car',
        ctaLabel: 'המשך',
        blocks: [
          { id: 'r1', text: 'בדרך חזור הביתה הבחנתם במשהו מוזר בצד הדרך' },
          { id: 'r2', text: 'והחלטתם לרדת לבדוק במה מדובר' },
        ],
      },
      {
        id: 'origin-path',
        background: 'bg-story-lantern-path',
        // The couple stand in the middle of the path. Keep the longer panel in
        // the sky band so it frames them instead of covering them.
        panel: { anchor: 'top' },
        ctaLabel: 'המשך',
        blocks: [
          {
            id: 'l1',
            text: 'ראיתם שביל מסתורי והחלטתם לראות מה יש בו , אך ככל שהעמקתם פנימה, הדברים התחילו להשתנות: האוויר התמלא בניחוחות משונים, עלים זרחניים נפלו סביבכם, והעצים החלו ללחוש',
          },
          { id: 'l2', text: 'המשכתם ללכת עד שלפתע שמעתם רעש מוזר מאחורי אחד העצים' },
          { id: 'l3', text: 'ופתאום נגלתה אליכם....' },
        ],
      },
    ],
  },

  {
    id: 'story-elf',
    next: { type: 'map' },
    // Finishing this flow is what flips `gameStarted` and opens the map.
    marksGameStarted: true,
    steps: [
      // Her bubbles sit low, tail pointing up: her face (28-40%) and the glowing
      // crystal (48-56%) stay visible, and only the leaf dress is covered.
      {
        id: 'elf-appears',
        background: 'bg-story-elf-night-forest',
        label: 'שדונית קסומה',
        // No reveal delay. This screen has no speech on it — the label IS the
        // content — so the delay held back the only thing worth seeing AND the
        // control that leaves the screen, which left the couple tapping a
        // Continue button that was not there yet.
        variant: 'bubble',
        tail: 'top-start',
        ctaLabel: 'המשך',
        blocks: [],
      },
      {
        id: 'elf-line-1',
        background: 'bg-story-elf-night-forest',
        variant: 'bubble',
        tail: 'top-start',
        ctaLabel: 'המשך',
        blocks: [
          { id: 'e1', text: 'בני אדם? מה אתם עושים כאן?' },
          { id: 'e2', text: 'היער הקסום זה לא מקום לבני אדם' },
        ],
      },
      // PDF page 9 is split across two bubbles. A single bubble with all four
      // lines filled half the screen and would sit on the elf's face; two short
      // ones stay above her head. The copy itself is untouched.
      {
        id: 'elf-line-2a',
        background: 'bg-story-elf-night-forest',
        variant: 'bubble',
        tail: 'top-start',
        ctaLabel: 'המשך',
        blocks: [
          { id: 'e3', text: 'עכשיו כשאתם כאן אני לא יכולה פשוט לתת לכם לעזוב' },
          { id: 'e4', text: 'היער הזה מלא בקסם ומשימות שמיועדות לזוגות אוהבים בלבד.' },
        ],
      },
      {
        id: 'elf-line-2b',
        background: 'bg-story-elf-night-forest',
        variant: 'bubble',
        tail: 'top-start',
        ctaLabel: 'המשך',
        blocks: [
          {
            id: 'e5',
            text: 'אם תעברו את כל התחנות ותצליחו בכל המשימות, תמצאו את הדרך החוצה.',
          },
          { id: 'e6', text: 'אם לא אולי תצטרכו להישאר כאן לנצח!' },
        ],
      },
      // PDF page 10's bubble, moved here so she explains the map before it opens.
      // This is what removed the need for a separate elf cut-out asset.
      // Also split in two, for the same reason as page 9.
      {
        id: 'elf-map-briefing-a',
        background: 'bg-story-elf-night-forest',
        variant: 'bubble',
        tail: 'top-start',
        ctaLabel: 'המשך',
        blocks: [
          { id: 'm1', text: 'זוהי המפה של היער הקסום,' },
          { id: 'm2', text: 'יש לפניכם 18 משימות , בכל תחנה מחכה לכם דמות,' },
          { id: 'm3', text: 'אתגר או חוויה מיוחדת ברגע שתצליחו את כל המשימות' },
        ],
      },
      {
        id: 'elf-map-briefing-b',
        background: 'bg-story-elf-night-forest',
        variant: 'bubble',
        tail: 'top-start',
        ctaLabel: 'אל המפה',
        blocks: [
          { id: 'm4', text: 'תצליחו לצאת מהיער' },
          { id: 'm5', text: 'בהצלחה!' },
        ],
      },
    ],
  },
];

export function storyFlowById(id: StoryFlowDef['id']): StoryFlowDef | undefined {
  return STORY_FLOWS.find((flow) => flow.id === id);
}
