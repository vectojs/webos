/**
 * Classic chrome painters — Win98 4-tone bevels and Aqua pinstripes, drawn
 * through IRenderer only. Both consume tokens from the active preset
 * (`desktop-bevel-*`, `desktop-pinstripe-*`) so eras stay data-driven.
 */

import type { IRenderer } from '@vectojs/core';

export interface BevelColors {
  lightOuter: string;
  lightInner: string;
  darkInner: string;
  darkOuter: string;
}

function edge(
  r: IRenderer,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
  color: string,
): void {
  r.beginPath();
  r.moveTo(x1, y1);
  r.lineTo(x2, y2);
  r.lineTo(x3, y3);
  r.stroke(color, 1);
}

/**
 * Win98 raised bevel (buttons, taskbar): outer light top/left + outer dark
 * bottom/right, inner pair inset one pixel. 2px total.
 */
export function drawRaisedBevel(
  r: IRenderer,
  x: number,
  y: number,
  w: number,
  h: number,
  c: BevelColors,
): void {
  const R = x + w - 1;
  const B = y + h - 1;
  // Outer
  edge(r, x, B - 1, x, y, R - 1, y, c.lightOuter);
  edge(r, x, B, R, B, R, y, c.darkOuter);
  // Inner
  edge(r, x + 1, B - 2, x + 1, y + 1, R - 2, y + 1, c.lightInner);
  edge(r, x + 1, B - 1, R - 1, B - 1, R - 1, y + 1, c.darkInner);
}

/** Win98 sunken bevel (fields, tray wells): the raised pair inverted. */
export function drawSunkenBevel(
  r: IRenderer,
  x: number,
  y: number,
  w: number,
  h: number,
  c: BevelColors,
): void {
  drawRaisedBevel(r, x, y, w, h, {
    lightOuter: c.darkOuter,
    lightInner: c.darkInner,
    darkInner: c.lightInner,
    darkOuter: c.lightOuter,
  });
}

/**
 * Aqua pinstripes — 1px horizontal lines at a fixed pitch, drawn top-down
 * across the given box (titlebars, menu headers).
 */
export function drawPinstripes(
  r: IRenderer,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  gap: number,
): void {
  if (gap < 2) gap = 2;
  for (let py = Math.ceil(y) + 1; py < y + h; py += gap) {
    r.beginPath();
    r.moveTo(x, py + 0.5);
    r.lineTo(x + w, py + 0.5);
    r.stroke(color, 1);
  }
}
