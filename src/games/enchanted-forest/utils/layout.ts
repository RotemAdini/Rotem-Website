/**
 * Where text sits on a scene, derived from the content — pure and testable.
 *
 * The rule: a speech bubble is placed OPPOSITE its tail, because the tail always
 * points at the speaker. A downward tail means the character is below, so the
 * bubble rides at the top; an upward tail means the bubble sits low.
 *
 * This is what keeps a character's face clear. For example the elf's face sits
 * at 28-40% of her scene and her glowing crystal at 48-56%, so her bubbles use
 * an upward tail and sit low over the leaf dress instead.
 */

import type { BubbleTail, StationStep, TextBlock } from '../types/content.ts';

export type TextPlacement = 'top' | 'bottom';

export function bubblePlacement(tail: BubbleTail | undefined): TextPlacement {
  return (tail ?? 'bottom-start').startsWith('top') ? 'bottom' : 'top';
}

/**
 * True when a step holds the CTA until the couple interacts with it.
 *
 * An allowlist rather than "anything that is not a brief", which is what this
 * used to be. A gate exists to stop a tap forward skipping something the couple
 * have not done yet: a timer that has not run, a tally that has not reached its
 * target. It is not a tax on every step that happens to be interactive.
 *
 * `quickfire` is the case that forced the distinction. Its question is on screen
 * the moment the step opens and there is nothing to unlock — the couple point at
 * each other and move on — so under the old rule every one of the ten questions
 * would have been permanently stuck behind a CTA that never appeared.
 */
export function stepIsGated(step: StationStep): boolean {
  return step.kind === 'timer' || step.kind === 'tally';
}

/** Reading panels always sit low; bubbles follow `bubblePlacement`. */
export function stepPlacement(step: StationStep): TextPlacement {
  if (step.kind !== 'brief' || step.presentation !== 'bubble') return 'bottom';
  return bubblePlacement(step.tail);
}

/**
 * True when a panel's copy is long enough that centring it hurts.
 *
 * Centred text is comfortable for a title or a line or two. Past roughly two
 * full lines the reader has to search for the start of every line, which in
 * Hebrew is the right edge — the story panels were running six to eight centred
 * lines. The threshold is measured in characters rather than blocks, so a panel
 * of three short exclamations stays centred while one long paragraph does not.
 */
const FLOWING_PROSE_CHARS = 150;

export function readsAsFlowingProse(blocks: Pick<TextBlock, 'text' | 'emphasis'>[]): boolean {
  const body = blocks.filter((block) => block.emphasis !== 'title');
  if (body.length === 0) return false;
  const chars = body.reduce((total, block) => total + block.text.length, 0);
  return chars > FLOWING_PROSE_CHARS;
}
