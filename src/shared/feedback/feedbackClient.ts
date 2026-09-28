export const FEEDBACK_COMMENT_MAX_LENGTH = 1000;

export interface GameFeedbackSubmission {
  gameId: string;
  rating: number;
  comment?: string;
}

export interface FeedbackConfig {
  url: string;
  publishableKey: string;
}

interface SubmitFeedbackOptions {
  config?: FeedbackConfig;
  fetchImpl?: typeof fetch;
}

export class FeedbackConfigurationError extends Error {
  constructor() {
    super('Supabase feedback configuration is missing.');
    this.name = 'FeedbackConfigurationError';
  }
}

export class FeedbackSubmissionError extends Error {
  constructor() {
    super('Feedback could not be submitted.');
    this.name = 'FeedbackSubmissionError';
  }
}

function validateSubmission({ gameId, rating, comment }: GameFeedbackSubmission): void {
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(gameId)) {
    throw new TypeError('gameId must be a lowercase slug.');
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new RangeError('rating must be an integer between 1 and 5.');
  }
  if (comment !== undefined && comment.trim().length > FEEDBACK_COMMENT_MAX_LENGTH) {
    throw new RangeError(`comment must not exceed ${FEEDBACK_COMMENT_MAX_LENGTH} characters.`);
  }
}

/**
 * Submit feedback through the host site's same-origin endpoint. The optional
 * config remains only as a test/standalone injection seam; the integrated
 * game never receives database credentials in browser code.
 */
export async function submitGameFeedback(
  submission: GameFeedbackSubmission,
  options: SubmitFeedbackOptions = {},
): Promise<void> {
  validateSubmission(submission);

  const config = options.config;
  let endpoint: URL | string = '/api/game-feedback';
  let headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (config !== undefined) {
    if (!config.url.trim() || !config.publishableKey.trim()) throw new FeedbackConfigurationError();
    try {
      endpoint = new URL(`${config.url.replace(/\/+$/, '')}/rest/v1/game_feedback`);
    } catch {
      throw new FeedbackConfigurationError();
    }
    headers = {
      apikey: config.publishableKey,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    };
  }

  const normalizedComment = submission.comment?.trim() ?? '';
  const response = await (options.fetchImpl ?? fetch)(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      game_id: submission.gameId,
      rating: submission.rating,
      comment: normalizedComment || null,
    }),
  });

  if (!response.ok) throw new FeedbackSubmissionError();
}
