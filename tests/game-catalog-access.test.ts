import assert from "node:assert/strict";
import { beforeEach, describe, it, mock } from "node:test";

mock.module("server-only", { namedExports: {} });

let ownershipLookup: () => Promise<string[]> = async () => [];

mock.module(new URL("../lib/entitlements/read.ts", import.meta.url).href, {
  namedExports: {
    async getOwnedGameContentIds() {
      return ownershipLookup();
    },
  },
});

const {
  getCatalogOwnedGameContentIds,
  getOwnedIndividualGameSlugs,
} = await import("../lib/entitlements/catalog-access.ts");

describe("getCatalogOwnedGameContentIds", () => {
  beforeEach(() => {
    ownershipLookup = async () => [];
  });

  it("returns active canonical game content IDs from the server reader", async () => {
    ownershipLookup = async () => ["game_forest", "game_race"];

    assert.deepEqual(await getCatalogOwnedGameContentIds(), ["game_forest", "game_race"]);
  });

  it("fails closed when authentication, RLS, or the database reader fails", async () => {
    ownershipLookup = async () => {
      throw new Error("database unavailable");
    };

    assert.deepEqual(await getCatalogOwnedGameContentIds(), []);
  });

  it("matches individual games by canonical content ID and excludes bundles", () => {
    const games = [
      { contentId: "game_forest", kind: "deep", slug: "forest-game" },
      { contentId: "game_race", kind: "competition", slug: "race-game" },
      { contentId: "game_bundle", kind: "all", slug: "bundle" },
    ];

    assert.deepEqual(
      getOwnedIndividualGameSlugs(games, ["game_race", "game_bundle"]),
      ["race-game"],
    );
  });
});
