import { useCallback, useEffect, useRef, useState } from 'react';
import type { AssetId, StoryFlowDef } from '../../types/content.ts';
import { useDelayedReveal } from '../../hooks/useDelayedReveal.ts';
import { bubblePlacement } from '../../utils/layout.ts';
import { ActionButton } from '../ui/ActionButton.tsx';
import { BackgroundImage } from '../ui/BackgroundImage.tsx';
import { SpeechBubble } from '../ui/SpeechBubble.tsx';
import { StepDots } from '../ui/StepDots.tsx';
import { TextPanel } from '../ui/TextPanel.tsx';
import { StageContent } from '../shell/GameStage.tsx';
import tokens from '../../styles/tokens.module.css';
import styles from './StoryFlow.module.css';

interface StoryFlowProps {
  flow: StoryFlowDef;
  step: number;
  onNext: () => void;
  /** Absent when there is nothing behind this screen — the very first one. */
  onBack?: (() => void) | undefined;
}

export function StoryFlow({ flow, step, onNext, onBack }: StoryFlowProps) {
  const current = flow.steps[Math.min(step, flow.steps.length - 1)];
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [readyAsset, setReadyAsset] = useState<AssetId | null>(null);
  const artReady = Boolean(current && readyAsset === current.background);
  const revealed = useDelayedReveal(current?.revealDelayMs, `${flow.id}:${step}`, artReady);
  const handleArtReady = useCallback((asset: AssetId) => setReadyAsset(asset), []);

  useEffect(() => {
    if (artReady) headingRef.current?.focus();
  }, [artReady, step]);

  if (!current) return null;
  const isBubble = current.variant === 'bubble';
  /*
   * A screen whose entire content IS its label — the elf's first appearance is
   * the only one — is a name card, not a caption. It announces her, so it is
   * shown high, large, and at once: a title that fades in after the viewer has
   * already started looking for it has missed its moment.
   */
  const isNameCard = Boolean(current.label) && current.blocks.length === 0;
  // The tail points at the speaker, so the bubble sits opposite it.
  const bubbleTail = current.tail ?? 'bottom-start';
  const bubbleAtTop = bubblePlacement(bubbleTail) === 'top';
  /*
   * Panels centre by default, which holds one cinematic grammar across the
   * opening sequence. A scene with someone IN it can ask for the room: the
   * picnic photograph puts the couple across the middle of the frame, where a
   * centred panel sat straight on top of them.
   */
  const anchorClass =
    current.panel?.anchor === 'top'
      ? styles.anchorTop
      : current.panel?.anchor === 'bottom'
        ? styles.anchorBottom
        : '';

  return (
    <>
      <BackgroundImage
        asset={current.background}
        focus="center top"
        priority
        onReady={handleArtReady}
      />
      <StageContent>
        <h1 ref={headingRef} tabIndex={-1} className={tokens.visuallyHidden}>
          {current.label ?? 'סיפור המסע'}
        </h1>

        <div className={styles.wrap}>
          {isBubble ? (
            <>
              {/* A name card leads; a caption follows what it labels. */}
              {isNameCard && revealed && (
                <p className={`${styles.label} ${styles.nameCard}`}>{current.label}</p>
              )}
              {/* Placed away from the speaker so the character stays visible. */}
              {!bubbleAtTop && <div className={styles.spacer} />}
              <div className={styles.bubbleSlot}>
                {revealed && <SpeechBubble blocks={current.blocks} tail={bubbleTail} />}
              </div>
              {current.label && !isNameCard && revealed && (
                <p className={styles.label}>{current.label}</p>
              )}
              {bubbleAtTop && <div className={styles.spacer} />}
            </>
          ) : (
            // Narrative panels are centred as a sequence, never per screen — unless
            // the scene underneath needs the room, which `panel.anchor` asks for.
            <div className={`${styles.panelSlot} ${anchorClass}`}>
              {revealed && (
                <TextPanel
                  blocks={current.blocks}
                  panel={current.panel}
                  align="center"
                  sheer
                  animate
                />
              )}
            </div>
          )}

          {/*
            Turning pages, not committing to anything: forward on the left, back
            on the right, the dots between them saying how far along this is. The
            single centred button it replaces could only ever go forwards, so a
            couple who tapped past a screen had to restart the whole opening to
            read it again.
          */}
          <nav className={`${styles.nav} ${revealed ? '' : styles.hidden}`} aria-label="ניווט בסיפור">
            <div className={styles.navBack}>
              {onBack && (
                <button
                  type="button"
                  className={styles.back}
                  onClick={onBack}
                  tabIndex={revealed ? 0 : -1}
                >
                  {/*
                    '›' is a bidi-MIRRORED character: inside this RTL run the
                    algorithm flips it, so the back control was drawing a
                    left-pointing chevron — forward — at the couple. U+2192 is
                    not mirrored and is the same glyph the station's back button
                    uses, so the two agree and both point back.
                  */}
                  <span className={styles.chevron} aria-hidden="true">
                    →
                  </span>
                  <span>חזרה</span>
                </button>
              )}
            </div>

            <StepDots total={flow.steps.length} current={step} />

            <div className={styles.navNext}>
              <ActionButton variant="quiet" onClick={onNext} tabIndex={revealed ? 0 : -1}>
                {current.ctaLabel ?? 'המשך'}
              </ActionButton>
            </div>
          </nav>
        </div>
      </StageContent>
    </>
  );
}
