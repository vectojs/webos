import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'bun:test';

import {
  CLOCK_LINE_HEIGHT_PX,
  CLOCK_RESERVE_PX,
  ENTRIES_HOST_RESERVE_PX,
  ENTRIES_HOST_X_PX,
} from '../../src/desktop/taskbar-guard';

/**
 * Dist-contract drift guard (#27 review F3): taskbar-guard.ts mirrors
 * placement formulas that are private inside @vectojs/desktop. This test
 * reads the installed dist bundle and asserts every mirrored literal still
 * appears in the engine's own code — built from the guard's constants, so a
 * desktop upgrade that moves the engine (or a constant bumped here without
 * checking the engine) fails CI instead of drifting silently. The bundle is
 * unminified ESM ("module" entry); if that ever changes shape, the anchor
 * assertion below names the culprit explicitly.
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
      '(bun install) before running the taskbar guard contract tests.',
  );
}

const occurrences = (pattern: RegExp): number =>
  [...bundle.matchAll(new RegExp(pattern, 'g'))].length;

describe('taskbar guard ↔ @vectojs/desktop dist contract', () => {
  it('finds the unminified Taskbar source the mirror was written against', () => {
    expect(occurrences(/Taskbar = class/)).toBe(1);
  });

  it('mirrors the clock x placement (updateClock)', () => {
    expect(occurrences(new RegExp(`Math\\.max\\(0, this\\.width - ${CLOCK_RESERVE_PX}\\)`))).toBe(
      1,
    );
  });

  it('mirrors the clock y centering (updateClock)', () => {
    expect(occurrences(new RegExp(`\\(this\\.height - ${CLOCK_LINE_HEIGHT_PX}\\) \\/ 2`))).toBe(1);
  });

  it('mirrors the entries-host left inset (constructor)', () => {
    expect(occurrences(new RegExp(`entriesHost\\.x = ${ENTRIES_HOST_X_PX};`))).toBe(1);
  });

  it('mirrors the entries-host width reserve (constructor + setGeometry)', () => {
    expect(
      occurrences(new RegExp(`Math\\.max\\(0, (?:this\\.)?width - ${ENTRIES_HOST_RESERVE_PX}\\)`)),
    ).toBe(2);
  });

  it('mirrors the clock markers the structural lookup requires', () => {
    // findClockLabel refuses any Text that does not carry exactly these.
    expect(occurrences(/clockLabel\.interactive = false;/)).toBe(1);
    expect(occurrences(/clockLabel\.a11yProjection = "never";/)).toBe(1);
    expect(occurrences(/selectable: false/)).toBeGreaterThan(0);
  });
});
