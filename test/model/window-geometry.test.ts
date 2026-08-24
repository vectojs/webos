/**
 * Viewport-clamp math for window placement (audit #25 P2-B).
 */

import { describe, expect, it } from 'bun:test';
import { clampPosition, fitGeometry } from '../../src/model/window-geometry';

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
