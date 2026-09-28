import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { TallyStep as TallyStepDef } from '../../types/content.ts';
import { ActionButton } from '../ui/ActionButton.tsx';
import { SpeechBubble } from '../ui/SpeechBubble.tsx';
import styles from './TallyStep.module.css';

interface TallyStepProps {
  step: TallyStepDef;
  onReady: (ready: boolean) => void;
  /** The station's action dock — the counter button lives there, not here. */
  dock: HTMLElement | null;
}

/** Count-to-N tracker. The count is transient and never persisted. */
export function TallyStep({ step, onReady, dock }: TallyStepProps) {
  const [count, setCount] = useState(0);
  const done = count >= step.target;

  useEffect(() => {
    onReady(done);
  }, [done, onReady]);

  return (
    <div className={styles.wrap}>
      <SpeechBubble blocks={step.intro} tail="bottom-start" />

      <ul className={styles.counter}>
        {Array.from({ length: step.target }, (_, index) => (
          <li
            key={index}
            className={`${styles.pip} ${index < count ? styles.pipDone : ''}`}
            aria-hidden="true"
          >
            {index < count ? '✓' : ''}
          </li>
        ))}
      </ul>

      <p className={styles.count} aria-live="polite">
        {count} מתוך {step.target}
      </p>

      {!done &&
        dock &&
        createPortal(
          <ActionButton block onClick={() => setCount((c) => c + 1)}>
            {step.itemLabel}
          </ActionButton>,
          dock,
        )}
    </div>
  );
}
