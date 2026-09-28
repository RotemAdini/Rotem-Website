/**
 * The journey as an ordered list, rather than as arithmetic.
 *
 * Progression used to be `order + 1`: station identity and station *order of
 * play* were the same number, so re-ordering the journey would have meant
 * renumbering the stations — and with them every asset id, every map position
 * and every saved game. They are now two different things:
 *
 *   • `order` (1..18) is a station's permanent identity. Never changes.
 *   • `PROGRESSION_SEQUENCE` is the route through them. Data, editable.
 *
 * Everything here is pure and content-free, like the rest of `state/`. The
 * sequence is injectable so tests can pin an arrangement instead of tracking
 * whatever the live journey happens to be.
 */

import { PROGRESSION_SEQUENCE, TOTAL_STATIONS } from '../constants.ts';

export type Sequence = readonly number[];

export const DEFAULT_SEQUENCE: Sequence = PROGRESSION_SEQUENCE;

/** Position of a station in the journey, 0-based. `-1` when it is not in it. */
export function sequenceIndex(order: number, sequence: Sequence = DEFAULT_SEQUENCE): number {
  return sequence.indexOf(order);
}

/**
 * The station's number as the couple count it: its 1-based place in the journey.
 *
 * This — never `order` — is what any number shown to a player must come from.
 * `order` is permanent identity, and the two stopped agreeing the moment the
 * journey was re-ordered: the third station they walk into is 'גמד הכימיה',
 * whose `order` is 2, so the map and the completion toast both called it
 * "תחנה 2" while it was plainly their third stop. Identity belongs in the data;
 * the count belongs to the walk.
 *
 * Falls back to `order` for a station outside the sequence, so a hand-edited
 * journey degrades to the old numbering rather than rendering "תחנה 0".
 */
export function journeyNumber(order: number, sequence: Sequence = DEFAULT_SEQUENCE): number {
  const index = sequenceIndex(order, sequence);
  return index < 0 ? order : index + 1;
}

/** The station played immediately after `order`, or `null` at the end of the journey. */
export function nextInSequence(
  order: number,
  sequence: Sequence = DEFAULT_SEQUENCE,
): number | null {
  const index = sequenceIndex(order, sequence);
  if (index < 0) return null;
  return sequence[index + 1] ?? null;
}

/** The station played immediately before `order`, or `null` at the trailhead. */
export function previousInSequence(
  order: number,
  sequence: Sequence = DEFAULT_SEQUENCE,
): number | null {
  const index = sequenceIndex(order, sequence);
  if (index <= 0) return null;
  return sequence[index - 1] ?? null;
}

/** The first station of the journey. */
export function firstInSequence(sequence: Sequence = DEFAULT_SEQUENCE): number {
  return sequence[0] ?? 1;
}

/**
 * The station a player with this completed set should be standing on.
 *
 * This is the *only* definition of `currentStation` in the codebase. Deriving it
 * from the completed set rather than storing a pointer is what makes revisits
 * inert and a corrupted save self-repairing: replaying station 3 while standing
 * on 13 adds nothing to the set, so the answer here does not move.
 *
 * Returns `totalStations + 1` — the "journey finished" sentinel — when every
 * station in the sequence is done.
 */
export function nextOpenStation(
  completedStations: readonly number[],
  sequence: Sequence = DEFAULT_SEQUENCE,
  totalStations: number = TOTAL_STATIONS,
): number {
  const done = new Set(completedStations);
  for (const order of sequence) {
    if (!done.has(order)) return order;
  }
  return totalStations + 1;
}

/**
 * Structural check on a sequence: a permutation of 1..totalStations.
 *
 * Exported so both the test suite and the manifest validator can refuse a
 * hand-edited sequence that would strand a station as permanently unreachable.
 */
export function validateSequence(
  sequence: Sequence = DEFAULT_SEQUENCE,
  totalStations: number = TOTAL_STATIONS,
): string[] {
  const errors: string[] = [];
  if (sequence.length !== totalStations) {
    errors.push(`Sequence has ${sequence.length} entries, expected ${totalStations}`);
  }
  const seen = new Set<number>();
  for (const order of sequence) {
    if (!Number.isInteger(order) || order < 1 || order > totalStations) {
      errors.push(`Sequence contains an out-of-range station: ${order}`);
      continue;
    }
    if (seen.has(order)) errors.push(`Sequence contains station ${order} twice`);
    seen.add(order);
  }
  for (let order = 1; order <= totalStations; order += 1) {
    if (!seen.has(order)) errors.push(`Sequence is missing station ${order}`);
  }
  return errors;
}
