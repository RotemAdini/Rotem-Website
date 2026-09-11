import type { Metadata } from "next";

import StudioClient from "./StudioClient";
import { isSanityConfigured } from "@/sanity/env";

/**
 * The embedded Sanity Studio, served at /studio and /studio/<tool>.
 *
 * This route is content-management only. The public site does not read from
 * Sanity yet — every recipe, date idea and game page still renders from
 * data/recipes.json and lib/*.ts exactly as it did before.
 */
export const metadata: Metadata = {
  title: "Studio | רותם עדיני",
  robots: { index: false, follow: false },
};

export default function StudioPage() {
  if (!isSanityConfigured) return <StudioSetupNotice />;
  return <StudioClient />;
}

/** Shown instead of crashing when NEXT_PUBLIC_SANITY_PROJECT_ID is unset, so a
 * fresh clone (and `npm run build` in CI) works without Sanity credentials. */
function StudioSetupNotice() {
  return (
    <div className="studio-setup">
      <h1>Sanity Studio is not configured yet</h1>
      <p>
        Copy <code>.env.example</code> to <code>.env.local</code> and set <code>NEXT_PUBLIC_SANITY_PROJECT_ID</code> to
        your Sanity project id, then restart the dev server.
      </p>
      <p>
        The public website is unaffected: it still reads recipes, date ideas and games from its existing local data
        sources.
      </p>
    </div>
  );
}
