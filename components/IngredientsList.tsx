"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { classifyIngredientLines } from "@/lib/recipe-text";

const STORAGE_PREFIX = "rotemIngredientChecks:";

/**
 * Ticked ingredients are keyed by their own text, not by their position.
 * Positions shift the moment a line is edited in the Studio, which would move
 * everyone's ticks onto the wrong ingredients; the text stays stable.
 */
function readChecked(storageKey: string): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + storageKey);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function writeChecked(storageKey: string, values: string[]): void {
  try {
    if (values.length) localStorage.setItem(STORAGE_PREFIX + storageKey, JSON.stringify(values));
    else localStorage.removeItem(STORAGE_PREFIX + storageKey);
  } catch {
    /* Storage can be unavailable (private browsing); ticks still work in-memory. */
  }
}

export default function IngredientsList({
  ingredients,
  storageKey,
}: {
  ingredients: string[];
  /** Stable per-recipe id, so one recipe's ticks never leak into another. */
  storageKey?: string;
}) {
  // Classified as a list, not line by line: whether a label-shaped line is a
  // section heading depends on what follows it. See lib/recipe-text.ts.
  const lines = useMemo(() => classifyIngredientLines(ingredients), [ingredients]);

  const [checked, setChecked] = useState<string[]>([]);

  // localStorage is not available while server rendering, and the first client
  // render has to match the server's empty output or hydration mismatches — so
  // the saved ticks are read after mount, the documented "synchronise from an
  // external system" use of an effect.
  useEffect(() => {
    if (!storageKey) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setChecked(readChecked(storageKey));
  }, [storageKey]);

  const toggle = useCallback(
    (text: string) => {
      setChecked((current) => {
        const next = current.includes(text) ? current.filter((item) => item !== text) : [...current, text];
        if (storageKey) writeChecked(storageKey, next);
        return next;
      });
    },
    [storageKey],
  );

  const clearAll = useCallback(() => {
    setChecked([]);
    if (storageKey) writeChecked(storageKey, []);
  }, [storageKey]);

  if (!ingredients.length) return <p>אין רשימת מצרכים זמינה.</p>;

  const checkedCount = lines.filter((line) => line.kind === "item" && checked.includes(line.text)).length;

  return (
    <>
      {lines.map(({ text, kind }, index) =>
        kind === "heading" ? (
          // A real heading element, matching what StepsList already does for
          // its section labels — a screen reader can now move between the
          // sections of the ingredient list instead of hearing a run of
          // unlabelled checkboxes.
          <h3 className="ingredient-heading" key={index}>
            {text}
          </h3>
        ) : (
          <label className="ingredient-check" key={index}>
            <input type="checkbox" checked={checked.includes(text)} onChange={() => toggle(text)} />
            <span>{text}</span>
          </label>
        ),
      )}

      {checkedCount > 0 && (
        <div className="ingredient-progress">
          <span aria-live="polite">
            {checkedCount === 1 ? "מצרך אחד מסומן" : `${checkedCount} מצרכים מסומנים`}
          </span>
          <button type="button" className="text-button" onClick={clearAll}>
            ניקוי הסימונים
          </button>
        </div>
      )}
    </>
  );
}
