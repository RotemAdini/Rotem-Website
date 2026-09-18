// Minimal static file server for local QA only. Not part of the site's runtime.
//
// Security posture, because this serves the repository root and the repository
// root contains things that must never leave this machine:
//
//   * It binds to 127.0.0.1 only. Binding to 0.0.0.0 (the Node default when no
//     host is given) publishes the repo to every device on the local network —
//     cafe wifi, a hotel LAN, a phone on the same router.
//   * It refuses dotfiles, .env files, .git, reports/ (audits and Sanity
//     backups) and the development-only directories, at any depth.
//   * It serves only the file extensions the legacy static site actually uses.
//     That allowlist is what stops .env, .sql, .ts, .csv and .docx from being
//     fetchable even if a denial rule above is ever loosened.
//
// What it must keep working is the legacy static QA site: the .html pages at
// the repo root, styles.css / legal-pages.css, script.js, data/recipes.json,
// and the images/, games/, styles/ and content/ assets they reference.
const http = require("http");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const port = process.env.PORT || 8083;

// Localhost only. Deliberately not configurable: a QA server that can be
// pointed at 0.0.0.0 by an env var is a QA server that eventually is.
const host = "127.0.0.1";

const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".mov": "video/quicktime",
  ".mp4": "video/mp4",
  ".woff2": "font/woff2",
};

/**
 * Directories that exist for development, never for a browser. Matched on any
 * path segment, so /reports/backups/x.json and /a/b/reports/x.json are both
 * refused, and so is the bare directory name.
 */
const DENIED_SEGMENTS = new Set([
  "node_modules",
  "reports", // audits, launch tracker, and reports/backups/ Sanity dumps
  "supabase", // migrations and local CLI state
  "scripts",
  "tools",
  "tests",
  "docs",
  "sanity",
  "app",
  "lib",
  "components",
  "migration", // data/migration — manifests, not site data
  "source-materials", // data/source-materials — raw spreadsheets and exports
  "content-review-batches",
]);

/** Exact files at any depth that are configuration or secrets, not content. */
const DENIED_FILES = new Set(["package.json", "package-lock.json", "tsconfig.json", "tsconfig.tsbuildinfo"]);

/**
 * True when the URL path touches anything private.
 *
 * Every rule here is a refusal, not a 404: a QA server that quietly 404s a
 * blocked path is indistinguishable from one whose rules stopped working.
 */
function isPrivatePath(segments) {
  return segments.some((segment) => {
    const name = segment.toLowerCase();
    // Dotfiles and dot-directories: .env, .env.local, .git, .next, .vercel,
    // .claude. One rule rather than a list, so a new dot-directory is denied
    // the day it appears.
    if (name.startsWith(".")) return true;
    if (DENIED_SEGMENTS.has(name)) return true;
    if (DENIED_FILES.has(name)) return true;
    return false;
  });
}

function refuse(res, status, message) {
  res.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(message);
}

http
  .createServer((req, res) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      refuse(res, 405, "Method not allowed");
      return;
    }

    let urlPath;
    try {
      urlPath = decodeURIComponent(req.url.split("?")[0]);
    } catch {
      refuse(res, 400, "Bad request");
      return;
    }
    if (urlPath === "/") urlPath = "/index.html";

    // A NUL byte truncates the path inside some filesystem calls; refuse it
    // before it reaches one.
    if (urlPath.includes("\0")) {
      refuse(res, 400, "Bad request");
      return;
    }

    // Split on both separators so an encoded backslash cannot smuggle a
    // segment past the checks on Windows.
    const segments = urlPath.split(/[/\\]+/).filter((segment) => segment !== "" && segment !== ".");
    if (segments.includes("..") || isPrivatePath(segments)) {
      refuse(res, 403, "Forbidden");
      return;
    }

    const filePath = path.resolve(root, ...segments);
    // Containment check against root + separator: a bare startsWith(root)
    // would also accept a sibling directory whose name merely begins with the
    // repository's.
    if (filePath !== root && !filePath.startsWith(root + path.sep)) {
      refuse(res, 403, "Forbidden");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    if (!mime[ext]) {
      refuse(res, 403, "Forbidden");
      return;
    }

    fs.readFile(filePath, (err, data) => {
      if (err) {
        refuse(res, 404, "Not found: " + urlPath);
        return;
      }
      res.writeHead(200, { "Content-Type": mime[ext], "X-Content-Type-Options": "nosniff" });
      res.end(req.method === "HEAD" ? undefined : data);
    });
  })
  .listen(port, host, () => console.log(`static-server listening on http://${host}:${port} (localhost only)`));
