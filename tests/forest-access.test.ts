import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { entitlementRowsAllowAccess } from "../lib/entitlements/access-policy.ts";
import { safeNextPath } from "../lib/supabase/safe-next.ts";

const { config: proxyConfig } = await import("../proxy.ts");
const { unstable_doesMiddlewareMatch } = await import("next/experimental/testing/server");

describe("Forest game access policy", () => {
  it("rejects revoked-only grants", () => {
    assert.equal(entitlementRowsAllowAccess([{ revoked_at: "2026-09-01T00:00:00Z" }]), false);
  });

  it("allows overlapping grants when at least one remains active", () => {
    assert.equal(
      entitlementRowsAllowAccess([
        { revoked_at: "2026-09-01T00:00:00Z" },
        { revoked_at: null },
      ]),
      true,
    );
  });

  it("pins authorization to the canonical content id in the server guard", () => {
    const guard = readFileSync(new URL("../lib/entitlements/require-game-access.ts", import.meta.url), "utf8");
    assert.match(guard, /game_01M1YKBSJS9WTKJ0G9W19KDJ18/);
    assert.match(guard, /await ownsGame\(gameContentId\)/);
  });
});

describe("safe OAuth return path", () => {
  const playPath = "/games/forest-game/play";

  it("preserves the protected play path", () => {
    assert.equal(safeNextPath(playPath), playPath);
  });

  it("preserves an internal query string", () => {
    assert.equal(safeNextPath(`${playPath}?resume=1`), `${playPath}?resume=1`);
  });

  for (const unsafe of [
    "https://attacker.example/steal",
    "//attacker.example/steal",
    "/\\attacker.example/steal",
    "/%5C%5Cattacker.example/steal",
    "javascript:alert(1)",
  ]) {
    it(`rejects unsafe next target ${unsafe}`, () => {
      assert.equal(safeNextPath(unsafe), "/dashboard");
    });
  }
});

describe("proxy coverage", () => {
  const matchesProxy = (url: string) =>
    unstable_doesMiddlewareMatch({ config: proxyConfig, nextConfig: {}, url });

  it("refreshes the protected Forest play route and nested paths", () => {
    assert.equal(matchesProxy("/games/forest-game/play"), true);
    assert.equal(matchesProxy("/games/forest-game/play/resume"), true);
  });

  it("keeps public game landing pages out of Proxy", () => {
    assert.equal(matchesProxy("/games/forest-game"), false);
    assert.equal(matchesProxy("/games/race-game"), false);
    assert.equal(matchesProxy("/games/memory-game"), false);
  });
});
