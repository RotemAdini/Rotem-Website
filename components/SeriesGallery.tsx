"use client";

import { useState } from "react";

interface SeriesGalleryProps {
  images: string[];
  title: string;
  onSelect: (src: string) => void;
}

/** Click-to-swap thumbnail strip shown under a recipe/date hero image when
 * more than one real photo exists for that item. Ports the original
 * addSeriesGallery()/gallery markup, driven by React state instead of
 * directly mutating the hero <img>'s src. */
export default function SeriesGallery({ images, title, onSelect }: SeriesGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  if (images.length < 2) return null;

  return (
    <div className="series-gallery">
      {images.map((src, index) => (
        <button
          key={src}
          type="button"
          className={`series-gallery-thumb${index === activeIndex ? " active" : ""}`}
          onClick={() => {
            setActiveIndex(index);
            onSelect(src);
          }}
        >
          <img src={src} alt={`${title} – תמונה ${index + 1}`} />
        </button>
      ))}
    </div>
  );
}
