import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  FeedbackConfigurationError,
  submitGameFeedback,
  type FeedbackConfig,
} from './feedbackClient.ts';

const config: FeedbackConfig = {
  url: 'https://example.supabase.co/',
  publishableKey: 'sb_publishable_test',
};

describe('submitGameFeedback', () => {
  test('posts only the public feedback fields and requests no returned row', async () => {
    const requests: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      requests.push({ url: String(input), init });
      return new Response(null, { status: 201 });
    };

    await submitGameFeedback(
      { gameId: 'enchanted-forest', rating: 5, comment: '  קסום  ' },
      { config, fetchImpl },
    );

    const request = requests[0];
    assert.ok(request);
    assert.equal(request.url, 'https://example.supabase.co/rest/v1/game_feedback');
    assert.equal(request.init?.method, 'POST');
    assert.deepEqual(JSON.parse(String(request.init?.body)), {
      game_id: 'enchanted-forest',
      rating: 5,
      comment: 'קסום',
    });
    const headers = request.init?.headers as Record<string, string>;
    assert.equal(headers.apikey, config.publishableKey);
    assert.equal(headers.Prefer, 'return=minimal');
    assert.equal(headers.Authorization, undefined, 'a publishable key is not sent as a bearer token');
  });

  test('stores an empty optional comment as null', async () => {
    let body = '';
    const fetchImpl: typeof fetch = async (_input, init) => {
      body = String(init?.body);
      return new Response(null, { status: 201 });
    };

    await submitGameFeedback(
      { gameId: 'enchanted-forest', rating: 3, comment: '   ' },
      { config, fetchImpl },
    );

    assert.equal(JSON.parse(body).comment, null);
  });

  test('rejects invalid input before making a request', async () => {
    let called = false;
    const fetchImpl: typeof fetch = async () => {
      called = true;
      return new Response(null, { status: 201 });
    };

    await assert.rejects(
      submitGameFeedback({ gameId: 'enchanted-forest', rating: 6 }, { config, fetchImpl }),
      RangeError,
    );
    assert.equal(called, false);
  });

  test('reports missing Supabase configuration without inventing defaults', async () => {
    await assert.rejects(
      submitGameFeedback(
        { gameId: 'enchanted-forest', rating: 4 },
        { config: { url: '', publishableKey: '' } },
      ),
      FeedbackConfigurationError,
    );
  });
});
