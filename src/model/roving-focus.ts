/**
 * Roving-focus index math shared by composite widgets (audit #25 P2-C).
 * Pure so the wrap/clamp rules are bun-test-able.
 */

export type RovingKey = 'ArrowUp' | 'ArrowDown' | 'Home' | 'End';

/** Next index for arrow/Home/End roving; null when the key is not roving. */
/** Next index for arrow/Home/End roving; null when the key is not roving.
 * A `current` of -1 (nothing focused yet) behaves like a stop parked just
 * outside the list: ArrowDown enters at the top, ArrowUp at the bottom. */
export function nextRovingIndex(current: number, count: number, key: string): number | null {
  if (count <= 0) return null;
  switch (key) {
    case 'ArrowDown':
      return current < 0 ? 0 : (current + 1) % count;
    case 'ArrowUp':
      return current < 0 ? count - 1 : (current - 1 + count) % count;
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    default:
      return null;
  }
}
