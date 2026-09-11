import { defineCliConfig } from "sanity/cli";

import { dataset, projectId } from "./sanity/env";

/**
 * Sanity CLI configuration (`npx sanity ...`).
 *
 * Used for dataset management and schema deployment only. The Studio itself is
 * served by this Next.js app at /studio, so `sanity deploy` is not part of the
 * normal workflow here.
 */
export default defineCliConfig({
  api: { projectId, dataset },
  autoUpdates: false,
});
