import { useEffect, useState } from 'react';

/** True when the visitor has asked for reduced motion. */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(query.matches);
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return reduced;
}

/**
 * Holds content back briefly so the artwork lands before the text arrives.
 *
 * Resets whenever `key` changes, so each step re-reveals. Anyone who prefers
 * reduced motion sees the text immediately — a delay with no animation just
 * reads as lag.
 */
export function useDelayedReveal(
  delayMs: number | undefined,
  key: string,
  enabled = true,
): boolean {
  const reduced = usePrefersReducedMotion();
  const effective = reduced ? 0 : (delayMs ?? 0);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setRevealed(false);
      return;
    }
    if (effective === 0) {
      setRevealed(true);
      return;
    }
    setRevealed(false);
    const timer = setTimeout(() => setRevealed(true), effective);
    return () => clearTimeout(timer);
  }, [effective, enabled, key]);

  return enabled && revealed;
}
