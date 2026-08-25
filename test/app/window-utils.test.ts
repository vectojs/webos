/**
 * Top resize rim exposure (audit-3 P1, issue #33): the engine's titlebar drag
 * handle spans the full titlebar, so N/NW/NE rim presses began a move instead
 * of a resize. The patch excludes the rim from the handle's own hit-test;
 * these tests pin the dispatch math the engine relies on.
 */

import { describe, expect, it } from 'bun:test';
import { Entity } from '@vectojs/core';
import { UIComponent } from '@vectojs/ui';
import { exposeTopResizeRim, type RimHost } from '../../src/app/window-utils';

/**
 * The engine's TitlebarDragHandle extends UIComponent, whose box hit-test the
 * patch wraps — so the stub uses the same base class.
 */
function makeHandle(width = 500, height = 30): Entity {
  const handle = new UIComponent() as unknown as Entity;
  handle.x = 0;
  handle.y = 0;
  handle.width = width;
  handle.height = height;
  return handle;
}

function makeHost(overrides: Partial<RimHost> = {}): RimHost {
  return {
    maximized: false,
    isDialog: false,
    chrome: { resizeHandle: 6 },
    ...overrides,
  };
}

describe('exposeTopResizeRim', () => {
  it('keeps the mid-titlebar and bottom of the handle hittable (move still works)', () => {
    const handle = makeHandle();
    exposeTopResizeRim(handle, makeHost());
    // Points are global; the handle sits at (0,0) so local == global here.
    expect(handle.isPointInside(250, 15)).toBe(true);
    expect(handle.isPointInside(250, 29)).toBe(true);
    expect(handle.isPointInside(499, 20)).toBe(true);
  });

  it('opens the top rim: presses within resizeHandle px fall through to the root', () => {
    const handle = makeHandle();
    const host = makeHost();
    exposeTopResizeRim(handle, host);
    // N strip, NW corner, NE corner — all ly < 6 → no longer owned here.
    expect(handle.isPointInside(250, 5)).toBe(false);
    expect(handle.isPointInside(3, 3)).toBe(false);
    expect(handle.isPointInside(497, 2)).toBe(false);
    // Exactly on the boundary belongs to the handle again.
    expect(handle.isPointInside(250, 6)).toBe(true);
  });

  it('keeps points outside the handle excluded', () => {
    const handle = makeHandle();
    exposeTopResizeRim(handle, makeHost());
    expect(handle.isPointInside(-1, 15)).toBe(false);
    expect(handle.isPointInside(501, 15)).toBe(false);
    expect(handle.isPointInside(250, 31)).toBe(false);
  });

  it('restores the full handle on maximized windows (restore-drag needs it)', () => {
    const handle = makeHandle();
    const host = makeHost({ maximized: true });
    exposeTopResizeRim(handle, host);
    expect(handle.isPointInside(250, 3)).toBe(true);
    expect(handle.isPointInside(250, 15)).toBe(true);
  });

  it('keeps the full handle for dialogs (no resize affordance at all)', () => {
    const handle = makeHandle();
    exposeTopResizeRim(handle, makeHost({ isDialog: true }));
    expect(handle.isPointInside(250, 3)).toBe(true);
  });

  it('is idempotent — a second install does not stack exclusions', () => {
    const handle = makeHandle();
    exposeTopResizeRim(handle, makeHost());
    exposeTopResizeRim(handle, makeHost());
    expect(handle.isPointInside(250, 5)).toBe(false);
    expect(handle.isPointInside(250, 6)).toBe(true);
    expect(handle.isPointInside(250, 15)).toBe(true);
  });
});
