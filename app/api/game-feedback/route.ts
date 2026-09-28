import { NextResponse } from "next/server";

import { ownsGame } from "@/lib/entitlements/read";
import { FOREST_GAME_CONTENT_ID } from "@/lib/entitlements/require-game-access";
import { createSupabaseServerClient, getSupabaseUser } from "@/lib/supabase/server";

const GAME_ID = "enchanted-forest";
const MAX_COMMENT_LENGTH = 1000;
const MAX_BODY_LENGTH = 4096;

function errorResponse(status: number, code: string): NextResponse {
  return NextResponse.json({ error: code }, { status });
}

async function cancelBody(request: Request): Promise<void> {
  try {
    await request.body?.cancel();
  } catch {
    // Best effort: the response still rejects the request even if the stream
    // has already closed or the runtime refuses cancellation.
  }
}

async function readBodyWithinLimit(request: Request): Promise<{ tooLarge: boolean; text: string }> {
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_LENGTH) {
    await cancelBody(request);
    return { tooLarge: true, text: "" };
  }

  if (!request.body) return { tooLarge: false, text: "" };

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  const parts: string[] = [];
  let bytesRead = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      bytesRead += value.byteLength;
      if (bytesRead > MAX_BODY_LENGTH) {
        try {
          await reader.cancel();
        } catch {
          // The request is rejected regardless; cancellation only prevents the
          // runtime from continuing to consume a body that is already invalid.
        }
        return { tooLarge: true, text: "" };
      }

      parts.push(decoder.decode(value, { stream: true }));
    }

    parts.push(decoder.decode());
    return { tooLarge: false, text: parts.join("") };
  } finally {
    reader.releaseLock();
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return errorResponse(415, "unsupported_media_type");
  }

  let body: unknown;
  try {
    const result = await readBodyWithinLimit(request);
    if (result.tooLarge) return errorResponse(413, "payload_too_large");
    body = JSON.parse(result.text) as unknown;
  } catch {
    return errorResponse(400, "invalid_json");
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) return errorResponse(422, "invalid_feedback");
  const record = body as Record<string, unknown>;
  if (Object.keys(record).some((key) => !["game_id", "rating", "comment"].includes(key))) {
    return errorResponse(422, "invalid_feedback");
  }

  const gameId = record.game_id;
  const rating = record.rating;
  const comment = record.comment;
  if (
    gameId !== GAME_ID ||
    !Number.isInteger(rating) ||
    (rating as number) < 1 ||
    (rating as number) > 5 ||
    !(comment === null || comment === undefined || typeof comment === "string") ||
    (typeof comment === "string" && comment.trim().length > MAX_COMMENT_LENGTH)
  ) {
    return errorResponse(422, "invalid_feedback");
  }

  try {
    const user = await getSupabaseUser();
    if (!user) return errorResponse(401, "authentication_required");
    if (!(await ownsGame(FOREST_GAME_CONTENT_ID))) return errorResponse(403, "access_required");

    const supabase = await createSupabaseServerClient();
    const normalizedComment = typeof comment === "string" ? comment.trim() : "";
    const { error } = await supabase.from("game_feedback").insert({
      game_id: GAME_ID,
      rating: rating as number,
      comment: normalizedComment || null,
    });
    if (error) return errorResponse(503, "feedback_unavailable");

    return new NextResponse(null, { status: 204 });
  } catch {
    return errorResponse(503, "feedback_unavailable");
  }
}
