import type { ReactNode } from 'react';
import tokens from '../../styles/tokens.module.css';
import styles from './GameStage.module.css';

interface GameStageProps {
  children: ReactNode;
}

/**
 * Owns the visual frame and the token scope.
 *
 * `dir="rtl"` and `lang="he"` are set here rather than on <html>, so the module
 * works inside a host page of any direction without touching global styles.
 */
export function GameStage({ children }: GameStageProps) {
  return (
    <div className={`${tokens.gameRoot} ${styles.root}`} dir="rtl" lang="he">
      <div className={styles.frame}>{children}</div>
    </div>
  );
}

export function StageContent({ children }: GameStageProps) {
  return <div className={styles.content}>{children}</div>;
}

export function StageMessage({ children }: GameStageProps) {
  return <div className={styles.loading}>{children}</div>;
}
