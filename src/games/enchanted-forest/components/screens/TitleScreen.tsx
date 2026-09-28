import { useCallback, useEffect, useRef, useState } from 'react';
import type { AssetId, GameManifest } from '../../types/content.ts';
import type { Progress } from '../../types/state.ts';
import { completedCount, hasResumableProgress } from '../../state/progress.ts';
import { ActionButton } from '../ui/ActionButton.tsx';
import { BackgroundImage } from '../ui/BackgroundImage.tsx';
import { StageContent } from '../shell/GameStage.tsx';
import styles from './TitleScreen.module.css';

interface TitleScreenProps {
  manifest: GameManifest;
  progress: Progress;
  onStartNew: () => void;
  onResume: () => void;
  storageUnavailable: boolean;
}

export function TitleScreen({
  manifest,
  progress,
  onStartNew,
  onResume,
  storageUnavailable,
}: TitleScreenProps) {
  const canResume = hasResumableProgress(progress);
  const done = completedCount(progress);
  const [readyAsset, setReadyAsset] = useState<AssetId | null>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const artReady = readyAsset === manifest.title.background;
  const handleArtReady = useCallback((asset: AssetId) => setReadyAsset(asset), []);

  useEffect(() => {
    if (!artReady) return;
    titleRef.current?.focus();
  }, [artReady]);

  return (
    <>
      <BackgroundImage
        asset={manifest.title.background}
        priority
        onReady={handleArtReady}
      />
      {artReady && (
        <StageContent>
          <div className={styles.wrap}>
            <div className={`${styles.band} ${styles.enter}`}>
              {/*
                The title carries this screen on its own. The tagline that used to
                sit under it — "a game for two on one phone · 18 stations" — read as
                a product description on a screen meant to read as a place, and the
                elf explains the eighteen stations a minute later anyway.
              */}
              <h1 ref={titleRef} tabIndex={-1} className={styles.title}>
                {manifest.titleHe}
              </h1>
            </div>

            <div className={`${styles.actions} ${styles.enterLate}`}>
              {canResume && (
                <>
                  <ActionButton block onClick={onResume}>
                    המשיכו במסע
                  </ActionButton>
                  <p className={styles.note}>
                    {progress.gameCompleted
                      ? 'סיימתם את המסע'
                      : `הושלמו ${done} מתוך ${manifest.map.totalStations} תחנות`}
                  </p>
                </>
              )}

              <ActionButton
                block
                variant={canResume ? 'secondary' : 'primary'}
                onClick={onStartNew}
              >
                {canResume ? 'התחילו מסע חדש' : 'התחילו את המסע'}
              </ActionButton>

              {storageUnavailable && (
                <p className={styles.note}>
                  שימו לב: לא ניתן לשמור התקדמות בדפדפן הזה. המשחק יעבוד, אך ההתקדמות לא
                  תישמר.
                </p>
              )}
            </div>
          </div>
        </StageContent>
      )}
    </>
  );
}
