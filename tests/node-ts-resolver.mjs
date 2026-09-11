// Resolve hook so `node --test` can load the app's TypeScript modules directly.
//
// Two gaps between how Next.js resolves imports and how bare Node does:
//   - app code writes extensionless relative imports ("./env"), which Node's
//     type stripping does not resolve on its own;
//   - "next/server" resolves only as "next/server.js" outside the bundler.
//
// Both are handled by retrying the resolution with a suffix. Nothing here
// changes what the modules mean — it only finds them.
import { register } from "node:module";

const RELATIVE_SUFFIXES = [".ts", ".tsx", "/index.ts", "/index.tsx", ".js"];
const BARE_SUFFIXES = [".js"];

async function resolve(specifier, context, next) {
  try {
    return await next(specifier, context);
  } catch (error) {
    const relative = specifier.startsWith("./") || specifier.startsWith("../");
    const suffixes = relative ? RELATIVE_SUFFIXES : BARE_SUFFIXES;

    for (const suffix of suffixes) {
      try {
        return await next(specifier + suffix, context);
      } catch {
        // keep trying
      }
    }

    throw error;
  }
}

export { resolve };

// Self-registering: `node --import ./tests/node-ts-resolver.mjs` both registers
// the hook and makes it available to the loader thread.
if (!process.env.__TS_RESOLVER_REGISTERED) {
  process.env.__TS_RESOLVER_REGISTERED = "1";
  register(import.meta.url);
}
