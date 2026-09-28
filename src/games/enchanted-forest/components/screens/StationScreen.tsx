import { useCallback, useEffect, useRef, useState } from 'react';
import type { AssetId, Station } from '../../types/content.ts';
import { useDelayedReveal } from '../../hooks/useDelayedReveal.ts';
import { StepRenderer, stepIsGated, stepPlacement } from '../steps/StepRenderer.tsx';
import { ActionButton } from '../ui/ActionButton.tsx';
import { BackgroundImage } from '../ui/BackgroundImage.tsx';
import { StepDots } from '../ui/StepDots.tsx';
import { StageContent } from '../shell/GameStage.tsx';
import styles from './StationScreen.module.css';

interface StationScreenProps {
  station: Station;
  step: number;
  /** 'revisit' when the station is already complete — see decision B1. */
  mode: 'play' | 'revisit';
  onNextStep: () => void;
  onComplete: () => void;
  onBack: () => void;
}

export function StationScreen({
  station,
  step,
  mode,
  onNextStep,
  onComplete,
  onBack,
}: StationScreenProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  /*
   * One action dock, in one place, for the whole station.
   *
   * Interactive steps portal their control into it instead of rendering it
   * inside the step body — where a control sat above copy that could change
   * height, so the button jumped under the couple's thumb whenever the step
   * grew. The content above the dock may change freely; the dock never moves.
   */
  const [dock, setDock] = useState<HTMLDivElement | null>(null);

  const index = Math.min(step, station.steps.length - 1);
  const current = station.steps[index];
  const isLastStep = index >= station.steps.length - 1;
  const [readyAsset, setReadyAsset] = useState<AssetId | null>(null);
  const artReady = readyAsset === station.background;
  const revealed = useDelayedReveal(current?.revealDelayMs, `${station.id}:${index}`, artReady);
  const handleArtReady = useCallback((asset: AssetId) => setReadyAsset(asset), []);

  // Timers and tallies hold the CTA until they are satisfied. Reset on every
  // step change, so the next gated step starts locked again.
  const gated = current ? stepIsGated(current) : false;
  const [stepReady, setStepReady] = useState(!gated);
  useEffect(() => {
    setStepReady(!gated);
  }, [gated, station.id, index]);
  const handleReady = useCallback((ready: boolean) => setStepReady(ready), []);

  /*
   * When a gate opens, the control it was holding takes the focus.
   *
   * A gated step owns the dock until it is satisfied — the timer's start and
   * skip buttons, the tally's counter — and the moment it IS satisfied that
   * control disappears and the station's CTA takes its place. Two different
   * elements in one slot, so the browser drops focus to <body> in between: the
   * couple finish a three-minute wait, or the fourth kiss, and the keyboard is
   * back at the top of the document with the button they need announced to
   * nobody.
   *
   * Only fires on the false → true edge of a gate, so a step that was never
   * gated does not have its CTA stolen out from under the reader on arrival.
   */
  const ctaRef = useRef<HTMLButtonElement>(null);
  const wasGateShut = useRef(false);
  useEffect(() => {
    if (stepReady && wasGateShut.current) ctaRef.current?.focus();
    wasGateShut.current = !stepReady;
  }, [stepReady]);

  useEffect(() => {
    if (artReady) headingRef.current?.focus();
  }, [artReady, station.id]);

  if (!current) return null;

  // Bubbles sit at the top so the speaking character below stays visible;
  // reading panels sit low, letting the artwork breathe above them.
  const placement = stepPlacement(current);

  // The completion CTA appears only on the last step (decision B2). On a revisit
  // it reads 'חזרה למפה', because the station is already done.
  const ctaLabel = isLastStep
    ? mode === 'revisit'
      ? station.completion.revisitLabel
      : station.completion.label
    : (current.ctaLabel ?? 'המשך');

  return (
    <>
      <BackgroundImage
        asset={station.background}
        focus="center"
        priority
        onReady={handleArtReady}
      />
      <StageContent>
        <div className={styles.screen}>
          <header className={styles.header}>
            <button
              type="button"
              className={styles.back}
              onClick={onBack}
              aria-label="חזרה למפה בלי לסיים את התחנה"
            >
              {/*
                Back, in Hebrew, points RIGHT. This read '←' — the identical
                glyph the station's own Continue button uses for forward — so
                the one control that leaves the station was drawn as the one
                that advances it. U+2192 is not bidi-mirrored, so it renders as
                a right arrow here rather than being flipped to agree with the
                surrounding direction.
              */}
              <span aria-hidden="true">→</span>
            </button>
            <div className={styles.titleBlock}>
              <h1 ref={headingRef} tabIndex={-1} className={styles.heading}>
                {station.titleHe}
              </h1>
              {mode === 'revisit' && <p className={styles.revisitTag}>ביקור חוזר</p>}
            </div>
          </header>

          <div
            className={`${styles.body} ${placement === 'top' ? styles.bodyTop : styles.bodyBottom}`}
          >
            {revealed && (
              // Keyed so every step remounts: timers and tallies reset rather
              // than leaking across steps or revisits.
              <StepRenderer
                key={`${station.id}:${index}`}
                step={current}
                onReady={handleReady}
                dock={dock}
              />
            )}
            {placement === 'top' && <div className={styles.spacer} />}
          </div>

          <div className={styles.footer}>
            <StepDots total={station.steps.length} current={index} />
            <div className={`${styles.ctaSlot} ${revealed ? '' : styles.hidden}`} ref={setDock}>
              {/* The step owns the dock until it is satisfied; then the CTA does. */}
              {stepReady && (
                <ActionButton
                  ref={ctaRef}
                  variant={isLastStep ? 'primary' : 'quiet'}
                  block={isLastStep}
                  onClick={isLastStep ? onComplete : onNextStep}
                  tabIndex={revealed ? 0 : -1}
                >
                  {ctaLabel}
                </ActionButton>
              )}
            </div>
          </div>
        </div>
      </StageContent>
    </>
  );
}
