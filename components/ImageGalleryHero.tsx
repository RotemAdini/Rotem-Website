"use client";

import { useState } from "react";
import FavoriteButton from "./FavoriteButton";
import SeriesGallery from "./SeriesGallery";

interface ImageGalleryHeroProps {
  wrapClassName: string;
  images: string[];
  title: string;
  favoriteId: string;
  favClassName?: string;
}

/** The hero image + favorite heart + (optional) click-to-swap gallery strip
 * shown at the top of a recipe or date detail page. Holds which photo is
 * currently displayed so a gallery thumbnail click swaps the hero image,
 * exactly like the original addSeriesGallery() behavior. */
export default function ImageGalleryHero({ wrapClassName, images, title, favoriteId, favClassName = "fav-btn large-fav" }: ImageGalleryHeroProps) {
  const [activeImage, setActiveImage] = useState(images[0]);

  return (
    <div className={wrapClassName}>
      <img src={activeImage} alt={title} />
      <FavoriteButton id={favoriteId} className={favClassName} label="שמירה למועדפים" />
      <SeriesGallery images={images} title={title} onSelect={setActiveImage} />
    </div>
  );
}
