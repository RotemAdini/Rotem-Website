import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AssetId, GameManifest, TextBlock } from '../../types/content.ts';
import { useDelayedReveal } from '../../hooks/useDelayedReveal.ts';
import { GAME_ID } from '../../constants.ts';
import { reportFeedbackSubmit } from '../../analytics/gameAnalytics.ts';
import { GameFeedbackForm } from '../../../../shared/feedback/GameFeedbackForm.tsx';
import { assetUrl } from '../../utils/assets.ts';
import { preloadImage } from '../../utils/imageLoading.ts';
import { ActionButton } from '../ui/ActionButton.tsx';
import { BackgroundImage } from '../ui/BackgroundImage.tsx';
import { SpeechBubble } from '../ui/SpeechBubble.tsx';
import { TextPanel } from '../ui/TextPanel.tsx';
import { StageContent } from '../shell/GameStage.tsx';
import styles from './EndingScreen.module.css';

interface EndingScreenProps {
  manifest: GameManifest;
  onReplay: () => void;
  onBackToMap: () => void;
}

/**
 * The four screens the journey ends on, in order.
 *
 *   farewell   the elf, in her clearing, saying goodbye over three beats
 *   departure  the overlook: they are out of the forest. The emotional finish.
 *   feedback   the rating form — after the story is over, never inside it
 *   complete   the overlook again, now with replay / back-to-map
 *
 * The split exists because of what the old three-phase version did: the last tap
 * of the elf's farewell was labelled 'למשוב קצר', so a couple who had just spent
 * an hour on this were sent from her final line straight into a product survey
 * with a 1000-character comment box. The story now finishes on its own screen,
 * and the survey follows it instead of ending it.
 */
type Phase = 'farewell' | 'departure' | 'feedback' | 'complete';

/** Group the ending copy into paced beats so it lands rather than dumps. */
function toBeats(blocks: TextBlock[]): TextBlock[][] {
  const body = blocks.filter((b) => b.emphasis !== 'title');
  const beats: TextBlock[][] = [];
  for (let i = 0; i < body.length; i += 2) {
    beats.push(body.slice(i, i + 2));
  }
  return beats;
}

/**
 * The elf's farewell, and the walk out of the forest.
 *
 * She opened the journey and she closes it. The copy was always hers — "אני כל
 * כך גאה בכם", "אני כאן תמיד, ביער הקסום" — so it is spoken, in the same bubble
 * the whole forest speaks through, on the scene where the couple first met her.
 * She stays in frame through the final first-person line, and then the scene
 * changes to the place she has been sending them all along.
 */
