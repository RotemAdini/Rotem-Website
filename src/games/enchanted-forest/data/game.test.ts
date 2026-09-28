/**
 * Content contracts: the data files must stay structurally consistent with the
 * state layer. Cheap guards that catch a mis-authored station immediately.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import type { StationStep, TextBlock } from '../types/content.ts';
import { CONTENT_VERSION, GAME_ID, TOTAL_STATIONS } from '../constants.ts';
import { canEnterStation, createInitialProgress } from '../state/progress.ts';
import { ENCHANTED_FOREST, validateManifest } from './game.ts';
import { STATIONS, stationByOrder } from './stations.ts';
import { nextInSequence, previousInSequence } from '../state/sequence.ts';
import { isAssetAvailable } from '../utils/assets.ts';
import { STORY_FLOWS, storyFlowById } from './story.ts';

/**
 * The text blocks a step puts on screen, whatever kind it is.
 *
 * Four tests had each grown their own copy of this ternary, so replacing one
 * step kind meant fixing the same expression in four places — and the compiler
 * only found them because the old kind was deleted outright rather than left
 * lying around. One switch, exhaustive, so the next step kind is one edit here
 * and a compile error until it is made.
 */
function stepBlocks(step: StationStep): TextBlock[] {
  switch (step.kind) {
    case 'brief':
      return step.blocks;
    case 'quickfire':
      return step.prompt;
    case 'timer':
    case 'tally':
      return step.intro;
    default: {
      const never: never = step;
      return never;
    }
  }
}

/** The same, as plain strings. */
const stepLines = (step: StationStep): string[] => stepBlocks(step).map((b) => b.text);

describe('manifest', () => {
  test('is structurally valid', () => {
    assert.deepEqual(validateManifest(ENCHANTED_FOREST), []);
  });

  test('carries the stable game id and content version', () => {
    assert.equal(ENCHANTED_FOREST.id, GAME_ID);
    assert.equal(ENCHANTED_FOREST.id, 'enchanted-forest');
    assert.equal(ENCHANTED_FOREST.contentVersion, CONTENT_VERSION);
    assert.equal(ENCHANTED_FOREST.direction, 'rtl');
    assert.equal(ENCHANTED_FOREST.locale, 'he-IL');
  });

  test('validateManifest actually catches a broken manifest', () => {
    const broken = { ...ENCHANTED_FOREST, stations: STATIONS.slice(0, 5) };
    assert.ok(validateManifest(broken).length > 0);
  });
});

