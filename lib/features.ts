/**
 * Site feature flags.
 *
 * A flag switched off hides a feature from every public surface — navigation,
 * search, favourites filters, homepage entry points and the route itself —
 * while leaving its code, content and data completely intact. Switching the
 * flag back on restores the feature as it was; nothing has to be rebuilt.
 *
 * These are build-time constants on purpose. They are read by Server
 * Components, so a flag that is off keeps the hidden route out of the
 * statically generated output rather than merely hiding its link.
 */
export const FEATURES = {
  /**
   * The מתנות (gifts) catalogue. Off while the catalogue is unfinished: the
   * page exists and renders, but nothing public links to it and /gifts itself
   * answers 404 rather than exposing a half-built page.
   *
   * To bring it back: set this to true. No other file needs to change.
   */
  gifts: false,
} as const;

export type FeatureName = keyof typeof FEATURES;

/** Reads a flag. Prefer this over touching FEATURES directly so every call
 * site is greppable when a flag is retired. */
export function isFeatureEnabled(name: FeatureName): boolean {
  return FEATURES[name];
}
