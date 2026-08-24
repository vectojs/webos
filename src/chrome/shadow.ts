/**
 * Fake elevation — stacked translucent roundRects approximating a blurred
 * drop shadow. The renderer has no blur primitive yet (forge finding
 * `renderer-and-gpu.md` 2026-08-25), so layers declared by the composite
 * `desktop-window-shadow` token are drawn as concentric rings with falloff
 * alpha under surfaces WebOS owns (start menu, context menu, splash).
 *
 * Composite grammar: `"dx dy blur rgba(r,g,b,a)"[; "..."]*` — offsets in px.
 */

import type { IRenderer } from '@vectojs/core';

export interface ShadowLayer {
  dx: number;
  dy: number;
  blur: number;
  color: string;
}

const LAYER_RE =
  /^(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(rgba?\([^)]*\)|#[0-9a-f]{3,8})$/i;

/** Parse the composite token; empty/absent -> [] (flat era). */
export function parseShadowToken(value: string | null | undefined): ShadowLayer[] {
  if (!value) return [];
  const layers: ShadowLayer[] = [];
  for (const part of value.split(';')) {
    const m = LAYER_RE.exec(part.trim());
    if (!m) continue;
    layers.push({
      dx: Number(m[1]),
      dy: Number(m[2]),
      blur: Math.max(0, Number(m[3])),
      color: m[4],
    });
  }
  return layers;
}

/** Scale the alpha of a css color string; non-rgba colors pass through. */
function scaleAlpha(color: string, factor: number): string {
  const m = /^rgba?\(([^)]*)\)$/i.exec(color);
  if (!m) return color;
  const parts = m[1].split(',').map((p) => p.trim());
  if (parts.length < 3) return color;
  const a = parts.length >= 4 ? Number.parseFloat(parts[3]) : 1;
  const scaled = Math.max(0, Math.min(1, a * factor));
  return `rgba(${parts[0]},${parts[1]},${parts[2]},${scaled})`;
}

/**
 * Draw one shadow layer as `rings` concentric roundRects expanding outward
 * with decreasing alpha — a cheap blur approximation that stays deterministic
 * and draw-call-bounded (rings scales with blur, capped).
 */
export function drawShadowLayer(
  r: IRenderer,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
  layer: ShadowLayer,
): void {
  const rings = Math.max(1, Math.min(5, Math.ceil(layer.blur / 8)));
  for (let j = 0; j < rings; j++) {
    const t = (j + 1) / rings;
    const expand = (layer.blur * t) / 2;
    // Nearest ring keeps most alpha; outer rings fade toward 0.
    const ringAlpha = (1 - t * 0.75) / rings;
    r.beginPath();
    r.roundRect(
      x - expand + layer.dx,
      y - expand + layer.dy,
      w + expand * 2,
      h + expand * 2,
      Math.max(0, radius + expand),
    );
    r.fill(scaleAlpha(layer.color, ringAlpha));
  }
}

/** Draw every layer of a parsed shadow behind a surface at x,y,w,h. */
export function drawShadow(
  r: IRenderer,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
  layers: ShadowLayer[],
): void {
  for (const layer of layers) drawShadowLayer(r, x, y, w, h, radius, layer);
}
