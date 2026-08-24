/**
 * Proxy error copy mapping (audit #25 P2-D).
 */

import { describe, expect, it } from 'bun:test';
import { humanizeProxyError } from '../../src/model/proxy-errors';

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
