import assert from "node:assert/strict";
import { beforeEach, describe, it, mock } from "node:test";

mock.module("server-only", { namedExports: {} });

class RedirectSignal extends Error {
  readonly destination: string;

  constructor(destination: string) {
    super(`Redirect to ${destination}`);
    this.destination = destination;
  }
}

let userLookup: () => Promise<unknown> = async () => null;
let ownershipLookup: (gameContentId: string) => Promise<boolean> = async () => false;
let lastCheckedGameContentId: string | null = null;

mock.module(new URL("../lib/supabase/server.ts", import.meta.url).href, {
  namedExports: {
    async getSupabaseUser() {
      return userLookup();
    },
  },
});

mock.module(new URL("../lib/entitlements/read.ts", import.meta.url).href, {
  namedExports: {
    async ownsGame(gameContentId: string) {
      lastCheckedGameContentId = gameContentId;
      return ownershipLookup(gameContentId);
    },
  },
});

mock.module("next/navigation", {
  namedExports: {
    redirect(destination: string): never {
      throw new RedirectSignal(destination);
    },
  },
});

const {
  FOREST_GAME_CONTENT_ID,
  FOREST_GAME_PLAY_PATH,
  FOREST_GAME_SALES_PATH,
  hasForestGameAccess,
  requireForestGameAccess,
} = await import("../lib/entitlements/require-game-access.ts");
const { entitlementRowsAllowAccess } = await import("../lib/entitlements/access-policy.ts");

async function expectRedirect(destination: string): Promise<void> {
  await assert.rejects(requireForestGameAccess(), (error: unknown) => {
    assert.ok(error instanceof RedirectSignal);
    assert.equal(error.destination, destination);
    return true;
  });
}

describe("requireForestGameAccess — production authorization guard", () => {
  beforeEach(() => {
    userLookup = async () => ({ id: "user-under-test" });
    ownershipLookup = async () => false;
    lastCheckedGameContentId = null;
  });

  it("sends a logged-out request through sign-in with the protected return path", async () => {
    userLookup = async () => null;

    await expectRedirect(`/account?next=${encodeURIComponent(FOREST_GAME_PLAY_PATH)}`);
    assert.equal(lastCheckedGameContentId, null);
  });

  it("allows an authenticated user with an active entitlement", async () => {
    ownershipLookup = async () => true;

    await requireForestGameAccess();

    assert.equal(lastCheckedGameContentId, FOREST_GAME_CONTENT_ID);
  });

  it("denies an authenticated user without an entitlement", async () => {
    await expectRedirect(`${FOREST_GAME_SALES_PATH}?access=required`);
    assert.equal(lastCheckedGameContentId, FOREST_GAME_CONTENT_ID);
  });

  it("fails closed when the entitlement reader or database fails", async () => {
    ownershipLookup = async () => {
      throw new Error("database unavailable");
    };

    await expectRedirect(`${FOREST_GAME_SALES_PATH}?access=required`);
  });

  it("fails closed when authentication lookup fails", async () => {
    userLookup = async () => {
      throw new Error("authentication unavailable");
    };

    await expectRedirect(`${FOREST_GAME_SALES_PATH}?access=required`);
    assert.equal(lastCheckedGameContentId, null);
  });

  it("denies revoked-only entitlement rows", async () => {
    ownershipLookup = async () =>
      entitlementRowsAllowAccess([{ revoked_at: "2026-09-01T00:00:00Z" }]);

    await expectRedirect(`${FOREST_GAME_SALES_PATH}?access=required`);
  });

  it("allows overlapping revoked and active grants", async () => {
    ownershipLookup = async () =>
      entitlementRowsAllowAccess([
        { revoked_at: "2026-09-01T00:00:00Z" },
        { revoked_at: null },
      ]);

    await requireForestGameAccess();
  });
});

describe("hasForestGameAccess — server-rendered ownership state", () => {
  beforeEach(() => {
    userLookup = async () => ({ id: "user-under-test" });
    ownershipLookup = async () => false;
    lastCheckedGameContentId = null;
  });

  it("returns true only for an authenticated active entitlement", async () => {
    ownershipLookup = async () => true;

    assert.equal(await hasForestGameAccess(), true);
    assert.equal(lastCheckedGameContentId, FOREST_GAME_CONTENT_ID);
  });

  it("returns false without an authenticated user", async () => {
    userLookup = async () => null;

    assert.equal(await hasForestGameAccess(), false);
    assert.equal(lastCheckedGameContentId, null);
  });

  it("fails closed when authentication or entitlement lookup fails", async () => {
    userLookup = async () => {
      throw new Error("authentication unavailable");
    };
    assert.equal(await hasForestGameAccess(), false);

    userLookup = async () => ({ id: "user-under-test" });
    ownershipLookup = async () => {
      throw new Error("database unavailable");
    };
    assert.equal(await hasForestGameAccess(), false);
  });
});
