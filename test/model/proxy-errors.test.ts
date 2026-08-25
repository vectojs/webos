/**
 * Proxy error copy mapping (audit #25 P2-D) and target-site failure
 * classification (WEB-0040 / issue #39).
 */

import { describe, expect, it } from 'bun:test';
import {
  classifySiteStatus,
  humanizeProxyError,
  siteFailureCopy,
} from '../../src/model/proxy-errors';

describe('humanizeProxyError', () => {
  it('maps the Cloudflare origin-DNS error to human copy', () => {
    expect(humanizeProxyError('error code: 1016')).toContain('DNS');
  });

  it('maps edge 5xx codes regardless of surrounding text', () => {
    expect(humanizeProxyError('Error 521: Web server is down')).toContain('refused');
    expect(humanizeProxyError('... error code: 522 ...')).toContain('timed out');
  });

  it('leaves ordinary page text untouched', () => {
    expect(humanizeProxyError('Welcome to example.com, enjoy code 42')).toBeNull();
    expect(humanizeProxyError('')).toBeNull();
  });
});

describe('classifySiteStatus', () => {
  it('flags anti-bot statuses 403 and 412 as site-blocked', () => {
    expect(classifySiteStatus(412)).toEqual({
      kind: 'site-blocked',
      status: 412,
    });
    expect(classifySiteStatus(403)).toEqual({
      kind: 'site-blocked',
      status: 403,
    });
  });

  it('flags 429 as rate limited', () => {
    expect(classifySiteStatus(429)).toEqual({
      kind: 'site-rate-limited',
      status: 429,
    });
  });

  it('maps other 4xx and 5xx to site-error', () => {
    expect(classifySiteStatus(404)?.kind).toBe('site-error');
    expect(classifySiteStatus(500)?.kind).toBe('site-error');
    expect(classifySiteStatus(503)?.kind).toBe('site-error');
  });

  it('ignores successes, redirects and missing statuses', () => {
    expect(classifySiteStatus(undefined)).toBeNull();
    expect(classifySiteStatus(200)).toBeNull();
    expect(classifySiteStatus(302)).toBeNull();
    expect(classifySiteStatus(399)).toBeNull();
  });

  it('rejects non-integer garbage instead of classifying it', () => {
    expect(classifySiteStatus(Number.NaN)).toBeNull();
    expect(classifySiteStatus(403.5 as unknown as number)).toBeNull();
  });
});

describe('siteFailureCopy', () => {
  it('tells blocked pages honestly and suggests opening externally', () => {
    const copy = siteFailureCopy({ kind: 'site-blocked', status: 412 });
    expect(copy).toContain('412');
    expect(copy).toContain('blocked');
    expect(copy).toContain('outside WebOS');
  });

  it('keeps the raw site text out — no challenge-page passthrough', () => {
    const copy = siteFailureCopy({ kind: 'site-blocked', status: 403 });
    expect(copy.toLowerCase()).not.toContain('哔哩哔哩');
    expect(copy).not.toContain('<html');
  });

  it('gives rate limiting a wait-and-retry message', () => {
    expect(siteFailureCopy({ kind: 'site-rate-limited', status: 429 })).toContain('Wait');
  });

  it('covers not-found, server errors and the generic client error', () => {
    expect(siteFailureCopy({ kind: 'site-error', status: 404 })).toContain('404');
    expect(siteFailureCopy({ kind: 'site-error', status: 500 })).toContain('server');
    expect(siteFailureCopy({ kind: 'site-error', status: 451 })).toContain('451');
  });
});
