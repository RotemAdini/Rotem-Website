import type { PanelLayout, TextBlock } from '../../types/content.ts';
import { readsAsFlowingProse } from '../../utils/layout.ts';
import styles from './TextPanel.module.css';

interface TextPanelProps {
  blocks: TextBlock[];
  panel?: PanelLayout | undefined;
  id?: string;
  animate?: boolean;
  /**
   * `center` holds the cinematic composition of the opening sequence, where a
   * consistent grammar across consecutive screens matters more than the reading
   * comfort of one long paragraph. `auto` lets the copy decide.
   */
  align?: 'auto' | 'center';
  /** Half-opacity glass, for screens where the artwork under the words matters. */
  sheer?: boolean;
}

/**
 * The rounded panel the whole game reads from. Recreated in CSS rather than
 * exported from Canva so the Hebrew stays live text — selectable, scalable and
 * reachable by a screen reader.
 */
export function TextPanel({
  blocks,
  panel,
  id,
  animate = false,
  align = 'auto',
  sheer = false,
}: TextPanelProps) {
  if (blocks.length === 0) return null;
  const flowing = align === 'auto' && readsAsFlowingProse(blocks);
  const classes = [
    styles.panel,
    panel?.tone === 'olive' ? styles.olive : '',
    flowing ? styles.flowing : '',
    align === 'center' ? styles.centred : '',
    sheer ? styles.sheer : '',
    animate ? styles.enter : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} id={id}>
      {blocks.map((block) => (
        <p key={block.id} className={`${styles.block} ${styles[block.emphasis ?? 'normal']}`}>
          {block.text}
        </p>
      ))}
    </div>
  );
}