describe('stations', () => {
  test('there are exactly 18, ordered 1..18', () => {
    assert.equal(STATIONS.length, TOTAL_STATIONS);
    assert.deepEqual(
      STATIONS.map((s) => s.order),
      Array.from({ length: TOTAL_STATIONS }, (_, i) => i + 1),
    );
  });

  test('every station order is reachable by the state layer', () => {
    const progress = createInitialProgress();
    for (const station of STATIONS) {
      // Valid orders only; locked-ness is a separate concern.
      assert.equal(typeof station.order, 'number');
      assert.equal(canEnterStation(station.order, progress) || station.order > 1, true);
    }
  });

  test('ids, titles and assets are present and unique', () => {
    const ids = new Set(STATIONS.map((s) => s.id));
    assert.equal(ids.size, TOTAL_STATIONS);
    for (const station of STATIONS) {
      assert.match(station.id, /^station-\d{2}-/);
      assert.ok(station.titleHe.length > 0, `${station.id} has a title`);
      assert.ok(station.background.length > 0, `${station.id} has a background`);
      assert.ok(station.sourcePages.length > 0, `${station.id} records its PDF pages`);
    }
  });

  test('every station uses the approved completion wording', () => {
    for (const station of STATIONS) {
      assert.equal(station.completion.label, 'סיימנו ✓');
      assert.equal(station.completion.revisitLabel, 'חזרה למפה');
      assert.equal(station.completion.requiresAllSteps, true);
    }
  });

  test('the special stations have the expected step shapes', () => {
    const kinds = (order: number) => stationByOrder(order)?.steps.map((s) => s.kind);
    // Station 2: he stops them, gives the rules, asks ten, reacts, charges.
    assert.deepEqual(
      kinds(2),
      ['brief', 'brief', ...Array<string>(10).fill('quickfire'), 'brief', 'timer'],
      'station 2',
    );
    assert.deepEqual(kinds(7), ['brief', 'tally'], 'station 7');
    assert.deepEqual(kinds(14), ['brief', 'brief', 'timer'], 'station 14');
    assert.deepEqual(kinds(18), ['brief', 'timer'], 'station 18');
  });

  /*
   * The shape a station's screens have to hold.
   *
   * Several stations used to run task → Continue → explanation: they asked for
   * something, and only once it had been done did the next tap say what kind of
   * answer was wanted, or why the task mattered. A couple playing it in the room
   * cannot un-answer. Each rule below pins one of those flows the right way
   * round, by the words that actually appear on screen rather than by step index,
   * so re-grouping the copy again is free but reversing the order is not.
   */
  describe('the explanation comes before the task', () => {
    const screens = (order: number): string[][] =>
      (stationByOrder(order)?.steps ?? []).map(stepLines);

    /** Index of the first screen whose copy contains this phrase. */
    const screenWith = (order: number, needle: string): number => {
      const index = screens(order).findIndex((lines) => lines.some((l) => l.includes(needle)));
      assert.notEqual(index, -1, `station ${order} no longer says "${needle}"`);
      return index;
    };

    test('6 · the fairy says which reasons she will not accept first', () => {
      assert.ok(
        screenWith(6, 'סיבות שגרתיות') < screenWith(6, '3 סיבות אמיתיות'),
        'her standard must be on screen before she asks for the three reasons',
      );
    });

    test('8 · the spirit gives the whole task on one screen', () => {
      assert.equal(stationByOrder(8)?.steps.length, 1, 'no second screen of go-ahead');
      assert.equal(screenWith(8, 'המשיכו לנסות'), 0);
    });

    test('14 · the star explains the silence before asking for it', () => {
      assert.ok(
        screenWith(14, 'מאלף מילים') <= screenWith(14, 'אל תדברו'),
        'the reason must be read by the time they are told to stop talking',
      );
    });

    test('9 · the demons reassure before they ask for a fear', () => {
      assert.ok(screenWith(9, 'חופש אמיתי') < screenWith(9, 'איזה פחד הייתם רוצים לשחרר'));
    });

    test('6 · nothing is asked for until the whole standard has been given', () => {
      // The failure this guards is specific: a couple who answer the moment they
      // are asked must not then be told what kind of answer was wanted. So the
      // request has to be the LAST thing she says, after both halves of her
      // standard — the kind she wants and the kind she does not.
      const ask = screenWith(6, '3 סיבות אמיתיות');
      assert.ok(screenWith(6, 'סיבות מיוחדות, כאלה שעדיין לא אמרתם') < ask);
      assert.ok(screenWith(6, 'סיבות שגרתיות') < ask);
      assert.equal(ask, (stationByOrder(6)?.steps.length ?? 0) - 1, 'the ask is her last screen');
    });

    /*
     * Station 1 is the only place the game sends the couple OUT of the app: it
     * asks them to play a song, and there is no player here. Progress has always
     * survived that — completions are written as they happen and leaving a
     * station writes nothing — but the couple had no way of knowing it at the
     * exact moment they were being asked to switch apps.
     */
    test('1 · the bird says the journey is saved while they go and find the song', () => {
      const lines = screens(1).flat().join(' ');
      assert.ok(lines.includes('נשמר'), 'the couple are told their progress is kept');
      assert.ok(
        /ספוטיפיי|יוטיוב|אפליקציית המוזיקה/.test(lines),
        'and that opening a music app is what she means',
      );
      // Housekeeping about the phone must not be the last thing she says: the
      // screen the couple act on is the one asking them to choose the song.
      const note = screenWith(1, 'המסע שלכם נשמר');
      const ask = screenWith(1, 'בחרו את השיר');
      assert.ok(note < ask, 'the practical note comes before the ask, never after it');
      assert.equal(ask, (stationByOrder(1)?.steps.length ?? 0) - 1, 'the ask is her last screen');
    });

    /*
     * 'תצטרכו לנשק אחד השנייה ב4 מקומות שונים לפי בחירתו/בחירתה' left three
     * things open at once — four total or four each, who picks the place, and
     * whose turn it is — so the couple had to stop and agree on the rules. The
     * tally has always counted to four; the words now say so too.
     */
    test('7 · the kisses station states the count, the chooser and the turns', () => {
      const station = stationByOrder(7);
      const tally = station?.steps.find((s) => s.kind === 'tally');
      assert.ok(tally && tally.kind === 'tally');
      assert.equal(tally.target, 4);

      const lines = tally.intro.map((b) => b.text).join(' ');
      assert.ok(lines.includes('ארבע נשיקות'), 'the total is named in words');
      assert.ok(lines.includes('בתורות'), 'the turn-taking is explicit');
      assert.ok(lines.includes('מתחלפים'), 'and so is the swap after each kiss');
      assert.ok(lines.includes('בוחר'), 'the copy says who picks the place');
      assert.equal(
        lines.includes('בחירתו/בחירתה'),
        false,
        'the ambiguous PDF phrasing is gone',
      );
    });

    /*
     * This line survived one merge already: it was a screen of its own, so it was
     * folded into the raft's task — where it went on wishing the couple luck with
     * the NEXT station while they were still standing in this one, on the screen
     * that asks them to undress.
     */
    test('no station points the couple at the mission after it', () => {
      for (const station of STATIONS) {
        for (const lines of screens(station.order)) {
          assert.equal(
            lines.some((line) => line.includes('בהצלחה במשימה הבאה')),
            false,
            `${station.id} wishes them luck with a station they have not reached`,
          );
        }
      }
    });

    test('a station never ends on a screen that only says "now go"', () => {
      // These five lines were each a screen of their own, tapped through after
      // the task they belonged to was already done.
      const wasItsOwnScreen = [
        'תזרקו אותם אל האש ותוכלו להמשיך במסע',
        'המשיכו לנסות עד שתצליחו',
        'עשו את ההבטחה הזו',
        'ברגע שתשחררו את הפחדים',
      ];
      for (const station of STATIONS) {
        for (const [index, lines] of screens(station.order).entries()) {
          const goAhead = wasItsOwnScreen.find((line) => lines.some((l) => l.includes(line)));
          if (!goAhead) continue;
          assert.ok(
            lines.length > 1,
            `${station.id} step ${index}: "${goAhead}" is alone on a screen again`,
          );
        }
      }
    });
  });

  /*
   * Copy that names another station has to follow the ROUTE, not the numbering.
   *
   * The gnome is the only character who does this, and the re-ordering broke him
   * both ways at once: he greeted the couple by teasing the station they had just
   * come from — which had become the flowers, not the bird — and handed them on to
   * the flowers, which by then were already behind them. Nothing in the game
   * noticed, because both sentences are still perfectly good Hebrew.
   */
  describe('characters name the places the couple actually pass', () => {
    const titleOf = (order: number) => stationByOrder(order)?.titleHe ?? '';
    const copyOf = (order: number) => (stationByOrder(order)?.steps ?? []).flatMap(stepLines);

    /*
     * The gnome used to be the only character who named his neighbours — he
     * teased the station behind him and handed the couple on to the one ahead —
     * and that is why this whole describe block exists: re-ordering the journey
     * broke both sentences at once and nothing noticed, because both were still
     * perfectly good Hebrew.
     *
     * 'גמד הכימיה' names neither. He opens on 'עצרו!' — he stops them rather
     * than greeting them — and he ends on his toll rather than on a handover.
     * So the two tests that pinned those sentences are gone with them, and what
     * replaces them is the assertion that he no longer makes the claim at all.
     * The general rule below still guards every station, including this one.
     */
    test('the gnome names no station but his own', () => {
      const before = previousInSequence(2);
      const after = nextInSequence(2);
      assert.equal(before, 3, 'precondition: the flowers come before the gnome');
      assert.equal(after, 4, 'precondition: the stone comes after the gnome');

      const copy = copyOf(2).join(' ');
      for (const station of STATIONS) {
        if (station.order === 2) continue;
        assert.equal(
          copy.includes(station.titleHe),
          false,
          `the gnome names '${station.titleHe}', which his copy no longer accounts for`,
        );
      }
    });

    test('no station names a place that is not its neighbour in the journey', () => {
      for (const station of STATIONS) {
        const neighbours = new Set(
          [previousInSequence(station.order), nextInSequence(station.order)]
            .filter((n): n is number => n !== null)
            .map(titleOf),
        );
        for (const text of copyOf(station.order)) {
          for (const other of STATIONS) {
            if (other.order === station.order) continue;
            if (!text.includes(other.titleHe)) continue;
            assert.ok(
              neighbours.has(other.titleHe),
              `${station.id} names '${other.titleHe}', which is neither the station before it nor after it`,
            );
          }
        }
      }
    });
  });

  test('every station is fully authored — no TODO copy left', () => {
    for (const station of STATIONS) {
      for (const step of station.steps) {
        for (const text of stepLines(step)) {
          assert.equal(text.includes('TODO'), false, `${station.id} / ${step.id}`);
          assert.ok(text.trim().length > 0, `${station.id} / ${step.id} is empty`);
        }
      }
    }
  });

  /*
   * Station 2 — גמד הכימיה.
   *
   * The riddles it replaces were three PDF puzzles about a shadow, time and
   * fire: nothing to do with the couple, no way to answer, and nine taps spent
   * on a reveal button. What follows pins the shape of what replaced them.
   */
  describe('the gnome asks ten fast questions and then charges a toll', () => {
    const station = stationByOrder(2);

    test('the station is the chemistry gnome, and nothing about riddles is left', () => {
      assert.ok(station);
      assert.equal(station.titleHe, 'גמד הכימיה');
      assert.equal(
        STATIONS.some((s) => s.titleHe.includes('חידות')),
        false,
        'a station is still called the riddle gnome',
      );
      const copy = station.steps.flatMap(stepLines).join(' ');
      for (const ghost of ['חידה', 'חידות', 'הצל שלך', 'מי אני?', 'גלו את התשובה']) {
        assert.equal(copy.includes(ghost), false, `the riddles left '${ghost}' behind`);
      }
    });

    test('ten questions, each on its own screen, each counted', () => {
      const questions = station?.steps.filter((s) => s.kind === 'quickfire') ?? [];
      assert.equal(questions.length, 10);
      questions.forEach((q, i) => {
        assert.ok(q.kind === 'quickfire');
        assert.equal(q.index, i + 1, 'the badge counts up in order');
        assert.equal(q.total, 10, 'and against the real total');
        assert.equal(q.prompt.length, 1, `${q.id}: one question per screen, never two`);
        assert.ok(q.prompt[0]?.text.startsWith('מי '), `${q.id}: every question is a "who is more"`);
      });
    });

    /*
     * The rule the whole station rests on. The brief was explicit: no scoring,
     * no winner, no competition — the moment the game records who was pointed
     * at, 'מי יותר קנאי' stops being a laugh and becomes a verdict one of them
     * lost. A quickfire step carries no answer, no target and no tally, and this
     * is what stops one being added later without the decision being re-made.
     */
    test('nothing about the round is recorded, scored or won', () => {
      for (const step of station?.steps ?? []) {
        if (step.kind !== 'quickfire') continue;
        assert.deepEqual(
          Object.keys(step).filter((k) => !['kind', 'id', 'index', 'total', 'prompt', 'ctaLabel'].includes(k)),
          [],
          `${step.id} has grown a field the round is not supposed to have`,
        );
      }
      const copy = (station?.steps ?? []).flatMap(stepLines).join(' ');
      for (const ghost of ['ניקוד', 'נקודות', 'ניצח', 'מנצח', 'הפסיד', 'תוצאה']) {
        assert.equal(copy.includes(ghost), false, `the round talks about '${ghost}'`);
      }
      assert.equal(
        station?.steps.some((s) => s.kind === 'tally'),
        false,
        'a tally would count the answers',
      );
    });

    test('the couple are told there is no right answer before the first question', () => {
      const steps = station?.steps ?? [];
      const rules = steps.findIndex((s) => stepLines(s).some((l) => l.includes('אין נכון או לא נכון')));
      const firstQuestion = steps.findIndex((s) => s.kind === 'quickfire');
      assert.notEqual(rules, -1, 'the "no right answer" line is gone');
      assert.ok(rules < firstQuestion, 'a couple who read it late have already played a quiz');
      // And how to play, on the same screen: pointing at once, without
      // conferring, is the mechanic, and it cannot arrive after the pointing
      // has started.
      assert.ok(stepLines(steps[rules]!).some((l) => l.includes('הצביעו מיד')));
    });

    test('the toll is a ten-second timer he refuses to let them skip', () => {
      const toll = station?.steps.at(-1);
      assert.ok(toll && toll.kind === 'timer', 'the station ends on the toll');
      assert.equal(toll.seconds, 10);
      // He says 'אני סופר'. A skip control would make that a lie, and at ten
      // seconds it would take longer to read than the wait it saves.
      assert.equal(toll.skippable, false);
      const copy = toll.intro.map((b) => b.text).join(' ');
      assert.ok(copy.includes('אף אחד לא עובר בחינם'), 'his pivot sits with the price');
      assert.ok(copy.includes('10 שניות'));
    });
  });

  test('no station bubble carries more than three lines', () => {
    for (const station of STATIONS) {
      for (const step of station.steps) {
        if (step.kind !== 'brief' || step.presentation !== 'bubble') continue;
        assert.ok(step.blocks.length <= 3, `${station.id}/${step.id}: ${step.blocks.length}`);
      }
    }
  });

  test('only the last step of a station omits its own CTA label', () => {
    // The completion CTA comes from `Station.completion`, so the final step must
    // not carry one of its own.
    for (const station of STATIONS) {
      station.steps.forEach((step, index) => {
        const isLast = index === station.steps.length - 1;
        if (isLast) {
          assert.equal(step.ctaLabel, undefined, `${station.id} last step`);
        } else if (step.kind === 'brief') {
          assert.ok(step.ctaLabel, `${station.id}/${step.id} needs a CTA`);
        }
      });
    }
  });

  /*
   * Station 2 is the one station whose copy is not from the PDF. Its pages are
   * still recorded, as the account of which source pages it replaced — visual QA
   * reads `sourcePages` to check that all 54 are accounted for, and dropping
   * these eight would make p14-21 look simply lost rather than deliberately
   * retired.
   */
  test('station 2 still accounts for the eight pages it replaced', () => {
    const station = stationByOrder(2);
    assert.ok(station);
    assert.deepEqual(station.sourcePages, [14, 15, 16, 17, 18, 19, 20, 21]);
  });

  test('timer durations match the source text', () => {
    const seconds = (order: number) => {
      const step = stationByOrder(order)?.steps.find((s) => s.kind === 'timer');
      return step?.kind === 'timer' ? step.seconds : undefined;
    };
    assert.equal(seconds(14), 180);
    assert.equal(seconds(18), 60);
  });

  /*
   * The classic board's coordinates were asserted here too — a second grid, on a
   * 1080x1920 frame, that ascended strictly with station order. Both it and the
   * `mapPosition` field it fed are gone; `mapLayout.test.ts` covers the hotspots
   * that replaced them, including that no two share a spot and that consecutive
   * legs are far enough apart to tell apart.
   */
  test('every station has a hotspot inside the frame', () => {
    for (const station of STATIONS) {
      const { position } = station.mapHotspot;
      assert.ok(position.x > 0 && position.x < 100, `x in range for ${station.order}`);
      assert.ok(position.y > 0 && position.y < 100, `y in range for ${station.order}`);
    }
  });
});

