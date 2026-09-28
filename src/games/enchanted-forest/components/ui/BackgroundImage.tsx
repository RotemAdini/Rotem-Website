import { useEffect, useState } from 'react';
import type { AssetId } from '../../types/content.ts';
import { assetUrl, missingAssetLabel } from '../../utils/assets.ts';
import { isImageReady, preloadImage } from '../../utils/imageLoading.ts';
import styles from './BackgroundImage.module.css';

interface BackgroundImageProps {
  asset: AssetId;
  /** CSS object-position, so a portrait subject is never cropped out on a phone. */
  focus?: string;
  priority?: boolean;
  /** Fires only after this asset has loaded and decoded (or failed safely). */
  onReady?: (asset: AssetId) => void;
}

/**
 * Full-bleed artwork. Backgrounds are decorative, so `alt` is empty and the
 * image is hidden from assistive tech — all meaning lives in the text panels.
 *
 * When an asset has not been exported yet, this renders a labelled placeholder
 * rather than a broken image, so a missing cosmetic asset never blocks play.
 */
export function BackgroundImage({
  asset,
  focus,
  priority = false,
  onReady,
}: BackgroundImageProps) {
  const url = assetUrl(asset);
  const [displayedUrl, setDisplayedUrl] = useState<string | null>(() =>
    url && isImageReady(url) ? url : null,
  );
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    if (!url) {
      setDisplayedUrl(null);
      setFailedUrl(null);
      onReady?.(asset);
      return () => {
        active = false;
      };
    }

    setFailedUrl(null);
    void preloadImage(url, priority ? 'high' : 'auto').then((outcome) => {
      if (!active) return;
      /*
       * Three outcomes, and only one of them is a placeholder.
       *
       * 'ready'   the replacement can be painted in a single frame, which is the
       *           whole reason the old scene was held until now.
       * 'timeout' the artwork is merely late. Render the <img> anyway and let
       *           the browser paint it whenever it arrives — a slow connection
       *           must not leave the couple on an empty screen, and calling
       *           `onReady` is what lets the words and the forward control show.
       * 'failed'  the asset is not coming. The labelled placeholder is honest.
       */
      setDisplayedUrl(outcome === 'failed' ? null : url);
      setFailedUrl(outcome === 'failed' ? url : null);
      onReady?.(asset);
    });

    return () => {
      active = false;
    };
  }, [asset, onReady, priority, url]);

  return (
    <div className={styles.layer} aria-hidden="true">
      {displayedUrl ? (
        <>
          {/* Fills the screen edges on wide desktops without cropping the scene. */}
          <img className={styles.blurFill} src={displayedUrl} alt="" />
          <img
            key={displayedUrl}
            className={styles.image}
            src={displayedUrl}
            alt=""
            decoding="async"
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : 'auto'}
            style={focus ? ({ '--ef-object-position': focus } as React.CSSProperties) : undefined}
          />
        </>
      ) : !url || failedUrl === url ? (
        <div className={styles.placeholder}>
          <p className={styles.placeholderNote}>חסר נכס גרפי: {missingAssetLabel(asset)}</p>
        </div>
      ) : null}
      <div className={styles.scrim} />
    </div>
  );
}
