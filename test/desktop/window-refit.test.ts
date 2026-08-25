import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'bun:test';

import {
  type RefitWindow,
  clampWindowsToArea,
  refitMaximized,
} from '../../src/desktop/window-refit';

/**
 * Engine-shaped window stub (taskbar-guard pattern): records setGeometry /
 * maximize calls so the re-fit decisions are asserted without a Scene.
 * setGeometry mirrors the engine's demotion rule — a maximized window that
 * receives setGeometry stops being maximized.
 */
interface StubWindow extends RefitWindow {
  geometryCalls: Array<{ x: number; y: number; width: number; height: number }>;
  maximizeCalls: number;
}

function stubWindow(
  init: Partial<RefitWindow> & {
    x: number;
    y: number;
    width: number;
    height: number;
  },
): StubWindow {
  const win: StubWindow = {
    maximized: false,
    minimized: false,
    ...init,
    geometryCalls: [],
    maximizeCalls: 0,
    setGeometry(x, y, width, height) {
      win.geometryCalls.push({ x, y, width, height });
      win.x = x;
      win.y = y;
      win.width = width;
      win.height = height;
      if (win.maximized) win.maximized = false;
    },
    maximize() {
      win.maximizeCalls += 1;
    },
  };
  return win;
}

/** The audited failure shape: zoom-in to a 568×355 viewport with a 40px taskbar. */
const SHRUNK_AREA = { x: 0, y: 40, width: 568, height: 315 };

describe('refitMaximized', () => {
  it('re-applies maximize on stale-boxed maximized windows (audited 1280×760 in 568×355)', () => {
    const stranded = stubWindow({
      x: 0,
      y: 0,
      width: 1280,
      height: 760,
      maximized: true,
    });
    refitMaximized([stranded]);
    expect(stranded.maximizeCalls).toBe(1);
    // No setGeometry from the app side: the engine's maximize() early return
    // owns the new work-area box and must keep `restored` intact.
    expect(stranded.geometryCalls).toHaveLength(0);
  });

  it('leaves normal windows alone', () => {
    const normal = stubWindow({ x: 20, y: 60, width: 400, height: 260 });
    refitMaximized([normal]);
    expect(normal.maximizeCalls).toBe(0);
    expect(normal.geometryCalls).toHaveLength(0);
  });

  it('also refits maximized+minimized windows (engine path touches no minimized state)', () => {
    const hidden = stubWindow({
      x: 0,
      y: 0,
      width: 1280,
      height: 760,
      maximized: true,
      minimized: true,
    });
    refitMaximized([hidden]);
    expect(hidden.maximizeCalls).toBe(1);
  });
});

describe('clampWindowsToArea', () => {
  it('shrinks an oversize window into the shrunken work area (audited 540×380 @ (72,8))', () => {
    const term = stubWindow({ x: 72, y: 8, width: 540, height: 380 });
    clampWindowsToArea([term], SHRUNK_AREA);
    expect(term.geometryCalls).toEqual([{ x: 28, y: 40, width: 540, height: 315 }]);
  });

  it('shrinks both axes when the window is wider and taller than the area', () => {
    const files = stubWindow({ x: 560, y: 80, width: 520, height: 470 });
    clampWindowsToArea([files], SHRUNK_AREA);
    expect(files.geometryCalls).toEqual([{ x: 48, y: 40, width: 520, height: 315 }]);
  });

  it('only moves windows that actually escape the area', () => {
    const inside = stubWindow({ x: 100, y: 100, width: 300, height: 200 });
    const escaping = stubWindow({ x: 500, y: 300, width: 300, height: 200 });
    clampWindowsToArea([inside, escaping], SHRUNK_AREA);
    expect(inside.geometryCalls).toHaveLength(0);
    expect(escaping.geometryCalls).toEqual([{ x: 268, y: 155, width: 300, height: 200 }]);
  });

  it('skips maximized windows (setGeometry would demote them; refitMaximized owns those)', () => {
    const maxed = stubWindow({
      x: 0,
      y: 0,
      width: 1280,
      height: 760,
      maximized: true,
    });
    clampWindowsToArea([maxed], SHRUNK_AREA);
    expect(maxed.geometryCalls).toHaveLength(0);
    expect(maxed.maximized).toBe(true);
  });

  it('skips minimized windows (their un-minimize emits "state" and gets clamped then)', () => {
    const hidden = stubWindow({
      x: 900,
      y: 900,
      width: 800,
      height: 600,
      minimized: true,
    });
    clampWindowsToArea([hidden], SHRUNK_AREA);
    expect(hidden.geometryCalls).toHaveLength(0);
  });

  it('converges: re-clamping after restore makes no further adjustments', () => {
    // E2 sequence: restore() replays the stale pre-maximize box inside the
    // shrunk viewport, then every wm event re-runs the clamp. First run
    // corrects, second run is a verified no-op (no loop with the stream).
    const restored = stubWindow({ x: 72, y: 8, width: 540, height: 380 });
    clampWindowsToArea([restored], SHRUNK_AREA);
    expect(restored.geometryCalls).toHaveLength(1);
    clampWindowsToArea([restored], SHRUNK_AREA);
    expect(restored.geometryCalls).toHaveLength(1);
  });
});

/**
 * Dist-contract drift guard (taskbar-guard.dist.test.ts pattern): the
 * compensations above lean on three private engine behaviors. Assert them
 * against the installed bundle so an upgrade that changes them fails here
 * instead of stranding windows silently.
 */
const distEntry = join(
  import.meta.dir,
  '..',
  '..',
  'node_modules',
  '@vectojs',
  'desktop',
  'dist',
  'index.mjs',
);

let bundle: string;
try {
  bundle = readFileSync(distEntry, 'utf8');
} catch {
  throw new Error(
    `Cannot read @vectojs/desktop dist at ${distEntry} — install dependencies ` +
      '(bun install) before running the window-refit contract tests.',
  );
}

describe('window-refit ↔ @vectojs/desktop dist contract', () => {
  it('maximize() reapplies the current work area when already maximized (E1 refit path)', () => {
    expect([...bundle.matchAll(/const area2 = this\.workArea\(\);/g)]).toHaveLength(1);
  });

  it('restore() still replays the stored box verbatim (E2 compensation stays required)', () => {
    expect(bundle.includes('applyGeom(r.x, r.y, r.width, r.height);')).toBe(true);
  });

  it('DisplayLayout.clampRect keeps the shrink-then-pin shape the math mirrors', () => {
    expect(bundle.includes('clampRect(x, y, w, h, displayId) {')).toBe(true);
  });
});
