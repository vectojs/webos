/**
 * Human copy for raw proxy/CDN failure payloads (audit #25 P2-D).
 *
 * The text-mode browser surfaces whatever the webos-proxy Worker returns.
 * When Cloudflare itself fails (origin DNS, tunnel down), the stripped page
 * body or error field carries the raw edge message — famously
 * "error code: 1016" — which reads like gibberish to a user. Mapping lives
 * here, pure and tested; unknown payloads pass through untouched.
 */

interface ProxyPattern {
  pattern: RegExp;
  copy: string;
}

const PROXY_PATTERNS: ProxyPattern[] = [
  {
    // Cloudflare origin DNS resolution failure.
    pattern: /error code:\s*1016/i,
    copy: 'The site\u2019s address could not be resolved (DNS). It may no longer exist.',
  },
  {
    // Cloudflare tunnel errors (origin behind Argo Tunnel offline).
    pattern: /error code:\s*10(3[0-9])/i,
    copy: 'The site is unreachable through its tunnel — its server is likely offline.',
  },
  {
    pattern: /\b521\b/,
    copy: 'The site\u2019s server refused the connection (web server is down).',
  },
  {
    pattern: /\b522\b/,
    copy: 'The site\u2019s server timed out before responding.',
  },
  {
    pattern: /\b523\b/,
    copy: 'The site\u2019s server is unreachable from the network path.',
  },
  { pattern: /\b525\b/, copy: 'The TLS handshake with the site failed.' },
  {
    pattern: /\b(403)\b/,
    copy: 'The site refused this request (403 Forbidden).',
  },
];

/**
 * Map a raw payload to human copy when it looks like an edge error;
 * otherwise return null so callers keep their own default rendering.
 */
export function humanizeProxyError(raw: string): string | null {
  for (const { pattern, copy } of PROXY_PATTERNS) {
    if (pattern.test(raw)) return copy;
  }
  return null;
}
