import "server-only";

import { redirect } from "next/navigation";

import { getSupabaseUser } from "../supabase/server";
import { ownsGame } from "./read";

export const FOREST_GAME_CONTENT_ID = "game_01M1YKBSJS9WTKJ0G9W19KDJ18";
export const FOREST_GAME_PLAY_PATH = "/games/forest-game/play";
export const FOREST_GAME_SALES_PATH = "/games/forest-game";

/**
 * Fail-closed ownership read for server-rendered Forest purchase/play UI.
 * This only controls presentation; requireForestGameAccess remains the
 * authoritative guard for every request to the playable route.
 */
export async function hasForestGameAccess(): Promise<boolean> {
  try {
    const user = await getSupabaseUser();
    if (!user) return false;
    return await ownsGame(FOREST_GAME_CONTENT_ID);
  } catch {
    return false;
  }
}

export async function requireGameAccess({
  gameContentId,
  playPath,
  salesPath,
}: {
  gameContentId: string;
  playPath: string;
  salesPath: string;
}): Promise<void> {
  let user;
  try {
    user = await getSupabaseUser();
  } catch {
    redirect(`${salesPath}?access=required`);
  }

  if (!user) {
    redirect(`/account?next=${encodeURIComponent(playPath)}`);
  }

  try {
    if (await ownsGame(gameContentId)) return;
  } catch {
    // Authentication/catalog/database failures must never become access.
  }

  redirect(`${salesPath}?access=required`);
}

export async function requireForestGameAccess(): Promise<void> {
  return requireGameAccess({
    gameContentId: FOREST_GAME_CONTENT_ID,
    playPath: FOREST_GAME_PLAY_PATH,
    salesPath: FOREST_GAME_SALES_PATH,
  });
}
