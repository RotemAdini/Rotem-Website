"use client";

import Link from "next/link";
import { useRef } from "react";
import type { Category } from "@/lib/categories";

interface CategoryCarouselProps {
  categories: (Category & { image: string | null })[];
}

/** The scrollable circular category strip on the homepage, with the
 * left/right arrow buttons from the original site. Each category links to
 * the recipes board pre-filtered to that category. */
export default function CategoryCarousel({ categories }: CategoryCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);

  return (
    <section className="categories-wrap">
      <div className="categories-shell container">
        <button
          className="category-arrow category-prev"
          aria-label="גלילה ימינה"
          onClick={() => trackRef.current?.scrollBy({ left: 420, behavior: "smooth" })}
        >
          ›
        </button>
        <div className="categories" id="categories" ref={trackRef}>
          {categories.map((category) => (
            <Link key={category.slug} className="category" href={`/recipes?category=${category.slug}`}>
              {category.image ? (
                <img src={category.image} alt={category.label} />
              ) : (
                <div className="category-placeholder" role="img" aria-label={category.label} />
              )}
              <span>{category.label}</span>
            </Link>
          ))}
        </div>
        <button
          className="category-arrow category-next"
          aria-label="גלילה שמאלה"
          onClick={() => trackRef.current?.scrollBy({ left: -420, behavior: "smooth" })}
        >
          ‹
        </button>
      </div>
    </section>
  );
}
