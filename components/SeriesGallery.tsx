"use client";

interface SeriesGalleryProps {
  images: string[];
  title: string;
  /** Index of the photo currently in the hero. Owned by the parent so the
   * hero's alt text and the live announcement stay in step with the strip. */
  activeIndex: number;
  onSelect: (index: number) => void;
}

/** Click-to-swap thumbnail strip shown under a recipe/date hero image when
 * more than one real photo exists for that item. Ports the original
 * addSeriesGallery()/gallery markup, driven by React state instead of
 * directly mutating the hero <img>'s src. */
export default function SeriesGallery({ images, title, activeIndex, onSelect }: SeriesGalleryProps) {
  if (images.length < 2) return null;

  return (
    // A labelled group, so a screen reader announces what this run of
    // near-identical buttons is for before reading through it.
    <div className="series-gallery" role="group" aria-label={`תמונות נוספות של ${title}`}>
      {images.map((src, index) => {
        const selected = index === activeIndex;
        return (
          <button
            key={src}
            type="button"
            className={`series-gallery-thumb${selected ? " active" : ""}`}
            // The thumbnail is decorative once the button says what it does:
            // its own alt used to be the button's only name, which made every
            // thumbnail read as the recipe title again. Which one is showing
            // was previously carried by the .active class alone (WCAG 4.1.2).
            aria-pressed={selected}
            aria-label={`הצגת תמונה ${index + 1} מתוך ${images.length}`}
            onClick={() => onSelect(index)}
          >
            <img src={src} alt="" />
          </button>
        );
      })}
    </div>
  );
}
