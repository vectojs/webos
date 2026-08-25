/**
 * Paint toolbar hit-test and Clear semantics (audit-3 P1, issue #33):
 * the Clear button must not live in the color-swatch list — the old sentinel
 * `{color:''}` entry matched the swatch find first, so Clear never cleared
 * and left `currentColor` as ''.
 */

import { describe, expect, it } from 'bun:test';
import { PaintRoot } from '../../src/apps/paint';

interface PaintInternals {
  strokes: unknown[];
  currentColor: string;
  swatches: { x: number; y: number; w: number; h: number; color: string }[];
  clearBtn: { x: number; y: number; w: number; h: number };
}

function internals(root: PaintRoot): PaintInternals {
  return root as unknown as PaintInternals;
}

function press(root: PaintRoot, localX: number, localY: number): void {
  root.emit('pointerdown', {
    nativeEvent: {},
    stopPropagation: () => {},
    localX,
    localY,
  } as never);
}

describe('paint toolbar', () => {
  it('seeds two demo strokes and keeps every swatch color non-empty', () => {
    const root = new PaintRoot();
    const p = internals(root);
    expect(p.strokes.length).toBe(2);
    for (const s of p.swatches) expect(s.color).not.toBe('');
    // The clear button is a standalone descriptor, not part of the find list.
    expect(p.swatches.some((s) => s.color === '')).toBe(false);
    expect(p.clearBtn.w).toBeGreaterThan(0);
  });

  it('clears all strokes when the Clear button is pressed', () => {
    const root = new PaintRoot();
    const p = internals(root);
    const c = p.clearBtn;
    press(root, c.x + c.w / 2, c.y + c.h / 2);
    expect(p.strokes.length).toBe(0);
  });

  it('never yields an empty current color from a swatch click', () => {
    const root = new PaintRoot();
    const p = internals(root);
    // Red is the third palette entry.
    const red = p.swatches[2]!;
    press(root, red.x + red.w / 2, red.y + red.h / 2);
    expect(p.currentColor).toBe(red.color);
    expect(p.currentColor).not.toBe('');

    // Clearing afterwards must not touch the selected color.
    const c = p.clearBtn;
    press(root, c.x + c.w / 2, c.y + c.h / 2);
    expect(p.strokes.length).toBe(0);
    expect(p.currentColor).toBe('#ef4444');
  });

  it('draws canvas strokes with the selected (non-empty) color after a clear', () => {
    const root = new PaintRoot();
    const p = internals(root);
    const c = p.clearBtn;
    press(root, c.x + c.w / 2, c.y + c.h / 2);
    expect(p.strokes.length).toBe(0);
    press(root, 200, 200); // below the toolbar → begins a stroke
    root.emit('pointerup', { nativeEvent: {} } as never);
    expect(p.strokes.length).toBe(1);
    expect(p.currentColor).not.toBe('');
  });

  it('ignores toolbar presses on empty toolbar pixels between swatches and Clear', () => {
    const root = new PaintRoot();
    const p = internals(root);
    const before = p.currentColor;
    const last = p.swatches[p.swatches.length - 1]!;
    press(root, last.x + last.w + 6, 16); // in the gap before Clear
    expect(p.currentColor).toBe(before);
    expect(p.strokes.length).toBe(2);
  });
});
