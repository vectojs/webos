import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'bun:test';

/**
 * Dist-contract for the WebOSTaskbar replacement seam (WEB-0034; supersedes
 * WEB-0032's taskbar-guard mirror per carryctx DEC-0019).
 *
 * WebOSTaskbar occupies the PUBLIC `shell.taskbar` field but is a
 * @vectojs/ui UIComponent, not an engine Taskbar — the engine duck-types
 * whatever instance occupies the field. This test reads the installed
 * @vectojs/desktop dist and asserts every member the engine touches on that
 * field still exists with the shape src/desktop/taskbar.ts and main.ts
 * implement, so a desktop upgrade that renames or reshapes the seam fails CI
 * instead of crashing at runtime.
 */
const pkgDir = join(import.meta.dir, '..', '..', 'node_modules', '@vectojs', 'desktop');
const distEntry = join(pkgDir, 'dist', 'index.mjs');
const shellDts = join(pkgDir, 'dist', 'DesktopShell.d.ts');

let bundle: string;
try {
  bundle = readFileSync(distEntry, 'utf8');
} catch {
  throw new Error(
    `Cannot read @vectojs/desktop dist at ${distEntry} — install dependencies ` +
      '(bun install) before running the WebOS taskbar contract tests.',
  );
}

const occurrences = (pattern: RegExp): number =>
  [...bundle.matchAll(new RegExp(pattern, 'g'))].length;

describe('WebOS taskbar ↔ @vectojs/desktop dist contract', () => {
  it('finds the unminified Taskbar source the seam was written against', () => {
    expect(occurrences(/Taskbar = class/)).toBe(1);
  });

  it('declares shell.taskbar as a public mutable field (replacement seam)', () => {
    const dts = readFileSync(shellDts, 'utf8');
    expect(dts).toContain('taskbar: Taskbar | null;');
  });

  it('exposes DisplayLayout.setTaskbar for era bar-height sync (PX-0163)', () => {
    // main.ts applyTheme keeps workArea() in step with the painted bar via
    // this setter; a rename would strand the boot-time taskbarHeight.
    const layoutDts = readFileSync(join(pkgDir, 'dist', 'DisplayLayout.d.ts'), 'utf8');
    expect(layoutDts).toContain("setTaskbar(height: number, position: 'bottom' | 'top')");
  });

  it('resize repositions the field occupant via setGeometry(width, y)', () => {
    // WebOSTaskbar.setGeometry must keep this exact signature.
    expect(occurrences(/this\.taskbar\.setGeometry\(width, y\)/)).toBe(1);
  });

  it('setTheme destroys AND remounts an engine bar (applyTheme ordering)', () => {
    // main.ts installs the WebOS bar AFTER setTheme because of this remount;
    // if the engine stops remounting, installWebosTaskbar's instanceof early
    // return silently keeps the stale era's bar.
    expect(
      occurrences(
        /if \(this\.taskbar\) \{\s*this\.taskbar\.destroy\(\);\s*this\.mountTaskbar\(\);/,
      ),
    ).toBe(1);
  });

  it('dispose removes and destroys the field occupant', () => {
    expect(occurrences(/if \(this\.taskbar\.parent\) this\.scene\.remove\(this\.taskbar\);/)).toBe(
      1,
    );
  });

  it('outside-pointer dismissal reads x/y/width/height/startButtonRight', () => {
    // WebOSTaskbar must expose these members for menu-toggle hit testing.
    expect(occurrences(/lx >= tb\.x && lx <= tb\.x \+ tb\.startButtonRight/)).toBe(1);
  });

  it('WebOSTaskbar implements every member the engine touches', () => {
    const src = readFileSync(
      join(import.meta.dir, '..', '..', 'src', 'desktop', 'taskbar.ts'),
      'utf8',
    );
    expect(src).toContain('public setGeometry(width: number, y: number)');
    expect(src).toContain('get startButtonRight()');
    expect(src).toMatch(/public override destroy\(\): void/);
  });
});
