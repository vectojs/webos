/**
 * Chrome painter contracts (WEB-0034): fake-elevation parser + classic
 * bevel/pinstripe painters against a recording mock renderer.
 */

import { describe, expect, it } from 'bun:test';
import type { IRenderer } from '@vectojs/core';
import { drawShadow, parseShadowToken } from '../../src/chrome/shadow';
import { glowStackColors, parseColor, scaleAlpha, scaleHex } from '../../src/chrome/color';
import {
  drawPinstripes,
  drawRaisedBevel,
  drawSunkenBevel,
  type BevelColors,
} from '../../src/chrome/bevels';
import { findPreset } from '../../src/model/themes';

function mockRenderer(): {
  r: IRenderer;
  fills: string[];
  strokes: [string, number][];
  rects: number[][];
} {
  const fills: string[] = [];
  const strokes: [string, number][] = [];
  const rects: number[][] = [];
  const r = {
    beginPath: () => {},
    roundRect: (...args: number[]) => rects.push(args),
    rect: (...args: number[]) => rects.push(args),
    moveTo: () => {},
    lineTo: () => {},
    stroke: ((color: string, w?: number) => strokes.push([color, w ?? 1])) as IRenderer['stroke'],
    fill: ((color: string) => fills.push(String(color))) as IRenderer['fill'],
    fillText: () => {},
    save: () => {},
    restore: () => {},
  } as unknown as IRenderer;
  return { r, fills, strokes, rects };
}

describe('parseShadowToken', () => {
  it('parses single and multi-layer composites', () => {
    const layers = parseShadowToken('0 18 44 rgba(10,20,35,.34); 0 4 10 rgba(10,20,35,.22)');
    expect(layers).toHaveLength(2);
    expect(layers[0]).toEqual({
      dx: 0,
      dy: 18,
      blur: 44,
      color: 'rgba(10,20,35,.34)',
    });
    expect(layers[1]?.dy).toBe(4);
  });

  it('returns empty for the flat era (null/empty/garbage)', () => {
    expect(parseShadowToken(null)).toEqual([]);
    expect(parseShadowToken(undefined)).toEqual([]);
    expect(parseShadowToken('')).toEqual([]);
    expect(parseShadowToken('not a shadow')).toEqual([]);
  });

  it('accepts hex colors', () => {
    expect(parseShadowToken('2 -3 8 #FF71CE')[0]?.color).toBe('#FF71CE');
  });
});

describe('drawShadow', () => {
  it('draws bounded rings per layer with alpha falloff', () => {
    const { r, fills } = mockRenderer();
    drawShadow(r, 0, 0, 100, 50, 6, [{ dx: 0, dy: 18, blur: 26, color: 'rgba(255,113,206,.28)' }]);
    // blur 26 -> ceil(26/8)=4 rings; alpha must decrease outward.
    expect(fills.length).toBe(4);
    const alphas = fills.map((f) => Number(/([\d.]+)\)$/.exec(f)?.[1]));
    for (let i = 1; i < alphas.length; i++) {
      expect(alphas[i]).toBeLessThan(alphas[i - 1]!);
    }
  });

  it('zero-blur glow draws exactly one ring', () => {
    const { r, fills } = mockRenderer();
    drawShadow(r, 0, 0, 100, 50, 2, [
      ...parseShadowToken('0 0 26 rgba(255,113,206,.28)').slice(0, 0),
      { dx: 0, dy: 0, blur: 0, color: '#FF71CE' },
    ]);
    expect(fills).toHaveLength(1);
  });

  // Regression (review F1): hex layers used to bypass scaleAlpha and render
  // every ring at full opacity - a solid blob stack instead of a falloff.
  it('hex shadow tokens fade like rgba ones instead of rendering a solid stack', () => {
    const { r, fills } = mockRenderer();
    drawShadow(r, 0, 0, 100, 50, 6, parseShadowToken('2 -3 26 #FF71CE'));
    expect(fills.length).toBeGreaterThan(1);
    // Every ring is the parsed hex normalized to rgba - none passes through.
    expect(fills.every((f) => f.startsWith('rgba(255,113,206,'))).toBe(true);
    const alphas = fills.map((f) => Number(/([\d.]+)\)$/.exec(f)?.[1]));
    for (let i = 1; i < alphas.length; i++) {
      expect(alphas[i]).toBeLessThan(alphas[i - 1]!);
    }
    expect(alphas.every((a) => a < 1)).toBe(true);
  });
});

