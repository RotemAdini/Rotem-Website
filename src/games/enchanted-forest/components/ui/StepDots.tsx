import styles from './StepDots.module.css';

interface StepDotsProps {
  total: number;
  current: number;
  label?: string;
}

/** Visual step indicator. The real count is exposed as text for screen readers. */
export function StepDots({ total, current, label = 'שלב' }: StepDotsProps) {
  if (total <= 1) return null;
  return (
    <div className={styles.dots} role="group" aria-label={`${label} ${current + 1} מתוך ${total}`}>
      {Array.from({ length: total }, (_, index) => (
        <span
          key={index}
          className={[
            styles.dot,
            index === current ? styles.active : '',
            index < current ? styles.done : '',
          ]
            .filter(Boolean)
            .join(' ')}
        />
      ))}
    </div>
  );
}
