/**
 * Collision-free VFS naming for "New X" flows (WEB-0039 / issue #40).
 * Windows-style suffixing: a taken base name becomes `base (2)`, `base (3)`, …
 * Pure so the numbering rules are bun-test-able.
 */

/** Extracts a trailing ` (n)` counter, returning the stem and n (0 when none). */
function splitCounter(name: string): { stem: string; n: number } {
  const match = /^(.*) \((\d+)\)$/.exec(name);
  if (!match) return { stem: name, n: 0 };
  return { stem: match[1] ?? name, n: Number(match[2]) };
}

/**
 * First free name derived from `desired` given the names already present
 * (compared case-insensitively — VFS targets are user-facing labels).
 * Keeps the extension of a file name intact: `New Document.txt` taken yields
 * `New Document (2).txt`, not `New Document.txt (2)`.
 */
export function nextAvailableName(existing: readonly string[], desired: string): string {
  const taken = new Set(existing.map((name) => name.toLowerCase()));
  if (!taken.has(desired.toLowerCase())) return desired;

  const dot = desired.lastIndexOf('.');
  const hasExt = dot > 0; // not the leading dot of ".hidden"
  const stem = hasExt ? desired.slice(0, dot) : desired;
  const ext = hasExt ? desired.slice(dot) : '';
  const { n } = splitCounter(stem);
  const base = n > 0 ? stem.slice(0, stem.length - ` (${n})`.length) : stem;

  for (let i = Math.max(2, n + 1); ; i++) {
    const candidate = `${base} (${i})${ext}`;
    if (!taken.has(candidate.toLowerCase())) return candidate;
  }
}
