/**
 * Window placement math for viewport resizes (audit #25 P2-B).
 *
 * Pure functions so the clamping rules are bun-test-able without a Scene:
 * an aspect-changing browser resize must never leave a window stranded
 * outside the usable work area, but it must not re-center or otherwise
 * re-position windows that are still inside.
 */

export interface Area {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Position {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Clamp a window's top-left so its box lies inside `area`.
 * Windows larger than the area pin to the area origin (left/top) rather than
 * going negative; the caller decides whether that overflow is acceptable.
 */
export function clampPosition(x: number, y: number, w: number, h: number, area: Area): Position {
  const maxX = Math.max(area.x, area.x + area.width - w);
  const maxY = Math.max(area.y, area.y + area.height - h);
  return {
    x: Math.min(Math.max(x, area.x), maxX),
    y: Math.min(Math.max(y, area.y), maxY),
  };
}

/**
 * Shrink-and-pin clamp mirroring the engine's DisplayLayout.clampRect
 * (@vectojs/desktop 0.7.0): reduce the box into `area` FIRST, then pull the
 * top-left inside. A position-only clamp leaves a window wider/taller than
 * the area stranded past the bottom/right edge forever (issue #30: 4/5
 * windows outside after zoom-in to a 568×315 work area), so re-clamping must
 * shrink.
 *
 * `minWidth`/`minHeight` model the engine's per-window floors (Window
 * minWidth()/minHeight() are private in 0.7.0 typings — callers who know
 * their floor pass it; when the area is smaller than the floor the box
 * cannot fully fit and stays pinned at the area origin so the unavoidable
 * overflow runs off the bottom/right edges only). The engine's applyGeom
 * re-floors size AFTER any setGeometry keeping the pinned top-left, which is
 * exactly this function's output shape.
 */
export function clampRect(
  x: number,
  y: number,
  w: number,
  h: number,
  area: Area,
  minWidth = 1,
  minHeight = 1,
): Rect {
  const width = Math.min(Math.max(w, minWidth), Math.max(minWidth, area.width));
  const height = Math.min(Math.max(h, minHeight), Math.max(minHeight, area.height));
  const pos = clampPosition(x, y, width, height, area);
  return { x: pos.x, y: pos.y, width, height };
}

/**
 * Fit a preferred outer geometry into the current scene bounds, shrinking
 * size first and then clamping position — used for boot spawns on viewports
 * narrower than the preferred width.
 */
export function fitGeometry(
  pref: { x: number; y: number; width: number; height: number },
  sceneW: number,
  sceneH: number,
  taskbarHeight: number,
): { x: number; y: number; width: number; height: number } {
  const usableH = Math.max(0, sceneH - taskbarHeight);
  const width = Math.max(0, Math.min(pref.width, sceneW - 16));
  const height = Math.max(0, Math.min(pref.height, usableH - 16));
  const pos = clampPosition(pref.x, pref.y, width, height, {
    x: 8,
    y: 8,
    width: Math.max(0, sceneW - 16),
    height: Math.max(0, usableH - 16),
  });
  return { x: pos.x, y: pos.y, width, height };
}
