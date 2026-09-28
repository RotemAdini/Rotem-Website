import type { Station } from '../../types/content.ts';
import type { StationState } from '../../types/state.ts';
import { journeyNumber } from '../../state/sequence.ts';
import styles from './MapHotspot.module.css';

interface MapHotspotProps {
  station: Station;
  state: StationState;
  /** True for the station that opened on the visit just completed. */
  justUnlocked?: boolean;
  onOpen: (order: number) => void;
}

const STATE_LABEL: Record<StationState, string> = {
  locked: 'נעול',
  active: 'התחנה הנוכחית',
  completed: 'הושלם',
};

/**
 * A station on the prototype map: an invisible button over a landmark the
 * illustration already draws.
 *
 * The classic map needed icons because its board was empty scenery — the icons
 * *were* the stations. The prototype artwork paints all eighteen places itself,
 * so an icon on top would be a second, worse drawing of something already there.
 * Nothing is rendered here but light:
 *
 *   locked    — nothing at all, and no hit area either, so an unreachable place
 *               cannot swallow a tap meant for a neighbour it overlaps.
 *   active    — a soft halo that breathes, centred on the landmark.
 *   completed — a faint steady ring. Quiet enough not to compete with the
 *               artwork, present enough to say "you can go back in here".
 *
 * The button still carries the full accessible name, so a screen reader hears
 * exactly what a sighted player sees illustrated.
 */
export function MapHotspot({ station, state, justUnlocked = false, onOpen }: MapHotspotProps) {
  const locked = state === 'locked';
  const { position, size } = station.mapHotspot;

  return (
    <button
      type="button"
      className={[styles.hotspot, styles[state], justUnlocked ? styles.justUnlocked : '']
        .filter(Boolean)
        .join(' ')}
      style={
        {
          // RTL-safe: the coordinates are measured from the left of the artwork,
          // and the plane is anchored from its inline start, which is the right.
          '--ef-x': `${100 - position.x}%`,
          '--ef-y': `${position.y}%`,
          '--ef-size': `${size}%`,
        } as React.CSSProperties
      }
      // Locked stations are refused by the reducer too; this is the UI half.
      disabled={locked}
      aria-disabled={locked}
      aria-current={state === 'active' ? 'step' : undefined}
      onClick={() => onOpen(station.order)}
      aria-label={`תחנה ${journeyNumber(station.order)}: ${station.titleHe} — ${STATE_LABEL[state]}`}
    >
      <span className={styles.glow} aria-hidden="true" />
    </button>
  );
}
