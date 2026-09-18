"use client";

import { useState } from "react";
import FavoriteButton from "./FavoriteButton";
import SeriesGallery from "./SeriesGallery";

interface ImageGalleryHeroProps {
  wrapClassName: string;
  images: string[];
  title: string;
  favoriteId: string;
  favoriteAliases?: string[];
  favClassName?: string;
}

/** The hero image + favorite heart + (optional) click-to-swap gallery strip
 * shown at the top of a recipe or date detail page. Holds which photo is
 * currently displayed so a gallery thumbnail click swaps the hero image,
 * exactly like the original addSeriesGallery() behavior. */
export default function ImageGalleryHero({ wrapClassName, images, title, favoriteId, favoriteAliases, favClassName = "fav-btn large-fav" }: ImageGalleryHeroProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const hasGallery = images.length > 1;

  return (
    <div className={wrapClassName}>
      {/* With a gallery, the alt carries the photo's position as well as the
          recipe name: every thumbnail swaps this one <img>, and an alt that
          never changed made the swap invisible to anyone not looking at it.
          With a single photo the position would be noise, so it is left off. */}
      <img src={images[activeIndex]} alt={hasGallery ? `${title} – תמונה ${activeIndex + 1} מתוך ${images.length}` : title} />
      <FavoriteButton
        id={favoriteId}
        aliases={favoriteAliases}
        className={favClassName}
        label="שמירה למועדפים"
        activeLabel="הסרה מהמועדפים"
        itemName={title}
      />
      <SeriesGallery images={images} title={title} activeIndex={activeIndex} onSelect={setActiveIndex} />
      {/* Swapping the hero image changes nothing a screen reader would notice
          on its own — focus stays on the thumbnail and the <img> is not
          re-announced. This region is always in the DOM (a live region added
          at the same moment as its text is routinely missed) and only its
          contents change. */}
      <p className="sr-only" role="status" aria-live="polite">
        {hasGallery && activeIndex > 0 ? `מוצגת תמונה ${activeIndex + 1} מתוך ${images.length}` : ""}
      </p>
    </div>
  );
}
