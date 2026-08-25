/**
 * Shared CSS-color parsing + alpha math for the chrome painters (WEB-0034
 * review F1). One implementation for every color form WebOS tokens use —
 * `#rgb`/`#rgba`/`#rrggbb`/`#rrggbbaa` and `rgb()`/`rgba()` — so falloff
 * paths can never silently pass a color through at full opacity (the
 * `.replace(')', …)` class of bug).
 */

export interface RgbColor {
  r: number;
  g: number;
  b: number;
  /** Alpha in 0..1; 1 when the source form carried none. */
  a: number;
}

const HEX_RE = /^#([0-9a-f]{3,8})$/i;
const RGB_RE = /^rgba?\(([^)]*)\)$/i;

/** Parse a token color form; returns null for anything unrecognized. */
export function parseColor(color: string): RgbColor | null {
  const value = color.trim();
  const hex = HEX_RE.exec(value);
  if (hex) {
    let h = hex[1]!;
    if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join('');
    if (h.length !== 6 && h.length !== 8) return null;
    return {
      r: Number.parseInt(h.slice(0, 2), 16),
      g: Number.parseInt(h.slice(2, 4), 16),
      b: Number.parseInt(h.slice(4, 6), 16),
      a: h.length === 8 ? Number.parseInt(h.slice(6, 8), 16) / 255 : 1,
    };
  }
  const fn = RGB_RE.exec(value);
  if (fn) {
    const parts = fn[1]!.split(',').map((p) => p.trim());
    if (parts.length < 3) return null;
    const ch = parts.slice(0, 3).map((p) => Number.parseFloat(p));
    const a = parts.length >= 4 ? Number.parseFloat(parts[3]!) : 1;
    if (ch.some((n) => !Number.isFinite(n)) || !Number.isFinite(a)) return null;
    return { r: ch[0]!, g: ch[1]!, b: ch[2]!, a };
  }
  return null;
}

function fmtAlpha(a: number): string {
  const clamped = Math.max(0, Math.min(1, a));
  return String(Number(clamped.toFixed(4)));
}

/**
 * Return `color` with its alpha multiplied by `factor` (clamped to 0..1),
 * normalized to `rgba(r,g,b,a)`. Unparseable colors pass through unchanged
 * so callers stay visible rather than vanishing.
 */
export function scaleAlpha(color: string, factor: number): string {
  const c = parseColor(color);
  if (!c) return color;
  return `rgba(${Math.round(c.r)},${Math.round(c.g)},${Math.round(c.b)},${fmtAlpha(c.a * factor)})`;
}

/**
 * Glow stack for era wordmarks (vaporwave start-menu title): `strength`
 * overdraws of `color`, faintest first (widest halo) to strongest last
 * (tight core), mirroring the historical `0.25/i` falloff. Peak alpha stays
 * at 0.25 so the glyph under the halo never receives an opaque coat.
 */
export function glowStackColors(color: string, strength: number): string[] {
  const layers: string[] = [];
  for (let i = Math.floor(strength); i >= 1; i--) {
    layers.push(scaleAlpha(color, 0.25 / i));
  }
  return layers;
}

/**
 * Darken a 6-digit hex color by multiplying its channels (clock secondary
 * line). Non-hex input passes through unchanged so callers stay visible.
 */
export function scaleHex(hex: string, factor: number): string {
  if (!/^#[0-9a-f]{6}$/i.test(hex.trim())) return hex;
  const c = parseColor(hex);
  if (!c) return hex;
  const channel = (v: number): string =>
    Math.round(Math.max(0, Math.min(255, v)) * factor)
      .toString(16)
      .padStart(2, '0');
  return `#${channel(c.r)}${channel(c.g)}${channel(c.b)}`;
}
