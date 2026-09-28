import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { TimerStep as TimerStepDef } from '../../types/content.ts';
import { createTimerSignal, type TimerSignal } from '../../utils/timerSignal.ts';
import { ActionButton } from '../ui/ActionButton.tsx';
import { SpeechBubble } from '../ui/SpeechBubble.tsx';
import styles from './TimerStep.module.css';

interface TimerStepProps {
  step: TimerStepDef;
  onReady: (ready: boolean) => void;
  /** The station's action dock — start and skip live there, not here. */
  dock: HTMLElement | null;
}

const RADIUS = 46;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * Shortest wait worth telling the couple to stop watching the screen for.
 *
 * Above it the advice changes what they do with the phone; below it the wait is
 * over before the sentence has been read. The gnome's ten-second toll is the
 * only step under this line today.
 */
const HANDS_FREE_SECONDS = 30;

function format(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * A countdown for the two missions the PDF times: three minutes of silent eye
 * contact (station 14) and one minute of kissing (station 18).
 *
 * Driven by wall-clock time rather than a tick counter, so it stays accurate if
 * the phone sleeps or the tab is backgrounded. Nothing is persisted — leaving
 * and returning starts the timer over.
 *
 * Reaching zero is announced three ways at once, because the whole point of both
 * of these stations is that nobody is looking at the screen: a chime, a short
 * vibration, and the visible finished state below. See `utils/timerSignal.ts`
 * for why the audio has to be armed by the start tap.
 *
 * The signal deliberately does NOT respect `prefers-reduced-motion`. That setting
 * is about vestibular safety — visual movement — and silencing the one cue that
 * works with your eyes closed would remove an accessibility feature in the name
 * of accessibility. The visual side of this step already honours it: nothing
 * here animates, and the ring is a static arc.
 */
export function TimerStep({ step, onReady, dock }: TimerStepProps) {
  const [remaining, setRemaining] = useState(step.seconds);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const endsAt = useRef<number | null>(null);
  const signal = useRef<TimerSignal | null>(null);
  /** The notice a non-skippable wait shows where its start button used to be. */
  const waitingRef = useRef<HTMLParagraphElement>(null);
  /*
   * The countdown is polled twice a second, and a re-render can run `tick` again
   * on an interval that has already reached zero. The chime is a one-shot per
   * visit, so it is guarded here rather than inferred from `finished`.
   */
  const fired = useRef(false);

  if (signal.current === null) signal.current = createTimerSignal();

  useEffect(() => {
    return () => {
      signal.current?.dispose();
      signal.current = null;
    };
  }, []);

  useEffect(() => {
    onReady(finished);
  }, [finished, onReady]);

  /*
   * Hand focus to the waiting notice when a non-skippable wait begins.
   *
   * Only ever moves focus that this step's own control just lost — the notice
   * exists exactly where the start button was, and only renders once the couple
   * have pressed it. A skippable wait needs none of this: its start button is
   * replaced by another button in the same slot, which React reconciles into the
   * same DOM node, so focus never leaves.
   *
   * Nothing is trapped here. The notice is `tabIndex={-1}` — reachable by this
   * one programmatic move and never by Tab — so the very next Tab leaves it for
   * the station's own controls.
   */
  useEffect(() => {
    if (!running || finished || step.skippable) return;
    waitingRef.current?.focus();
  }, [running, finished, step.skippable]);

  useEffect(() => {
    if (!running) return;
    const tick = () => {
      if (endsAt.current === null) return;
      const left = Math.max(0, Math.ceil((endsAt.current - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0) {
        if (!fired.current) {
          fired.current = true;
          signal.current?.fire();
        }
        setRunning(false);
        setFinished(true);
      }
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [running]);

  const start = useCallback(() => {
    // Inside the tap, which is the only moment a browser will let audio start.
    signal.current?.prime();
    fired.current = false;
    endsAt.current = Date.now() + step.seconds * 1000;
    setRemaining(step.seconds);
    setRunning(true);
  }, [step.seconds]);

  /*
   * Skipping stops the clock as well as unlocking the step.
   *
   * Leaving `running` true would keep the interval alive, and it would then reach
   * zero and chime at a couple who had already moved past the wait — the one
   * place a completion sound would be actively wrong.
   *
   * `setRemaining(0)` is what makes the dial agree with the words. Skipping used
   * to leave the clock wherever it had got to, so the screen read "2:54" beside
   * "הזמן הסתיים" — a stopped countdown next to a line saying the countdown was
   * over. The wait IS over once it is skipped; the dial should say so.
   */
  const skip = useCallback(() => {
    fired.current = true;
    endsAt.current = null;
    setRemaining(0);
    setRunning(false);
    setFinished(true);
  }, []);

  const progress = step.seconds === 0 ? 1 : (step.seconds - remaining) / step.seconds;

  return (
    <div className={styles.wrap}>
      <SpeechBubble blocks={step.intro} tail="bottom-start" />

      <div className={styles.dial}>
        <svg className={styles.ring} viewBox="0 0 100 100" aria-hidden="true">
          <circle className={styles.ringTrack} cx="50" cy="50" r={RADIUS} />
          <circle
            className={styles.ringFill}
            cx="50"
            cy="50"
            r={RADIUS}
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
          />
        </svg>
        {/* Announced only at the end: a per-second live region would be unbearable. */}
        <p className={styles.time}>{format(remaining)}</p>
      </div>

      {/*
        Said out loud, because it changes what the couple do with the phone.
        Without it they watch the countdown — which is the one thing a long wait
        asks them not to do.

        Only on a long wait, though. Telling someone to put the phone down for
        ten seconds is a sentence that takes longer to read than the wait it is
        about; on the gnome's toll the countdown is over before the advice could
        be acted on. The chime still fires at every length.
      */}
      {running && !finished && step.seconds >= HANDS_FREE_SECONDS && (
        <p className={styles.handsFree}>הניחו את הטלפון. נודיע לכם כשנגמר.</p>
      )}

      {/*
        Keep one empty status container mounted for the timer's whole lifetime.
        Completion is now a text update inside an existing live region, which
        assistive technology announces reliably without a duplicate aria-live.
      */}
      <p className={finished ? styles.done : styles.statusQuiet} role="status">
        {finished ? 'הזמן הסתיים — אפשר להמשיך' : ''}
      </p>

      {!finished &&
        dock &&
        createPortal(
          running ? (
            step.skippable ? (
              /* Skipping a wait is not turning a page, so it draws no arrow. */
              <ActionButton variant="quiet" arrow={false} onClick={skip}>
                דלגו על ההמתנה
              </ActionButton>
            ) : (
              /*
               * The one control-less state in the game, and so the one place
               * keyboard focus had nowhere to go.
               *
               * A non-skippable wait replaces its own start button with this
               * line, and a button that unmounts takes focus to <body> with it —
               * the couple's place in the page was lost for the whole of the
               * gnome's ten seconds, and the CTA that arrived afterwards was
               * announced to nobody because nothing was focused near it.
               * Focusing the notice keeps the reading position exactly where the
               * action was, and says what is happening while it happens.
               */
              <p ref={waitingRef} tabIndex={-1} className={styles.waiting}>
                הישארו ברגע הזה…
              </p>
            )
          ) : (
            <ActionButton block onClick={start}>
              {step.startLabel}
            </ActionButton>
          ),
          dock,
        )}
    </div>
  );
}
