/**
 * Viewport-clamp math for window placement (audit #25 P2-B).
 */

import { describe, expect, it } from 'bun:test';
import { clampPosition, clampRect, fitGeometry } from '../../src/model/window-geometry';

const AREA = { x: 0, y: 0, width: 800, height: 600 };

describe('clampPosition', () => {
  it('leaves in-bounds windows untouched', () => {
    expect(clampPosition(100, 50, 200, 150, AREA)).toEqual({ x: 100, y: 50 });
  });

  it('pulls windows that hang past the right/bottom edge back inside', () => {
    expect(clampPosition(700, 520, 200, 150, AREA)).toEqual({ x: 600, y: 450 });
  });

  it('lifts windows dragged above/left of the area', () => {
    expect(clampPosition(-40, -10, 200, 150, AREA)).toEqual({ x: 0, y: 0 });
  });

  it('respects a non-zero work-area origin (taskbar offset)', () => {
    const belowTaskbar = { x: 0, y: 40, width: 500, height: 560 };
    expect(clampPosition(0, 0, 300, 200, belowTaskbar)).toEqual({
      x: 0,
      y: 40,
    });
    expect(clampPosition(450, 700, 300, 200, belowTaskbar)).toEqual({
      x: 200,
      y: 400,
    });
  });

  it('pins oversized windows to the area origin instead of going negative', () => {
    expect(clampPosition(120, 80, 900, 700, AREA)).toEqual({ x: 0, y: 0 });
  });
});

describe('clampRect', () => {
  it('leaves fitting windows untouched', () => {
    expect(clampRect(100, 50, 200, 150, AREA)).toEqual({
      x: 100,
      y: 50,
      width: 200,
      height: 150,
    });
  });

  it('shrinks an oversize box into the area, then pins the top-left (issue #30)', () => {
    // Audited shape: zoom-in to a 568×355 viewport (568×315 work area) — the
    // position-only clamp left this window stranded with height 380 > 315.
    const area = { x: 0, y: 40, width: 568, height: 315 };
    expect(clampRect(72, 8, 540, 380, area)).toEqual({
      x: 28,
      y: 40,
      width: 540,
      height: 315,
    });
  });

  it('pulls the position back after shrinking when the box hangs off right/bottom', () => {
    const area = { x: 0, y: 40, width: 568, height: 315 };
    expect(clampRect(560, 80, 520, 470, area)).toEqual({
      x: 48,
      y: 40,
      width: 520,
      height: 315,
    });
  });

  it('keeps the engine floor semantics: size never drops below minWidth/minHeight', () => {
    // Work area smaller than the window's enforced minimum size — shrink is
    // capped at the floor and the box stays pinned at the area origin so the
    // unavoidable overflow runs off the bottom/right edges only.
    const tiny = { x: 0, y: 0, width: 300, height: 200 };
    expect(clampRect(120, 80, 400, 300, tiny, 360, 240)).toEqual({
      x: 0,
      y: 0,
      width: 360,
      height: 240,
    });
  });

  it('defaults floors to 1 like the engine clampRect', () => {
    expect(clampRect(-50, -50, 0, 0, AREA)).toEqual({
      x: 0,
      y: 0,
      width: 1,
      height: 1,
    });
  });

  it('floors to a 1px box pinned at area.y when the work area has zero height (DEC-0021)', () => {
    // Degenerate-area edge (review PX-0160): a zero-height area cannot hold
    // any box, so the floor caps the height at 1 and clampPosition pins the
    // top-left at the area origin — the documented deviation from the engine,
    // whose applyGeom re-floors with its own per-window minimums while keeping
    // the pinned top-left (same output shape, overflow off bottom/right only).
    const flat = { x: 0, y: 40, width: 568, height: 0 };
    expect(clampRect(72, 8, 540, 380, flat)).toEqual({
      x: 28,
      y: 40,
      width: 540,
      height: 1,
    });
  });
});

describe('fitGeometry', () => {
  it('keeps preferred geometry on roomy viewports', () => {
    expect(fitGeometry({ x: 200, y: 36, width: 540, height: 380 }, 1280, 800, 40)).toEqual({
      x: 200,
      y: 36,
      width: 540,
      height: 380,
    });
  });

  it('shrinks width and clamps position on narrow viewports', () => {
    const fitted = fitGeometry({ x: 200, y: 36, width: 540, height: 380 }, 480, 800, 40);
    expect(fitted.width).toBeLessThanOrEqual(464);
    expect(fitted.x).toBeLessThanOrEqual(480 - 8 - fitted.width);
    expect(fitted.x).toBeGreaterThanOrEqual(8);
  });

  it('shrinks height so the window clears the taskbar', () => {
    const fitted = fitGeometry({ x: 8, y: 8, width: 520, height: 470 }, 1280, 400, 40);
    expect(fitted.height).toBeLessThanOrEqual(344);
    expect(fitted.y + fitted.height).toBeLessThanOrEqual(360);
  });
});
