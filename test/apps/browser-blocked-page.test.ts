/**
 * Browser blocked-page rendering (WEB-0040, issue #39): when the proxy
 * relays a target-site failure status (`{status: 412}` inside its own HTTP
 * 200 JSON envelope), the browser must render honest blocked copy — the
 * site's stripped anti-bot challenge page must never surface as content.
 *
 * The mocked envelope deliberately uses `ok: true` (that is what the Worker
 * actually returns), so this test pins the `classifySiteStatus` branch in
 * browser.ts by BEHAVIOR: reordering the render if/else chain so the
 * success branch wins again would render the challenge body and fail here.
 */

import { describe, expect, it } from 'bun:test';
import { Entity } from '@vectojs/core';
import { Input, Text } from '@vectojs/ui';
import { browserApp } from '../../src/apps/browser';

const BLOCKED_URL = 'https://example.com/risk-control';
// Markers typical of an anti-bot challenge page (bilibili 风控-style) that
// must never leak into the rendered body.
const CHALLENGE_MARKERS = ['安全验证', '请输入验证码', 'Please complete the security check'];

function findInput(root: Entity): Input | null {
  if (root instanceof Input) return root;
  for (const child of root.children) {
    const hit = findInput(child);
    if (hit) return hit;
  }
  return null;
}

function collectTexts(root: Entity): string[] {
  const out: string[] = [];
  const walk = (e: Entity): void => {
    if (e instanceof Text) out.push(e.text);
    for (const child of e.children) walk(child);
  };
  walk(root);
  return out;
}

/** Poll until `predicate` holds — render() settles over several macrotasks. */
async function waitFor(predicate: () => boolean, timeoutMs = 500): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error('condition not met before timeout');
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

describe('browser blocked page rendering (#39)', () => {
  it('renders honest blocked copy for a {status:412} payload and never the challenge body', async () => {
    const originalFetch = globalThis.fetch;
    // Proxy contract: its own 200 envelope carries the TARGET site's status.
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          title: '安全验证',
          text: '安全验证\n请输入验证码 Please complete the security check to continue.',
          url: BLOCKED_URL,
          status: 412,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      )) as typeof fetch;

    try {
      const root = browserApp.create();
      const input = findInput(root);
      expect(input).not.toBeNull();

      input!.value = BLOCKED_URL;
      input!.emit('keydown', { key: 'Enter' } as never);

      await waitFor(() => collectTexts(root).join('\n').includes('(HTTP 412)'));

      const texts = collectTexts(root);
      const joined = texts.join('\n');

      // Honest blocked copy replaces the challenge page…
      expect(texts).toContain(`Blocked: ${BLOCKED_URL}`);
      expect(joined).toContain('This site blocked the request (HTTP 412).');
      expect(joined).toContain('Open this address outside WebOS');
      expect(joined).toContain('Site returned HTTP 412');
      // …and no fragment of the challenge body survives anywhere.
      for (const marker of CHALLENGE_MARKERS) {
        expect(joined).not.toContain(marker);
      }
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
