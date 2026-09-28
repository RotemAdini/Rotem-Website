import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import type { StationStep } from '../types/content.ts';
import { STORY_FLOWS } from '../data/story.ts';
import { STATIONS } from '../data/stations.ts';
import { bubblePlacement, readsAsFlowingProse, stepIsGated, stepPlacement } from './layout.ts';

describe('text placement', () => {
  test('a bubble sits opposite its tail', () => {
    assert.equal(bubblePlacement('bottom-start'), 'top');
    assert.equal(bubblePlacement('bottom-end'), 'top');
    assert.equal(bubblePlacement('top-start'), 'bottom');
    assert.equal(bubblePlacement('top-end'), 'bottom');
    assert.equal(bubblePlacement(undefined), 'top', 'defaults to a downward tail');
  });

  test('reading panels always sit low', () => {
    const panel: StationStep = { kind: 'brief', id: 'p', blocks: [] };
    assert.equal(stepPlacement(panel), 'bottom');
    const quickfire: StationStep = { kind: 'quickfire', id: 'q', index: 1, total: 10, prompt: [] };
    assert.equal(stepPlacement(quickfire), 'bottom');
  });

  test("the elf's bubbles stay off her face", () => {
    // Her face is at 28-40% of the scene and the crystal at 48-56%, so her
    // words must come from below rather than covering her.
    const elf = STORY_FLOWS.find((f) => f.id === 'story-elf');
    assert.ok(elf);
    for (const step of elf.steps) {
      assert.equal(bubblePlacement(step.tail), 'bottom', step.id);
    }
  });

  test('only steps with something to complete gate the CTA', () => {
    const brief: StationStep = { kind: 'brief', id: 'b', blocks: [] };
    assert.equal(stepIsGated(brief), false, 'plain text never blocks');

    /*
     * The case the allowlist exists for. A quickfire question is interactive in
     * the room and inert on the phone: the question is on screen, the couple
     * point at each other, and there is nothing for the step to wait for. Under
     * the old 'anything that is not a brief' rule all ten of the gnome's
     * questions would have been stuck behind a CTA that never unlocked.
     */
    const quickfire: StationStep = { kind: 'quickfire', id: 'q', index: 1, total: 10, prompt: [] };
    assert.equal(stepIsGated(quickfire), false, 'nothing is hidden, so nothing is gated');

    const timer: StationStep = {
      kind: 'timer', id: 't', seconds: 60, intro: [], startLabel: '', skippable: true,
    };
    const tally: StationStep = {
      kind: 'tally', id: 'y', target: 4, intro: [], itemLabel: '',
    };
    for (const step of [timer, tally]) {
      assert.equal(stepIsGated(step), true, step.kind);
    }
  });

  test('every timer and tally in the game gates its step', () => {
    // This is what stops a tap forward from skipping a wait that has not run or
    // a count that has not been reached.
    for (const station of STATIONS) {
      for (const step of station.steps) {
        if (step.kind === 'timer' || step.kind === 'tally') {
          assert.equal(stepIsGated(step), true, `${station.id}/${step.id}`);
        }
      }
    }
  });

  test('none of the gnome\'s ten questions gates', () => {
    // Ten questions must cost exactly ten taps. A gate on any of them would add
    // a second tap per question to a round whose whole point is speed.
    const quickfire = STATIONS.flatMap((s) => s.steps).filter((s) => s.kind === 'quickfire');
    assert.equal(quickfire.length, 10);
    for (const step of quickfire) assert.equal(stepIsGated(step), false, step.id);
  });

  test("the bird's bubble stays off the bird", () => {
    // The bird sits at roughly 52-68%, low and to the left, so its words ride high.
    for (const step of STATIONS[0]?.steps ?? []) {
      assert.equal(stepPlacement(step), 'top');
    }
  });
});

describe('panel alignment', () => {
  test('a short panel stays centred', () => {
    assert.equal(
      readsAsFlowingProse([
        { text: 'ברוכים הבאים', emphasis: 'normal' },
        { text: 'נתחיל?', emphasis: 'normal' },
      ]),
      false,
    );
  });

  test('a real paragraph switches to the start edge', () => {
    assert.equal(readsAsFlowingProse([{ text: 'א'.repeat(151), emphasis: 'normal' }]), true);
  });

  test('a title does not count towards the measure', () => {
    assert.equal(readsAsFlowingProse([{ text: 'א'.repeat(300), emphasis: 'title' }]), false);
  });

  test('the story panels that used to run centred now flow', () => {
    // The lantern-path and forest-road steps are the longest in the game.
    const longest = STORY_FLOWS.flatMap((flow) => flow.steps)
      .filter((step) => step.variant !== 'bubble')
      .map((step) => step.blocks)
      .filter((blocks) => blocks.reduce((n, b) => n + b.text.length, 0) > 150);
    assert.ok(longest.length > 0, 'expected at least one long narrative panel');
    for (const blocks of longest) assert.equal(readsAsFlowingProse(blocks), true);
  });
});
