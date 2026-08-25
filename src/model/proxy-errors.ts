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

/**
 * Target-site failure classification (WEB-0040 / issue #39).
 *
 * The proxy forwards the upstream HTTP status alongside the stripped text.
 * On 403/412-style answers that text is the site's own anti-bot challenge
 * page and must never be shown as content — the app renders honest copy
 * instead. English copy throughout; i18n is not wired up in this app yet.
 */

export type SiteFailureKind = 'site-blocked' | 'site-rate-limited' | 'site-error';

export interface SiteFailure {
  kind: SiteFailureKind;
  status: number;
}

/**
 * Classify an upstream target-site status carried by the proxy payload;
 * null when there is nothing to report (success or no status forwarded).
 */
export function classifySiteStatus(status: number | undefined): SiteFailure | null {
  if (typeof status !== 'number' || !Number.isInteger(status) || status < 400) return null;
  if (status === 403 || status === 412) return { kind: 'site-blocked', status };
  if (status === 429) return { kind: 'site-rate-limited', status };
  return { kind: 'site-error', status };
}

/** Human copy for a classified target-site failure — honest, actionable. */
export function siteFailureCopy(failure: SiteFailure): string {
  switch (failure.kind) {
    case 'site-blocked':
      return (
        `This site blocked the request (HTTP ${failure.status}).\n\n` +
        'Its bot protection rejects automated access — the WebOS browser ' +
        'fetches pages through a server-side text-mode proxy, which some ' +
        'sites refuse even when the request looks like a normal browser.\n\n' +
        'Open this address outside WebOS to view it.'
      );
    case 'site-rate-limited':
      return (
        `The site is rate-limiting this client (HTTP ${failure.status}).\n\n` +
        'Too many requests came from the proxy in a short time. Wait a ' +
        'moment and try again, or open the address outside WebOS.'
      );
    case 'site-error':
      if (failure.status === 404) {
        return `Nothing lives at this address (HTTP 404). It may have moved or never existed.`;
      }
      if (failure.status >= 500) {
        return `The site's server reported an error (HTTP ${failure.status}). It may be temporarily down.`;
      }
      return `The site refused the request (HTTP ${failure.status}).`;
  }
}
