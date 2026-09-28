import { useEffect, useMemo, useRef } from 'react';
import type { GameManifest } from '../../types/content.ts';
import type { Progress } from '../../types/state.ts';
import { completedCount, stationState } from '../../state/progress.ts';
import { DEFAULT_SEQUENCE, previousInSequence } from '../../state/sequence.ts';
import { assetUrl } from '../../utils/assets.ts';
import { preloadImage } from '../../utils/imageLoading.ts';
import { MapHotspot } from '../map/MapHotspot.tsx';
import { MapProgressMarker } from '../map/MapProgressMarker.tsx';
import { StageContent } from '../shell/GameStage.tsx';
import tokens from '../../styles/tokens.module.css';
import styles from './ForestMap.module.css';

interface ForestMapProps {
  manifest: GameManifest;
  progress: Progress;
  onOpenStation: (order: number) => void;
  onRestart: () => void;
  /** Available only once the journey is complete — the ending stays reachable. */
  onOpenEnding: () => void;
  announcement: string | null;
  /** Set for one visit after a station is completed, so the next one can arrive. */
  unlockedOrder: number | null;
}

/** The last place of the journey — where the couple end up, not station 18 by number. */
function lastInJourney(total: number): number {
  return DEFAULT_SEQUENCE[DEFAULT_SEQUENCE.length - 1] ?? total;
}

/**
 * The hub. Replaces 19 near-identical PDF pages with one screen whose state
 * changes: one map, the 18 stations positioned from measured coordinates, and
 * the couple marker moved along the path.
 *
 * The artwork and the station overlay are two elements sharing one `.plane`
 * class, so they are laid out by identical rules at every viewport and a station
 * can never drift away from the path. The plane's aspect ratio comes from the
 * manifest rather than being hard-coded, so replacing the artwork with a
 * differently-proportioned image needs no change here.
 *
 * The artwork already draws every place, so nothing is laid on top of it: a
 * station is an invisible hotspot over the landmark that is already painted.
 */
