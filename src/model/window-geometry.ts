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
