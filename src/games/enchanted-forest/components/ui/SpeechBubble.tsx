import type { BubbleTail, TextBlock } from '../../types/content.ts';
import styles from './SpeechBubble.module.css';

interface SpeechBubbleProps {
  blocks: TextBlock[];
  tail?: BubbleTail;
  animate?: boolean;
  /** Named only where the speaker is not obvious from the scene. */
  speaker?: string | undefined;
}

const TAIL_CLASS: Record<Exclude<BubbleTail, 'none'>, string> = {
  'bottom-start': styles.bottomStart!,
  'bottom-end': styles.bottomEnd!,
  'top-start': styles.topStart!,
  'top-end': styles.topEnd!,
};

const EMPHASIS_CLASS = {
  normal: styles.line,
  small: `${styles.line} ${styles.lineSmall}`,
  title: `${styles.line} ${styles.lineTitle}`,
} as const;

export function SpeechBubble({
  blocks,
  tail = 'bottom-start',
  animate = true,
  speaker,
}: SpeechBubbleProps) {
  if (blocks.length === 0) return null;
  const tailClass = tail === 'none' ? '' : (TAIL_CLASS[tail] ?? '');

  return (
    <div className={[styles.bubble, tailClass, animate ? styles.enter : ''].filter(Boolean).join(' ')}>
      {speaker && <p className={styles.speaker}>{speaker}</p>}
      {blocks.map((block) => (
        <p key={block.id} className={EMPHASIS_CLASS[block.emphasis ?? 'normal']}>
          {block.text}
        </p>
      ))}
      {tail !== 'none' && (
        <>
          <span className={styles.tail} aria-hidden="true" />
          <span className={styles.tailInner} aria-hidden="true" />
        </>
      )}
    </div>
  );
}
