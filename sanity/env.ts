/**
 * Sanity connection settings.
 *
 * Everything here comes from the environment — no project id, dataset or token
 * is committed. Copy .env.example to .env.local and fill it in; .gitignore
 * already excludes .env*.local.
 *
 * The write token is deliberately NOT read here: it is server/CLI-only and is
 * read directly by scripts/import-to-sanity.ts, so it can never be reachable
 * from a module the browser bundle might import.
 */

export const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? "";
export const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production";
export const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION ?? "2026-09-07";

/** True once the project has been pointed at a real Sanity project. The Studio
 * route uses this to show a setup message instead of crashing when the
 * environment has not been configured yet. */
export const isSanityConfigured = Boolean(projectId);

export function requireProjectId(): string {
  if (!projectId) {
    throw new Error(
      "NEXT_PUBLIC_SANITY_PROJECT_ID is not set. Copy .env.example to .env.local and add your Sanity project id.",
    );
  }
  return projectId;
}
