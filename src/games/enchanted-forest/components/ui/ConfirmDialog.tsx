import { useEffect, useRef } from 'react';
import { ActionButton } from './ActionButton.tsx';
import styles from './ConfirmDialog.module.css';

interface ConfirmDialogProps {
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  /**
   * The control that asked for this dialog, so focus can go back to it.
   *
   * Passed in rather than read from `document.activeElement` here, because by
   * the time this component's effects run it is too late to look: the screen
   * behind the dialog is made `inert` in the same commit that mounts it, and
   * marking a focused element inert blurs it. `activeElement` is already
   * `<body>` on the first line of the first effect. The caller is the one place
   * that still knows, because it is holding the click.
   */
  returnFocusTo?: HTMLElement | null;
}

/**
 * Focus-trapped confirmation. Used before anything destructive, which in V1
 * means clearing saved progress.
 */
export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  returnFocusTo,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  /*
   * Open focus on the non-destructive choice, so a stray Enter cannot wipe
   * progress — and give it back to whatever opened the dialog on the way out.
   *
   * Without the second half, cancelling dropped focus to <body>: the couple
   * pressed Escape on "restart?" and the keyboard was back at the top of the
   * document instead of on the restart button they had just come from.
   *
   * `isConnected` is checked because confirming is the case where the opener is
   * NOT still there — restarting replaces the whole screen — and focusing a
   * detached node silently moves focus to <body>, which is the very bug this
   * exists to avoid. The screen that replaces it does its own focusing.
   */
  useEffect(() => {
    dialogRef.current?.querySelector<HTMLButtonElement>('[data-ef-autofocus]')?.focus();
    return () => {
      if (returnFocusTo?.isConnected) returnFocusTo.focus();
    };
  }, [returnFocusTo]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>('button');
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onCancel]);

  return (
    <div className={styles.backdrop} onClick={onCancel}>
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="ef-confirm-title"
        aria-describedby="ef-confirm-body"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="ef-confirm-title" className={styles.title}>
          {title}
        </h2>
        <p id="ef-confirm-body" className={styles.body}>
          {body}
        </p>
        <div className={styles.actions}>
          <ActionButton variant="danger" block onClick={onConfirm}>
            {confirmLabel}
          </ActionButton>
          <ActionButton data-ef-autofocus variant="secondary" block onClick={onCancel}>
            {cancelLabel}
          </ActionButton>
        </div>
      </div>
    </div>
  );
}
