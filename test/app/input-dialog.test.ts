/**
 * InputDialog (WEB-0039 / issue #40) — booted-shell modal contract, mirroring
 * the ConfirmDialog smoke pattern: real WindowManager.openDialog window,
 * focused with role=dialog, Enter confirms the (trimmed) value, Escape and
 * any other close route resolve null.
 */

import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import type { Entity } from '@vectojs/core';
import type { Scene } from '@vectojs/core';
import { Input } from '@vectojs/ui';
import type { DesktopShell } from '@vectojs/desktop';
import { openInputDialog } from '../../src/app/input-dialog';

interface WebosApi {
  scene: Scene;
  shell: DesktopShell;
}

function api(): WebosApi {
  return (window as unknown as { __app: WebosApi }).__app;
}

function descendants(root: Entity): Entity[] {
  const result: Entity[] = [];
  const visit = (entity: Entity): void => {
    result.push(entity);
    for (const child of entity.children ?? []) visit(child);
  };
  visit(root);
  return result;
}

beforeAll(async () => {
  const rootDiv = document.createElement('div');
  rootDiv.id = 'root';
  document.body.appendChild(rootDiv);
  window.location.search = '?nosplash';
  await import('../../src/desktop/main');
  await new Promise((r) => setTimeout(r, 50));
  const scene = api().scene;
  for (let i = 0; i < 5; i++) scene.step(16.67);
});

afterAll(() => {
  api().scene.destroy();
});

function closeEverything(): void {
  const { shell } = api();
  for (const win of [...shell.windowManager.list()]) shell.windowManager.close(win);
}

describe('openInputDialog', () => {
  it('opens a focused role=dialog window hosting a text field', async () => {
    closeEverything();
    const { scene, shell } = api();
    const answer = openInputDialog(shell.windowManager, {
      title: 'New folder',
      message: 'Enter a name for the new folder.',
      initialValue: 'New Folder',
      confirmLabel: 'Create',
    });
    for (let i = 0; i < 4; i++) scene.step(16.67);

    const dialog = shell.windowManager.list().find((win) => win.isDialog);
    expect(dialog).toBeDefined();
    expect(dialog!.focused).toBe(true);
    const attrs = dialog!.getA11yAttributes();
    expect(attrs.role).toBe('dialog');
    expect(attrs.label).toBe('New folder');

    // The initial value sits in the projected Input, preselected.
    const input = descendants(dialog!.clientContent).find((e) => e instanceof Input) as
      | Input
      | undefined;
    expect(input?.value).toBe('New Folder');

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    for (let i = 0; i < 2; i++) scene.step(16.67);
    await expect(answer).resolves.toBe(null);
  });

  it('Enter confirms the current (trimmed) value', async () => {
    closeEverything();
    const { scene, shell } = api();
    const answer = openInputDialog(shell.windowManager, {
      title: 'Rename "readme.txt"',
      initialValue: 'guide.txt',
      confirmLabel: 'Rename',
    });
    for (let i = 0; i < 4; i++) scene.step(16.67);

    const dialog = shell.windowManager.list().find((win) => win.isDialog)!;
    const input = descendants(dialog.clientContent).find((e) => e instanceof Input) as Input;
    input.value = '  Renamed.txt  ';
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    for (let i = 0; i < 2; i++) scene.step(16.67);
    await expect(answer).resolves.toBe('Renamed.txt');
  });

  it('an empty value confirms as null instead of a bogus name', async () => {
    closeEverything();
    const { scene, shell } = api();
    const answer = openInputDialog(shell.windowManager, {
      title: 'New folder',
      initialValue: 'New Folder',
    });
    for (let i = 0; i < 4; i++) scene.step(16.67);

    const dialog = shell.windowManager.list().find((win) => win.isDialog)!;
    const input = descendants(dialog.clientContent).find((e) => e instanceof Input) as Input;
    input.value = '   ';
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    for (let i = 0; i < 2; i++) scene.step(16.67);
    await expect(answer).resolves.toBe(null);
  });

  it('closing the dialog by any other route resolves null', async () => {
    closeEverything();
    const { scene, shell } = api();
    const answer = openInputDialog(shell.windowManager, {
      title: 'New folder',
      initialValue: 'New Folder',
    });
    for (let i = 0; i < 4; i++) scene.step(16.67);

    const dialog = shell.windowManager.list().find((win) => win.isDialog)!;
    shell.windowManager.close(dialog);
    for (let i = 0; i < 2; i++) scene.step(16.67);
    await expect(answer).resolves.toBe(null);
  });
});
