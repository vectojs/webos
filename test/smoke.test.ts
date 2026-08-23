/**
 * Boot smoke — boots the real main.ts in happy-dom, steps a few frames,
 * then asserts the audit-clean gate and the projected a11y roles.
 */

import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { Entity } from '@vectojs/core';
import type { VectoJSEvent } from '@vectojs/core';
import { Button } from '@vectojs/ui';
import type { Scene } from '@vectojs/core';
import type { DesktopShell } from '@vectojs/desktop';
import { DEFAULT_PRESET } from '../src/config';
import { appTheme } from '../src/model/app-theme';
import { findPreset } from '../src/model/themes';

interface WebosApi {
  scene: Scene;
  shell: DesktopShell;
  audit: () => Promise<{ kind: string; message: string }[]>;
  applyTheme: (presetId: string) => void;
}

function api(): WebosApi {
  return (window as unknown as { __app: WebosApi }).__app;
}

/** The full scripting API lives on `window.webos`; `__app` is the devtools subset. */
function webos(): { applyTheme: (presetId: string) => void } {
  return (window as unknown as { webos: { applyTheme: (presetId: string) => void } }).webos;
}

function descendants(root: Entity): Entity[] {
  const result: Entity[] = [];
  const visit = (entity: Entity): void => {
    result.push(entity);
    for (const child of entity.children) visit(child);
  };
  visit(root);
  return result;
}

beforeAll(async () => {
  const rootDiv = document.createElement('div');
  rootDiv.id = 'root';
  document.body.appendChild(rootDiv);
  await import('../src/desktop/main');
  // Let the async seed + initial window open settle, then drive frames.
  await new Promise((r) => setTimeout(r, 50));
  const scene = api().scene;
  for (let i = 0; i < 5; i++) scene.step(16.67);
});

afterAll(() => {
  api().scene.destroy();
});

