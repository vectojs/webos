/**
 * WCAG 2.x contrast math for #rrggbb colors — pure functions, no canvas or DOM
 * imports. Used by the per-theme token contrast contract test to measure real
 * ratios between derived app-theme token pairs.
 *
 * Thresholds enforced by the contract (spec 2026-08-23-ux-research-materials §4):
 *   >= 4.5:1 body-size text pairs, >= 3:1 rings / borders / state indicators.
 */

const HEX_RGB = /^#([0-9a-f]{6})$/i;
const LUMA_COEFFICIENTS = [0.2126, 0.7152, 0.0722] as const;

/** Linearize an sRGB channel per WCAG 2.x definition. */
function linearChannel(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function parseHexRgb(value: string): [number, number, number] {
  if (!HEX_RGB.test(value)) throw new TypeError(`not a #rrggbb color: ${value}`);
  return [
    Number.parseInt(value.slice(1, 3), 16),
    Number.parseInt(value.slice(3, 5), 16),
    Number.parseInt(value.slice(5, 7), 16),
  ];
}

/** WCAG 2.x relative luminance of a #rrggbb color. */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = parseHexRgb(hex);
  return (
    linearChannel(r) * LUMA_COEFFICIENTS[0]! +
    linearChannel(g) * LUMA_COEFFICIENTS[1]! +
    linearChannel(b) * LUMA_COEFFICIENTS[2]!
  );
}

/** WCAG 2.x contrast ratio between two #rrggbb colors, range 1..21. */
export function contrastRatio(foreground: string, background: string): number {
  const lf = relativeLuminance(foreground);
  const lb = relativeLuminance(background);
  const [lighter, darker] = lf >= lb ? [lf, lb] : [lb, lf];
  return (lighter + 0.05) / (darker + 0.05);
}
