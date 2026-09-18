"use client";

import Link from "next/link";
import { useCallback, useRef } from "react";
import type { Category } from "@/lib/categories";

interface CategoryCarouselProps {
  categories: (Category & { image: string | null })[];
}

/** The scrollable circular category strip on the homepage, with the
 * left/right arrow buttons from the original site. Each category links to
 * the recipes board pre-filtered to that category. */
export default function CategoryCarousel({ categories }: CategoryCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);

  /**
   * Scrolls the strip one page towards later ("forward") or earlier
   * ("backward") categories.
   *
   * The arrows used to be named for the raw pixel direction they scrolled in
   * ("גלילה ימינה" / "גלילה שמאלה"), which tells a Hebrew reader nothing about
   * where they will end up. They are named for their destination now — but the
   * mapping is the opposite of what the sign of the delta suggests, so it is
   * worth stating: this scroller is RTL, and measurement confirms its
   * scrollLeft runs from 0 at the first category down to -478 at the last.
   * A *negative* delta therefore moves forward, towards later categories, and
   * a positive one moves back towards the start.
   *
   * The smooth behaviour is also conditional — the stylesheet honours
   * prefers-reduced-motion, but a scrollBy() call carries its own behaviour
   * and ignores CSS entirely.
   */
  const scrollByPage = useCallback((towards: "forward" | "backward") => {
    const track = trackRef.current;
    if (!track) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    track.scrollBy({ left: towards === "forward" ? -420 : 420, behavior: reduced ? "auto" : "smooth" });
  }, []);

  return (
    <section className="categories-wrap" aria-label="קטגוריות מתכונים">
      <div className="categories-shell container">
        <button
          type="button"
          className="category-arrow category-prev"
          aria-label="הקטגוריות הקודמות"
          onClick={() => scrollByPage("backward")}
        >
          <span aria-hidden="true">›</span>
        </button>
        <div className="categories" id="categories" ref={trackRef}>
          {categories.map((category) => (
            <Link key={category.slug} className="category" href={`/recipes?category=${category.slug}`}>
              {/* The <span> below is inside the same link and already names the
                  category, so an alt repeating it read the name twice
                  (axe image-redundant-alt, 7 nodes on the homepage). */}
              {category.image ? <img src={category.image} alt="" /> : <div className="category-placeholder" aria-hidden="true" />}
              <span>{category.label}</span>
            </Link>
          ))}
        </div>
        <button
          type="button"
          className="category-arrow category-next"
          aria-label="הקטגוריות הבאות"
          onClick={() => scrollByPage("forward")}
        >
          <span aria-hidden="true">‹</span>
        </button>
      </div>
    </section>
  );
}