describe('story flows', () => {
  test('there are three flows with the expected step counts', () => {
    assert.equal(STORY_FLOWS.length, 3);
    assert.equal(storyFlowById('story-intro')?.steps.length, 2);
    assert.equal(storyFlowById('story-origin')?.steps.length, 3);
    assert.equal(storyFlowById('story-elf')?.steps.length, 6, 'includes the moved PDF p10 bubble, split to keep bubbles short');
  });

  test('the flows chain into each other and end at the map', () => {
    assert.deepEqual(storyFlowById('story-intro')?.next, { type: 'flow', id: 'story-origin' });
    assert.deepEqual(storyFlowById('story-origin')?.next, { type: 'flow', id: 'story-elf' });
    assert.deepEqual(storyFlowById('story-elf')?.next, { type: 'map' });
  });

  test('exactly one flow marks the game as started', () => {
    const marking = STORY_FLOWS.filter((flow) => flow.marksGameStarted === true);
    assert.equal(marking.length, 1);
    assert.equal(marking[0]?.id, 'story-elf');
  });

  test('the elf flow uses one background throughout', () => {
    const backgrounds = new Set(storyFlowById('story-elf')?.steps.map((s) => s.background));
    assert.equal(backgrounds.size, 1, 'pages 7-9 are pixel-identical');
  });

  test('the mysterious path keeps its panel above the couple', () => {
    const path = storyFlowById('story-origin')?.steps.find((step) => step.id === 'origin-path');
    assert.equal(path?.panel?.anchor, 'top');
  });
});