describe('color helpers (review F1)', () => {
  it('parses every token color form WebOS ships', () => {
    expect(parseColor('#FF71CE')).toEqual({ r: 255, g: 113, b: 206, a: 1 });
    expect(parseColor('#F7C')).toEqual({ r: 255, g: 119, b: 204, a: 1 });
    expect(parseColor('#FF71CE80')?.a).toBeCloseTo(128 / 255, 5);
    expect(parseColor('rgba(10,20,35,.34)')).toEqual({
      r: 10,
      g: 20,
      b: 35,
      a: 0.34,
    });
    expect(parseColor('rgb(1,2,3)')).toEqual({ r: 1, g: 2, b: 3, a: 1 });
    expect(parseColor('not-a-color')).toBeNull();
  });

  it('scaleAlpha multiplies alpha on hex input instead of passing it through', () => {
    expect(scaleAlpha('#FF71CE', 0.25)).toBe('rgba(255,113,206,0.25)');
    expect(scaleAlpha('#FF71CE', 2)).toBe('rgba(255,113,206,1)');
    expect(scaleAlpha('rgba(10,20,35,.34)', 0.5)).toBe('rgba(10,20,35,0.17)');
    expect(scaleAlpha('garbage', 0.5)).toBe('garbage');
  });

  it('vaporwave glow token yields a real falloff across the overdraw stack', () => {
    // The shipped token is HEX - the old `.replace(")", ...)` never matched
    // it, so both overdraws painted at full opacity.
    const tokens = findPreset('vaporwave')!.tokens;
    const color = String(tokens['desktop-glow-color']);
    const strength = Number(tokens['desktop-glow-strength']);
    expect(color).toBe('#FF71CE');
    const stack = glowStackColors(color, strength);
    expect(stack.length).toBe(strength);
    // Draw order is faintest halo first, strongest core last; peak alpha must
    // stay at 0.25 so the wordmark under the halo never gets an opaque coat.
    const alphas = stack.map((c) => Number(/rgba\(\d+,\d+,\d+,([\d.]+)\)/.exec(c)?.[1]));
    for (let i = 1; i < alphas.length; i++) {
      expect(alphas[i]).toBeGreaterThan(alphas[i - 1]!);
    }
    expect(Math.max(...alphas)).toBeLessThanOrEqual(0.25);
    // Channels survive untouched - only alpha steps down from full opacity.
    expect(stack.every((c) => c.startsWith('rgba(255,113,206,'))).toBe(true);
  });

  it('scaleHex darkens six-digit hex only, preserving output form', () => {
    expect(scaleHex('#FFFFFF', 0.72)).toBe('#b8b8b8');
    expect(scaleHex('#1084D0', 0.5)).toBe('#084268');
    // Non-hex passthrough keeps callers visible.
    expect(scaleHex('rgba(255,255,255,1)', 0.72)).toBe('rgba(255,255,255,1)');
    expect(scaleHex('#FFF', 0.72)).toBe('#FFF');
  });
});

const BEVEL: BevelColors = {
  lightOuter: '#FFFFFF',
  lightInner: '#DFDFDF',
  darkInner: '#808080',
  darkOuter: '#000000',
};

describe('bevels', () => {
  it('raised bevel paints 4 edges: two light, two dark', () => {
    const { r, strokes } = mockRenderer();
    drawRaisedBevel(r, 0, 0, 54, 30, BEVEL);
    expect(strokes).toHaveLength(4);
    expect(strokes.filter(([c]) => c === BEVEL.lightOuter || c === BEVEL.lightInner)).toHaveLength(
      2,
    );
    expect(strokes.filter(([c]) => c === BEVEL.darkInner || c === BEVEL.darkOuter)).toHaveLength(2);
  });

  it('sunken bevel swaps the tone order', () => {
    const { r, strokes } = mockRenderer();
    drawSunkenBevel(r, 0, 0, 40, 20, BEVEL);
    // Sunken top/left edge uses the DARK outer tone.
    expect(strokes[0]?.[0]).toBe(BEVEL.darkOuter);
    expect(strokes[2]?.[0]).toBe('#808080');
  });

  it('pinstripes respect the gap pitch', () => {
    const { r, strokes } = mockRenderer();
    drawPinstripes(r, 0, 0, 200, 30, 'rgba(15,40,90,0.08)', 3);
    // Height 30 / gap 3 -> ~9 lines starting at y=1 stepping 3.
    expect(strokes.length).toBeGreaterThanOrEqual(9);
    expect(strokes.every(([c]) => c === 'rgba(15,40,90,0.08)')).toBe(true);
  });
});
