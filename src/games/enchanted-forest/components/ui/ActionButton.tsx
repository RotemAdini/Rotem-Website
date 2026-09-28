import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react';
import styles from './ActionButton.module.css';

interface ActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * `quiet` is story navigation — turning a page, not committing to anything.
   * Everything a station actually asks of the couple stays `primary`.
   */
  variant?: 'primary' | 'secondary' | 'danger' | 'quiet';
  block?: boolean;
  /**
   * Whether a `quiet` control draws the forward arrow.
   *
   * The arrow used to be part of the variant, which meant every quiet control
   * got one whether or not it went forwards: "דלגו על ההמתנה" and the ending's
   * "חזרה למפה" both pointed onward while doing something else entirely — one
   * skips a wait, the other goes back. The arrow belongs to the *direction* of
   * an action, not to how loud it is, so it is a prop. It stays on by default
   * because turning the page is what `quiet` is nearly always for.
   */
  arrow?: boolean;
  children: ReactNode;
  ref?: Ref<HTMLButtonElement>;
}

/** A real <button>: keyboard-operable and announced correctly, never a styled div. */
export function ActionButton({
  variant = 'primary',
  block = false,
  arrow = true,
  children,
  className,
  ref,
  ...rest
}: ActionButtonProps) {
  const classes = [
    styles.button,
    variant === 'secondary' ? styles.secondary : '',
    variant === 'danger' ? styles.danger : '',
    variant === 'quiet' ? styles.quiet : '',
    block ? styles.block : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button type="button" className={classes} ref={ref} {...rest}>
      {children}
      {variant === 'quiet' && arrow && (
        /*
         * Forward, in Hebrew, is leftwards. U+2190 is not a bidi-mirrored
         * character, so it renders as a left arrow in this RTL context rather
         * than being flipped by the algorithm — which is exactly why it, and
         * not a chevron, is the glyph used for direction across the game.
         */
        <span className={styles.quietArrow} aria-hidden="true">
          ←
        </span>
      )}
    </button>
  );
}