describe('intro copy', () => {
  test('the intro is exactly two screens', () => {
    assert.equal(storyFlowById('story-intro')?.steps.length, 2);
  });

  test('the game is evergreen — no seasonal references anywhere in authored copy', () => {
    const authored: string[] = [];
    for (const flow of STORY_FLOWS) {
      for (const step of flow.steps) {
        authored.push(...step.blocks.map((b) => b.text));
        if (step.label) authored.push(step.label);
      }
    }
    for (const station of STATIONS) {
      for (const step of station.steps) {
        if (step.kind === 'brief') authored.push(...step.blocks.map((b) => b.text));
      }
    }

    // Guards against the New Year framing creeping back in when later stations
    // are transcribed — PDF pages 3 and 49 both carry it.
    const seasonal = authored.filter((text) => /השנה החדשה|ערב השנה/.test(text));
    assert.deepEqual(seasonal, [], 'seasonal references must stay removed');
  });

  test('the retired "swipe between pages" instruction is gone', () => {
    const all = STORY_FLOWS.flatMap((f) => f.steps.flatMap((s) => s.blocks.map((b) => b.text)));
    assert.equal(all.some((t) => t.includes('דפדוף')), false);
  });

  test('no single bubble carries more than three lines', () => {
    // A taller bubble starts covering the speaker — see V1_SCREEN_MAP.md §6.
    for (const flow of STORY_FLOWS) {
      for (const step of flow.steps) {
        if (step.variant !== 'bubble') continue;
        assert.ok(step.blocks.length <= 3, `${step.id} has ${step.blocks.length} lines`);
      }
    }
  });

  test('no screen hides its only control for longer than a beat', () => {
    // `revealDelayMs` gates the action dock as well as the text. A screen that
    // holds it for a second and a half reads as a broken button, not a reveal.
    const REVEAL_MAX = 1300;
    for (const flow of STORY_FLOWS) {
      for (const step of flow.steps) {
        assert.ok(
          (step.revealDelayMs ?? 0) <= REVEAL_MAX,
          `${flow.id}/${step.id} holds its CTA for ${step.revealDelayMs}ms`,
        );
      }
    }
    for (const station of STATIONS) {
      for (const step of station.steps) {
        assert.ok(
          (step.revealDelayMs ?? 0) <= REVEAL_MAX,
          `${station.id}/${step.id} holds its CTA for ${step.revealDelayMs}ms`,
        );
      }
    }
  });

  test('the ending is authored and reads as a finale', () => {
    const { ending } = ENCHANTED_FOREST;
    assert.ok(ending.blocks.length >= 5, 'the ending has substance');
    assert.equal(ending.blocks.some((b) => b.text.includes('TODO')), false);
    assert.equal(ending.blocks[0]?.emphasis, 'title');
    assert.ok(ending.blocks[0]?.text.includes('הגעתם לסיום המסע'));
    assert.equal(ending.replayLabel, 'שחקו שוב');
    assert.ok(ending.speakerBackground, 'the elf remains visible while her farewell is spoken');
    assert.ok(ending.speaker, 'the farewell identifies its visible speaker');
  });

  /*
   * The exit scene was authored, exported and then never rendered: the farewell
   * pinned itself to `speakerBackground` so the elf could stay in frame, and
   * nothing switched away from her. The couple's last screen was the same picture
   * as their first sight of her. These two assertions are what make that
   * regression loud rather than invisible.
   */
  test('the journey ends on a scene the couple have not already finished on', () => {
    const { ending } = ENCHANTED_FOREST;
    assert.ok(ending.departure, 'the ending walks them out of the forest');
    assert.notEqual(
      ending.background,
      ending.speakerBackground,
      'the exit scene must not be the elf scene the farewell is spoken on',
    );
    assert.ok(isAssetAvailable(ending.background), 'the exit artwork is installed');
  });

  test('the farewell is not the thing that opens the feedback form', () => {
    const departure = ENCHANTED_FOREST.ending.departure;
    assert.ok(departure);
    // The tap that ends the elf's last line walks them out; the tap that opens
    // the survey belongs to the screen AFTER the story has landed.
    assert.ok(departure.enterLabel.length > 0);
    assert.ok(departure.ctaLabel.length > 0);
    assert.notEqual(departure.enterLabel, departure.ctaLabel);
    assert.equal(
      departure.enterLabel.includes('משוב'),
      false,
      'the romantic farewell must not end on a button that says "feedback"',
    );
    assert.ok(departure.blocks.length > 0, 'the exit scene says something');
    assert.equal(
      departure.blocks.some((b) => b.emphasis === 'title'),
      false,
      'the screen already carries a title in its crown',
    );
  });

  test('the speaking scenes present as bubbles', () => {
    for (const step of storyFlowById('story-elf')?.steps ?? []) {
      assert.equal(step.variant, 'bubble');
      assert.ok(step.tail, 'a tail keeps the bubble off the speaker');
    }
    const birdStep = STATIONS[0]?.steps[0];
    assert.ok(birdStep && birdStep.kind === 'brief');
    assert.equal(birdStep.presentation, 'bubble');
    // A delay holds back the CTA as well as the copy, so this is a budget with
    // two sides: long enough that the artwork registers first, short enough that
    // nobody meets a screen with no control on it and assumes the game is stuck.
    assert.ok((birdStep.revealDelayMs ?? 0) >= 800, 'the scene lands before the text');
    assert.ok((birdStep.revealDelayMs ?? 0) <= 1300, 'but the control cannot stay away this long');

    // Every bubble the bird speaks stays short enough to sit above it.
    for (const step of STATIONS[0]?.steps ?? []) {
      if (step.kind !== 'brief') continue;
      assert.equal(step.presentation, 'bubble');
      assert.ok(step.blocks.length <= 2, `${step.id} has ${step.blocks.length} lines`);
    }
  });
});

