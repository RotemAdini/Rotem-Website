import type { StationStep } from '../../types/content.ts';
import { SpeechBubble } from '../ui/SpeechBubble.tsx';
import { TextPanel } from '../ui/TextPanel.tsx';
import { QuickfireStep } from './QuickfireStep.tsx';
import { TallyStep } from './TallyStep.tsx';
import { TimerStep } from './TimerStep.tsx';

export { stepPlacement, stepIsGated } from '../../utils/layout.ts';

interface StepRendererProps {
  step: StationStep;
  /** Interactive steps report when the couple may move on. */
  onReady: (ready: boolean) => void;
  /**
   * The station's single action dock. Interactive steps portal their control
   * into it so it never moves between states.
   */
  dock: HTMLElement | null;
}

/**
 * Renders one station step.
 *
 * The switch is exhaustive, so adding a step kind is a compile error until it is
 * handled here. A `brief` renders either as a reading panel or, when a character
 * in the artwork is speaking, as a speech bubble.
 *
 * Only the steps that gate take `onReady` and `dock`. Those two props exist so a
 * step can hold the station's single action dock until it is satisfied — start a
 * timer, count to four — and a step with nothing to be satisfied about does not
 * receive them.
 */
export function StepRenderer({ step, onReady, dock }: StepRendererProps) {
  switch (step.kind) {
    case 'brief':
      return step.presentation === 'bubble' ? (
        <SpeechBubble blocks={step.blocks} tail={step.tail ?? 'bottom-start'} />
      ) : (
        <TextPanel blocks={step.blocks} panel={step.panel} animate />
      );

    // No `onReady` and no dock: a quickfire question gates nothing and owns no
    // control, so the station's own Continue button is live from the first frame.
    case 'quickfire':
      return <QuickfireStep step={step} />;

    case 'timer':
      return <TimerStep step={step} onReady={onReady} dock={dock} />;

    case 'tally':
      return <TallyStep step={step} onReady={onReady} dock={dock} />;

    default: {
      const never: never = step;
      return never;
    }
  }
}
