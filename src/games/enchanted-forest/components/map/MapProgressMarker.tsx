import type { MapPosition } from '../../types/content.ts';
import { assetUrl } from '../../utils/assets.ts';
import styles from './MapProgressMarker.module.css';

interface MapProgressMarkerProps {
  position: MapPosition;
  label: string;
  /**
   * Where they were standing a moment ago. Set only on the one visit where they
   * have just finished a station, which is the only time they should be seen
   * walking; every other arrival on the map finds them already in place.
   */
  walkFrom?: MapPosition | undefined;
}

/**
 * The couple's position on the path — the game's only progress indicator.
 *
 * Marked aria-hidden because the same information is announced as text in the
 * map header. The placeholder branch is a safety net only; the real silhouette
 * is in place.
 *
 * Each station carries its own `marker` point, already measured onto the path
 * beside its landmark rather than on it, so the couple are centred on the
 * coordinate and no correction is applied. (An earlier "classic" board put the
 * coordinate ON the icon and needed the couple nudged off it; that board and its
 * offset went together.)
 *
 * ── Why the walk is an animation and not a transition ──────────────────────
 *
 * It was a transition for a long time, and it had never once run. The map screen
 * is keyed on the route, so coming back from a station REMOUNTS it, and a
 * freshly inserted element has no before-change style for a transition to start
 * from — the couple teleported to the next station, on all seventeen crossings.
 *
 * Rendering the origin first and moving on the next frame fixes that in
 * principle, but only in a foreground tab: requestAnimationFrame does not fire
 * while the page is hidden, which would leave the couple standing at the station
 * they had just finished until something else re-rendered the map. Forcing a
 * reflow between the two writes does not help either — the browser coalesces
 * both values into the element's first style resolution and generates no
 * transition at all.
 *
 * A keyframe animation has none of that trouble: it runs from an element's very
 * first frame, needs no previous value, and is not driven by a callback that can
 * be throttled. The origin arrives as a pair of custom properties the keyframes
 * read; everything else about the marker is unchanged.
 */
export function MapProgressMarker({ position, label, walkFrom }: MapProgressMarkerProps) {
  const url = assetUrl('map-couple-silhouette');

  const style = {
    // RTL-safe: the coordinates are measured from the left of the artwork, and
    // the marker is anchored from its inline start, which is the right.
    '--ef-x': `${100 - position.x}%`,
    '--ef-y': `${position.y}%`,
    ...(walkFrom
      ? { '--ef-from-x': `${100 - walkFrom.x}%`, '--ef-from-y': `${walkFrom.y}%` }
      : {}),
  } as React.CSSProperties;

  return (
    <div
      className={[styles.marker, styles.onPath, walkFrom ? styles.walking : '']
        .filter(Boolean)
        .join(' ')}
      style={style}
      aria-hidden="true"
      title={label}
    >
      {url ? (
        <img className={styles.image} src={url} alt="" />
      ) : (
        <span className={styles.placeholder}>♥</span>
      )}
    </div>
  );
}
