import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { beforeEach, describe, it, mock } from "node:test";

mock.module("server-only", { namedExports: {} });

type GameStub = {
  contentId: string;
  slug: string;
  title: string;
  kind: string | null;
  tagline: string | null;
  images: { path: string; role: string | null }[];
};

let ownedGamesLookup: () => Promise<GameStub[]> = async () => [];

mock.module(new URL("../lib/entitlements/read.ts", import.meta.url).href, {
  namedExports: {
    async getOwnedGames() {
      return ownedGamesLookup();
    },
    async ownsGame() {
      return false;
    },
  },
});

mock.module(new URL("../lib/supabase/server.ts", import.meta.url).href, {
  namedExports: {
    async getSupabaseUser() {
      return null;
    },
  },
});

mock.module("next/navigation", {
  namedExports: {
    redirect(destination: string): never {
      throw new Error(`Unexpected redirect to ${destination}`);
    },
  },
});

const { FOREST_GAME_CONTENT_ID, FOREST_GAME_PLAY_PATH } = await import("../lib/entitlements/require-game-access.ts");
const { getOwnedGameLibrary } = await import("../lib/entitlements/owned-library.ts");

const forest: GameStub = {
  contentId: FOREST_GAME_CONTENT_ID,
  slug: "forest-game",
  title: "היער הקסום",
  kind: "deep",
  tagline: "סיפור זוגי",
  images: [],
};
const race: GameStub = {
  contentId: "game_01M1YKBSJS9WTKJ0G9W19KDJ19",
  slug: "race-game",
  title: "מירוץ האהבה",
  kind: "competition",
  tagline: null,
  images: [],
};
const bundle: GameStub = {
  contentId: "game_01M1YKBSJS9WTKJ0G9W19KDJ20",
  slug: "bundle",
  title: "כל המשחקים",
  kind: "all",
  tagline: null,
  images: [],
};

describe("dashboard owned-games library", () => {
  beforeEach(() => {
    ownedGamesLookup = async () => [];
  });

  it("is empty when the account owns nothing", async () => {
    assert.deepEqual(await getOwnedGameLibrary(), { status: "ready", games: [] });
  });

  it("lists an owned Forest game with its guarded play route", async () => {
    ownedGamesLookup = async () => [forest];

    const library = await getOwnedGameLibrary();
    assert.equal(library.status, "ready");
    assert.ok(library.status === "ready");
    assert.equal(library.games.length, 1);
    assert.equal(library.games[0].title, "היער הקסום");
    assert.equal(library.games[0].playHref, FOREST_GAME_PLAY_PATH);
    assert.equal(library.games[0].detailsHref, "/games/forest-game");
  });

  it("lists an owned game without an integrated player but invents no play route", async () => {
    ownedGamesLookup = async () => [forest, race];

    const library = await getOwnedGameLibrary();
    assert.ok(library.status === "ready");
    const owned = library.games.find((game) => game.slug === "race-game");
    assert.ok(owned);
    assert.equal(owned.playHref, null);
    assert.equal(owned.detailsHref, "/games/race-game");
  });

  it("never lists a bundle as a playable game", async () => {
    ownedGamesLookup = async () => [bundle, forest];

    const library = await getOwnedGameLibrary();
    assert.ok(library.status === "ready");
    assert.deepEqual(library.games.map((game) => game.slug), ["forest-game"]);
  });

  it("fails closed with no games when the entitlement read fails", async () => {
    ownedGamesLookup = async () => {
      throw new Error("database unavailable");
    };

    assert.deepEqual(await getOwnedGameLibrary(), { status: "unavailable" });
  });

  it("is rendered by the dashboard from the server-side library, not hard-coded", () => {
    const page = readFileSync(new URL("../app/dashboard/page.tsx", import.meta.url), "utf8");
    assert.doesNotMatch(page, /^["']use client["']/m);
    assert.match(page, /await getOwnedGameLibrary\(\)/);
  });
});
