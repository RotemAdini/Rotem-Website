import type { QuickfireStep as QuickfireStepDef } from '../../types/content.ts';
import { SpeechBubble } from '../ui/SpeechBubble.tsx';
import styles from './QuickfireStep.module.css';

interface QuickfireStepProps {
  step: QuickfireStepDef;
}

/**
 * One question of the gnome's rapid-fire round.
 *
 * Deliberately the thinnest step in the game: a counter and a question, and the
 * station's own CTA carries them to the next one. There is no state here at all
 * — no selection, no answer, no score. The couple count to three and point at
 * each other; the phone's whole job is to show the question and get out of the
 * way, and anything it recorded would turn "who is more romantic" into a result
 * one of them lost.
 *
 * That is also why it does not report readiness like the riddle it replaced: it
 * has nothing to be ready for, so `stepIsGated` excludes it and the Continue
 * button is live from the first frame. Ten questions, ten taps.
 */
export function QuickfireStep({ step }: QuickfireStepProps) {
  return (
    <div className={styles.wrap}>
      <span className={styles.index}>
        שאלה {step.index} מתוך {step.total}
      </span>

      <SpeechBubble blocks={step.prompt} tail="bottom-start" />
    </div>
  );
}