export function EndingScreen({ manifest, onReplay, onBackToMap }: EndingScreenProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const beats = useMemo(() => toBeats(manifest.ending.blocks), [manifest.ending.blocks]);
  const [beat, setBeat] = useState(0);
  const [phase, setPhase] = useState<Phase>('farewell');
  const isLast = beat >= beats.length - 1;
  const departure = manifest.ending.departure;

  // The farewell is written in the elf's first person, including its final
  // line, so she remains visibly present for every spoken beat. Everything after
  // it happens outside the forest, on the exit scene.
  const speakerBackground = manifest.ending.speakerBackground ?? manifest.ending.background;
  const exitBackground = manifest.ending.background;
  const background = phase === 'farewell' ? speakerBackground : exitBackground;
  const [readyAsset, setReadyAsset] = useState<AssetId | null>(null);
  const artReady = readyAsset === background;
  const handleArtReady = useCallback((asset: AssetId) => setReadyAsset(asset), []);

  /*
   * Warm the exit scene while the elf is still talking.
   *
   * It is a full-bleed photograph and the couple reach it on a single tap, so
   * without this the most important image in the game arrives as a blank screen
   * followed by a pop. Three beats of farewell is plenty of time to fetch it.
   */
  useEffect(() => {
    const url = assetUrl(exitBackground);
    if (url) void preloadImage(url, 'high', 0);
  }, [exitBackground]);

  /*
   * Hold the FIRST beat a moment so arriving feels like arriving, and hold the
   * exit scene the same way — it is the one picture in the ending that should be
   * looked at before it is read over.
   *
   * The delay used to be keyed on the beat and so re-ran on every one of them.
   * A reveal gates the action dock as well as the words, so each tap through the
   * farewell was followed by a second of blank screen with no control on it —
   * four dead pauses in the last thing the couple see.
   */
  const revealKey = phase === 'departure' || phase === 'complete' ? 'ending:exit' : `ending:${beat}`;
  const revealDelay = phase === 'farewell' ? (beat === 0 ? 1100 : 0) : phase === 'departure' ? 900 : 0;
  const revealed = useDelayedReveal(revealDelay, revealKey, artReady);

  useEffect(() => {
    if (artReady && phase !== 'feedback') headingRef.current?.focus();
  }, [artReady, phase]);

  const title = manifest.ending.blocks.find((b) => b.emphasis === 'title');
  const current = beats[Math.min(beat, beats.length - 1)] ?? [];

  // Without a departure scene authored, the farewell hands straight to feedback
  // exactly as it used to. The manifest decides; this component only renders it.
  const afterFarewell: Phase = departure ? 'departure' : 'feedback';
  const farewellLastLabel = departure?.enterLabel ?? 'למשוב קצר';
  const onExitScene = phase === 'departure' || phase === 'complete';

  return (
    <>
      <BackgroundImage
        asset={background}
        focus={phase === 'farewell' ? 'center top' : 'center'}
        priority
        onReady={handleArtReady}
      />
      <StageContent>
        <div className={`${styles.screen} ${phase === 'feedback' ? styles.feedbackScreen : ''}`}>
          <div className={styles.crown}>
            <p className={styles.eyebrow}>סוף המסע</p>
            <h1 ref={headingRef} tabIndex={-1} className={styles.title}>
              {title?.text ?? 'הגעתם לסיום המסע!'}
            </h1>
          </div>

          {/* Low, with the trail reaching up towards her — her face stays clear. */}
          <div
            className={[
              styles.body,
              phase === 'feedback' ? styles.feedbackBody : '',
              onExitScene ? styles.exitBody : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {phase === 'feedback' ? (
              <GameFeedbackForm
                gameId={GAME_ID}
                onSkip={() => setPhase('complete')}
                onContinue={() => setPhase('complete')}
                onResult={({ rating, result }) => reportFeedbackSubmit(rating, result)}
              />
            ) : onExitScene ? (
              departure && revealed ? (
                <TextPanel blocks={departure.blocks} align="center" sheer animate />
              ) : null
            ) : revealed ? (
              <SpeechBubble blocks={current} tail="top-start" speaker={manifest.ending.speaker} />
            ) : null}
          </div>

          {phase !== 'feedback' && (
            <div className={styles.footer}>
              {phase === 'farewell' && (
                <div className={styles.beats} aria-hidden="true">
                  {beats.map((_, index) => (
                    <span
                      key={index}
                      className={`${styles.beat} ${index <= beat ? styles.beatOn : ''}`}
                    />
                  ))}
                </div>
              )}

              {phase === 'farewell' ? (
                <div className={`${styles.ctaSlot} ${revealed ? '' : styles.hidden}`}>
                  {isLast ? (
                    <ActionButton
                      block
                      onClick={() => setPhase(afterFarewell)}
                      tabIndex={revealed ? 0 : -1}
                    >
                      {farewellLastLabel}
                    </ActionButton>
                  ) : (
                    <ActionButton
                      variant="quiet"
                      onClick={() => setBeat((b) => b + 1)}
                      tabIndex={revealed ? 0 : -1}
                    >
                      המשך
                    </ActionButton>
                  )}
                </div>
              ) : phase === 'departure' ? (
                /*
                 * One button, and it is the only thing on this screen.
                 *
                 * The brief asked for the feedback to stay hard to miss without
                 * being the thing that ends the romance, so it is a full-width
                 * primary control rather than a link the couple can drift past —
                 * but it arrives after the story has already landed, and it says
                 * what it does.
                 */
                <div className={`${styles.ctaSlot} ${revealed ? '' : styles.hidden}`}>
                  <ActionButton
                    block
                    onClick={() => setPhase('feedback')}
                    tabIndex={revealed ? 0 : -1}
                  >
                    {departure?.ctaLabel ?? 'ספרו לנו איך היה'}
                  </ActionButton>
                </div>
              ) : (
                <div className={styles.completionActions}>
                  <ActionButton block onClick={onReplay}>
                    {manifest.ending.replayLabel}
                  </ActionButton>
                  {/* Going back to the map is not going onward: no arrow. */}
                  <ActionButton variant="quiet" arrow={false} onClick={onBackToMap}>
                    חזרה למפה
                  </ActionButton>
                </div>
              )}
            </div>
          )}
        </div>
      </StageContent>
    </>
  );
}