export function ForestMap({
  manifest,
  progress,
  onOpenStation,
  onRestart,
  onOpenEnding,
  announcement,
  unlockedOrder,
}: ForestMapProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const mapUrl = assetUrl(manifest.map.background);
  const total = manifest.map.totalStations;
  const done = completedCount(progress);
  const { width, height } = manifest.map.designFrame;
  const planeStyle = { '--ef-map-ratio': String(width / height) } as React.CSSProperties;

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  /*
   * Where the couple are standing.
   *
   * `currentStation` is the next station of the *journey*, which is no longer the
   * highest number completed: after station 1 they walk to station 3, not to
   * station 2. The old `Math.min` was only ever a guard against the
   * finished-game sentinel (totalStations + 1) — and once the journey is over
   * they stand at its last place, which is the last entry of the sequence rather
   * than the largest order.
   */
  /*
   * The stations in the order they are WALKED, not the order they are numbered.
   *
   * Only the DOM order changes: each hotspot is absolutely positioned from its
   * own coordinates and each state carries its own z-index, so the board looks
   * identical. What it buys is the tab order — a keyboard player moves along
   * the trail, 1 → 3 → 2 → 4, the same route the couple walk, instead of
   * counting up the station numbers and arriving at places in an order the
   * journey does not use.
   */
  const journeyStations = useMemo(() => {
    const byOrder = new Map(manifest.stations.map((station) => [station.order, station]));
    const walked = DEFAULT_SEQUENCE.map((order) => byOrder.get(order)).filter(
      (station): station is (typeof manifest.stations)[number] => station !== undefined,
    );
    // Anything the sequence somehow does not name still has to be reachable.
    const named = new Set(walked);
    return [...walked, ...manifest.stations.filter((station) => !named.has(station))];
  }, [manifest.stations]);

  const current = progress.currentStation > total ? lastInJourney(total) : progress.currentStation;
  const markerStation = manifest.stations.find((s) => s.order === current) ?? manifest.stations[0];
  const markerPosition = markerStation ? markerStation.mapHotspot.marker : null;

  // Warm the currently playable station while the couple are looking at the
  // map (and, after a completion, while the arrival animation runs). Opening a
  // station should never be its background's first request.
  useEffect(() => {
    const stationUrl = markerStation ? assetUrl(markerStation.background) : null;
    if (stationUrl) void preloadImage(stationUrl, 'high', 0);
  }, [markerStation]);

  /*
   * Where the couple were standing a moment ago.
   *
   * Only set on the one visit where they have actually just walked — the same
   * signal that lights the new place up. Opening the map any other time (coming
   * back from a revisit, resuming a saved game) finds them already where they
   * belong, with no journey to replay.
   */
  const walkedFrom = (() => {
    if (unlockedOrder === null || unlockedOrder !== current) return undefined;
    const from = previousInSequence(current);
    if (from === null) return undefined;
    const station = manifest.stations.find((s) => s.order === from);
    if (!station) return undefined;
    return station.mapHotspot.marker;
  })();

  return (
    <>
      {/*
        The hub's heading, and the first thing in the document.

        It lives here rather than in the header row below because it is what
        receives focus when the map opens, and everything a keyboard player can
        do on this screen has to come AFTER it. Inside the header it sat at
        index 18 of 21 — behind all eighteen stations — so tabbing forward from
        the heading walked straight past the entire game to the restart button,
        and the one station they could actually open was reachable only by
        tabbing backwards. It is `visuallyHidden`, so moving it changes the tab
        order and nothing else.
      */}
      <h1 ref={headingRef} tabIndex={-1} className={tokens.visuallyHidden}>
        מפת היער
      </h1>

      <div className={styles.art} aria-hidden="true">
        {mapUrl && (
          <img className={styles.blurFill} src={mapUrl} alt="" decoding="async" loading="eager" />
        )}
        <div className={styles.plane} style={planeStyle}>
          {mapUrl ? (
            <img
              className={styles.mapImage}
              src={mapUrl}
              alt=""
              decoding="async"
              loading="eager"
              fetchPriority="high"
            />
          ) : (
            <div className={styles.mapMissing}>חסרה תמונת המפה</div>
          )}
        </div>
        <div className={styles.scrim} />
      </div>

      {/* Same plane, same rules — the overlay cannot disagree with the artwork. */}
      <div className={styles.overlay}>
        <div className={styles.plane} style={planeStyle}>
          <ul className={styles.nodes}>
            {journeyStations.map((station) => {
              const state = stationState(station.order, progress);
              const justUnlocked = station.order === unlockedOrder;
              return (
                <li key={station.id} className={styles.node}>
                  <MapHotspot
                    station={station}
                    state={state}
                    justUnlocked={justUnlocked}
                    onOpen={onOpenStation}
                  />
                </li>
              );
            })}
          </ul>

          {markerPosition && (
            <MapProgressMarker
              position={markerPosition}
              walkFrom={walkedFrom}
              label="המיקום שלכם במסע"
            />
          )}
        </div>
      </div>

      <StageContent>
        <div className={styles.screen}>
          {/*
            The chrome keeps to the quiet band between the two top landmarks.

            The last station of the journey — the kiss gate — is painted into the
            top-right corner of the artwork, and this row used to run the full
            width of the screen with the title at its inline start, which in RTL
            is that exact corner. The finale sat behind the word "map". The moon
            occupies the other corner, so the compact cluster is centred between
            them and the heading is announced rather than drawn.
          */}
          <header className={styles.header}>
            <div className={styles.chrome}>
              {/* One progress signal, labelled for assistive tech rather than
                  repeated as a second line of status text. */}
              <div
                className={styles.track}
                role="img"
                aria-label={`הושלמו ${done} מתוך ${total} תחנות`}
              >
                <span
                  className={styles.trackFill}
                  style={{ inlineSize: `${(done / total) * 100}%` }}
                />
              </div>

              {/*
                The bar alone could say "some" but never "how many", and on a
                journey this long that is the question the couple actually ask.
                Two glyphs and a slash answer it without putting a number badge
                on the artwork.

                `dir="ltr"` because a bare "3/18" in an RTL context is reordered
                by the bidi algorithm and rendered as 18/3. It is hidden from
                assistive tech: the track beside it already carries the same fact
                as a full sentence, and hearing it twice is worse than once.
              */}
              <span className={styles.count} dir="ltr" aria-hidden="true">
                {done}/{total}
              </span>

              <button
                type="button"
                className={styles.restart}
                onClick={onRestart}
                aria-label="התחלה מחדש"
                title="התחלה מחדש"
              >
                <span aria-hidden="true">🔄</span>
              </button>
            </div>
          </header>

          {/* Completion feedback is announced, not just animated. */}
          <p aria-live="polite" className={announcement ? styles.toast : styles.toastQuiet}>
            {announcement ?? ''}
          </p>

          <div className={styles.footer}>
            {progress.gameCompleted && (
              <button type="button" className={styles.endingLink} onClick={onOpenEnding}>
                לסיום המסע
              </button>
            )}
          </div>
        </div>
      </StageContent>
    </>
  );
}