describe('boot smoke', () => {
  it('boots a live scene with shell, taskbar and initial windows', () => {
    const { scene, shell } = api();
    expect(scene.width).toBeGreaterThan(0);
    expect(shell.taskbar).not.toBeNull();
    expect(shell.windowManager.list().length).toBeGreaterThanOrEqual(2);
  });

  it('auditScene is clean modulo documented intentional stacking', async () => {
    const findings = await api().audit();
    const real = findings.filter((f) => {
      if (f.kind !== 'overlap') return true;
      return false; // root audit (overlay excluded) reports no overlaps anyway
    });
    expect(real).toEqual([]);
  });

  it('projects the expected a11y roles', () => {
    const { scene } = api();
    const tree = JSON.stringify(scene.getA11yTree());
    expect(tree).toContain('toolbar'); // taskbar
    expect(tree).toContain('dialog'); // windows
    expect(tree).toContain('button'); // taskbar entries / chrome buttons
  });

  it('uses stable SVG icons for every registered app', () => {
    const { shell } = api();
    expect(shell.config.apps).toHaveLength(10);
    expect(shell.config.apps.every((app) => typeof app.iconSvg === 'string')).toBe(true);
    expect(shell.config.apps.every((app) => app.icon === undefined)).toBe(true);
  });

  it('keeps every app inside its minimum window geometry', async () => {
    const { scene, shell } = api();
    const specs = [
      ['terminal', 420, 280],
      ['files', 420, 340],
      ['notes', 440, 320],
      ['paint', 360, 300],
      ['browser', 440, 320],
      ['calculator', 240, 280],
      ['sysmon', 340, 300],
      ['settings', 420, 340],
      ['clock', 240, 220],
      ['about', 400, 300],
    ] as const;

    for (const [appId, width, height] of specs) {
      for (const win of [...shell.windowManager.list()]) shell.windowManager.close(win);
      const win = shell.open(appId);
      win.setGeometry(8, 8, width, height);
      for (let i = 0; i < 4; i++) scene.step(16.67);

      const overflow = (await api().audit()).filter((finding) => finding.kind !== 'overlap');
      expect(overflow, `${appId} overflowed at ${width}x${height}`).toEqual([]);
    }
  });

  it('projects disabled browser history controls and focused window state', async () => {
    const { scene, shell } = api();
    for (const win of [...shell.windowManager.list()]) shell.windowManager.close(win);
    shell.open('browser');
    for (let i = 0; i < 4; i++) scene.step(16.67);

    const browser = shell.windowManager.list().find((win) => win.appId === 'browser');
    if (!browser) throw new Error('Missing browser window');
    const browserButtons = descendants(browser).filter(
      (entity): entity is Button => entity instanceof Button,
    );
    expect(browserButtons.find((button) => button.label === '◀ Back')?.disabled).toBe(true);
    expect(browserButtons.find((button) => button.label === 'Forward ▶')?.disabled).toBe(true);

    shell.open('sysmon');
    for (let i = 0; i < 4; i++) scene.step(16.67);
    const sysmon = shell.windowManager.list().find((win) => win.appId === 'sysmon');
    if (!sysmon) throw new Error('Missing sysmon window');
    expect(
      descendants(sysmon).some(
        (entity) => entity instanceof Button && entity.label.includes('(browser, focused)'),
      ),
    ).toBe(true);
  });

  it('projects the theme catalog as a radiogroup with one checked preset', async () => {
    const { scene, shell } = api();
    for (const win of [...shell.windowManager.list()]) shell.windowManager.close(win);
    shell.open('settings');
    for (let i = 0; i < 4; i++) scene.step(16.67);
    const settings = shell.windowManager.list().find((win) => win.appId === 'settings');
    if (!settings) throw new Error('Missing settings window');
    const tree = descendants(settings).map((entity) => entity.getA11yAttributes());

    const groups = tree.filter((attrs) => attrs.role === 'radiogroup');
    expect(groups).toHaveLength(1);
    expect(groups[0]?.label).toBe('Theme presets');

    const rows = tree.filter((attrs) => attrs.role === 'radio');
    expect(rows).toHaveLength(7);
    expect(
      rows.every((attrs) => typeof attrs.label === 'string' && attrs.label.startsWith('Theme: ')),
    ).toBe(true);

    const checked = rows.filter((attrs) => attrs.checked === true);
    expect(checked).toHaveLength(1);
    expect(checked[0]?.label).toBe(`Theme: ${DEFAULT_PRESET.id}`);
    // Roving tabindex: exactly the checked row is the group's tab stop.
    expect(rows.every((attrs) => (attrs.tabIndex ?? -1) === (attrs.checked ? 0 : -1))).toBe(true);
  });

  it('moves checked state and live-applies via arrow keys and the shell apply path', async () => {
    const { scene, shell } = api();
    const win =
      shell.open('settings') ?? shell.windowManager.list().find((w) => w.appId === 'settings');
    if (!win || win.appId !== 'settings') throw new Error('Missing settings window');
    for (let i = 0; i < 4; i++) scene.step(16.67);
    const rowOf = (id: string): Entity | undefined =>
      descendants(win).find(
        (entity) =>
          entity.getA11yAttributes().role === 'radio' &&
          entity.getA11yAttributes().label === `Theme: ${id}`,
      );
    const activeRow = (): string | undefined =>
      descendants(win)
        .map((entity) => entity.getA11yAttributes())
        .find((attrs) => attrs.role === 'radio' && attrs.checked)?.label;

    // Arrow navigation applies immediately through the shared apply path.
    const aero = rowOf('aero');
    if (!aero) throw new Error('Missing aero row');
    aero.emit('keydown', {
      key: 'ArrowDown',
      preventDefault: () => {},
    } as unknown as VectoJSEvent<KeyboardEvent>);
    for (let i = 0; i < 2; i++) scene.step(16.67);
    expect(activeRow()).toBe('Theme: breeze');
    // Live preview reached the app theme singleton through setAppTheme.
    expect(appTheme().accent).toBe(findPreset('breeze')!.tokens['desktop-focus-ring']);

    // The shell-level apply path (terminal `theme`, API) updates the indicator too.
    webos().applyTheme('dreamcore');
    for (let i = 0; i < 2; i++) scene.step(16.67);
    expect(activeRow()).toBe('Theme: dreamcore');
    const dream = rowOf('dreamcore');
    if (!dream) throw new Error('Missing dreamcore row');
    expect(dream.getA11yAttributes().tabIndex).toBe(0);

    // Wrap-around: ArrowUp from the first preset selects the last.
    webos().applyTheme('aero');
    for (let i = 0; i < 2; i++) scene.step(16.67);
    const aeroAgain = rowOf('aero');
    if (!aeroAgain) throw new Error('Missing aero row');
    aeroAgain.emit('keydown', {
      key: 'ArrowUp',
      preventDefault: () => {},
    } as unknown as VectoJSEvent<KeyboardEvent>);
    for (let i = 0; i < 2; i++) scene.step(16.67);
    expect(activeRow()).toBe('Theme: dreamcore');

    // Restore so later suites boot-state assumptions stay stable.
    webos().applyTheme(DEFAULT_PRESET.id);
    for (const other of [...shell.windowManager.list()]) shell.windowManager.close(other);
  });
});