describe('copy stays within the layout it has to fit', () => {
  /*
   * These are budgets, not style rules. Every screen is a fixed frame with no
   * scrolling, so the only thing that can push Hebrew out of a bubble or off the
   * top of a landscape phone is the copy growing. The ceilings sit a little
   * above today's longest lines, measured against the rendered game at 320x568
   * and 568x320 — the two tightest viewports — so ordinary edits pass and an
   * edit that would overflow fails here instead of on someone's phone.
   */
  const BUBBLE_BLOCK_MAX = 190;
  const BUBBLE_TOTAL_MAX = 210;
  const PANEL_TOTAL_MAX = 160;
  const STORY_TOTAL_MAX = 290;

  const chars = (blocks: { text: string }[]) => blocks.reduce((n, b) => n + b.text.length, 0);

  test('no speech bubble carries more copy than a short viewport can show', () => {
    for (const station of STATIONS) {
      for (const step of station.steps) {
        // A reading panel has its own budget below; this one is the bubble's.
        if (step.kind === 'brief' && step.presentation !== 'bubble') continue;
        const blocks = stepBlocks(step);
        assert.ok(
          chars(blocks) <= BUBBLE_TOTAL_MAX,
          `${station.id}/${step.id}: ${chars(blocks)} characters exceeds the bubble budget`,
        );
        for (const block of blocks) {
          assert.ok(
            block.text.length <= BUBBLE_BLOCK_MAX,
            `${station.id}/${step.id}/${block.id}: one line of ${block.text.length} characters`,
          );
        }
      }
    }
  });

  test('no reading panel outgrows its frame', () => {
    for (const station of STATIONS) {
      for (const step of station.steps) {
        if (step.kind !== 'brief' || step.presentation === 'bubble') continue;
        assert.ok(
          chars(step.blocks) <= PANEL_TOTAL_MAX,
          `${station.id}/${step.id}: ${chars(step.blocks)} characters exceeds the panel budget`,
        );
      }
    }
  });

  test('no story screen outgrows its frame', () => {
    for (const flow of STORY_FLOWS) {
      for (const step of flow.steps) {
        assert.ok(
          chars(step.blocks) <= STORY_TOTAL_MAX,
          `${flow.id}/${step.id}: ${chars(step.blocks)} characters exceeds the story budget`,
        );
      }
    }
  });

  test('every station title fits the header beside the back control', () => {
    // Measured: the longest today is 15 characters and sits comfortably at 320px.
    for (const station of STATIONS) {
      assert.ok(
        station.titleHe.length <= 22,
        `${station.id}: a ${station.titleHe.length}-character title will wrap under the back button`,
      );
    }
  });
});
