/**
 * Roving-focus math for the start menu (audit #25 P2-C).
 */

import { describe, expect, it } from 'bun:test';
import { nextRovingIndex } from '../../src/model/roving-focus';

describe('nextRovingIndex', () => {
  it('moves down and wraps from the last item', () => {
    expect(nextRovingIndex(0, 10, 'ArrowDown')).toBe(1);
    expect(nextRovingIndex(9, 10, 'ArrowDown')).toBe(0);
  });

  it('moves up and wraps from the first item', () => {
    expect(nextRovingIndex(2, 10, 'ArrowUp')).toBe(1);
    expect(nextRovingIndex(0, 10, 'ArrowUp')).toBe(9);
  });

  it('jumps to the extremes on Home/End', () => {
    expect(nextRovingIndex(4, 10, 'Home')).toBe(0);
    expect(nextRovingIndex(4, 10, 'End')).toBe(9);
  });

  it('ignores non-roving keys and empty lists', () => {
    expect(nextRovingIndex(0, 10, 'ArrowLeft')).toBeNull();
    expect(nextRovingIndex(0, 10, 'Enter')).toBeNull();
    expect(nextRovingIndex(0, 0, 'ArrowDown')).toBeNull();
  });

  it('treats an unfocused start (-1) as before-the-first stop', () => {
    expect(nextRovingIndex(-1, 3, 'ArrowDown')).toBe(0);
    expect(nextRovingIndex(-1, 3, 'ArrowUp')).toBe(2);
  });
});
