/**
 * Context menu inventories + window-surface registry (WEB-0039 / issue #40):
 * desktop menu order, state-aware titlebar verbs, Paint/Files/Notepad builders,
 * and register/unregister semantics of the per-window surface map.
 */

import { describe, expect, it } from 'bun:test';
import {
  buildDesktopContextMenuItems,
  buildTitlebarContextMenuItems,
  desktopContextMenuOpen,
  closeActiveContextMenu,
  registerWindowSurface,
  unregisterWindowSurface,
  windowSurface,
  type DesktopContextMenuActions,
} from '../../src/desktop/context-menu';
import { buildPaintCanvasMenuItems } from '../../src/apps/paint';
import { buildFileContextMenuItems, buildFilesEmptyAreaMenuItems } from '../../src/apps/files';
import { buildNotepadEditMenuItems } from '../../src/apps/notes';

function label(item: { label?: string; separator?: boolean }): string {
  return item.separator ? '---' : (item.label ?? '');
}

describe('desktop context menu inventory', () => {
  const noop = (): void => {};
  const actions: DesktopContextMenuActions = {
    refresh: noop,
    newDocument: noop,
    changeWallpaper: noop,
    openSettings: noop,
    openTaskManager: noop,
    openAbout: noop,
  };

  it('carries the full issue #40 inventory in order', () => {
    const items = buildDesktopContextMenuItems(actions).map(label);
    expect(items).toEqual([
      'Refresh',
      'New text document',
      '---',
      'Change wallpaper',
      'Display settings',
      '---',
      'Task Manager',
      'About WebOS',
    ]);
  });

  it('wires every non-separator item to its action', () => {
    let calls = 0;
    const items = buildDesktopContextMenuItems({
      refresh: () => calls++,
      newDocument: () => calls++,
      changeWallpaper: () => calls++,
      openSettings: () => calls++,
      openTaskManager: () => calls++,
      openAbout: () => calls++,
    });
    for (const item of items) if (!item.separator) item.onClick?.();
    expect(calls).toBe(6);
  });
});

describe('titlebar context menu inventory', () => {
  it('disables verbs whose state already holds', () => {
    const restored = buildTitlebarContextMenuItems(
      { minimized: false, maximized: false },
      {
        minimize: () => {},
        maximize: () => {},
        restore: () => {},
        close: () => {},
      },
    );
    expect(restored.map(label)).toEqual(['Minimize', 'Maximize', 'Restore', '---', 'Close']);
    expect(restored.find((i) => i.label === 'Restore')?.disabled).toBe(true);
    expect(restored.find((i) => i.label === 'Maximize')?.disabled).toBe(false);

    const maximized = buildTitlebarContextMenuItems(
      { minimized: false, maximized: true },
      {
        minimize: () => {},
        maximize: () => {},
        restore: () => {},
        close: () => {},
      },
    );
    expect(maximized.find((i) => i.label === 'Maximize')?.disabled).toBe(true);
    expect(maximized.find((i) => i.label === 'Restore')?.disabled).toBe(false);
  });
});

describe('app surface menu inventories', () => {
  it('Files entry rows offer Open/Rename/Delete with rename disabled for dirs', () => {
    const file = buildFileContextMenuItems(
      { name: 'readme.txt', kind: 'file' },
      { open: () => {}, rename: () => {}, remove: () => {} },
    );
    expect(file.map(label)).toEqual(['Open', 'Rename…', '---', 'Delete']);
    expect(file.find((i) => i.label === 'Rename…')?.disabled).toBe(false);

    const dir = buildFileContextMenuItems(
      { name: 'docs', kind: 'dir' },
      { open: () => {}, rename: () => {}, remove: () => {} },
    );
    // DEC-0029: VFS cannot move a dir subtree — rename stays file-only.
    expect(dir.find((i) => i.label === 'Rename…')?.disabled).toBe(true);
  });

  it('Files empty areas offer New folder (Paste deferred, DEC-0027)', () => {
    const items = buildFilesEmptyAreaMenuItems({ newFolder: () => {} }).map(label);
    expect(items).toEqual(['New folder…']);
  });

  it('Notepad edit menu disables cut/copy without a selection', () => {
    const actions = {
      cut: () => {},
      copy: () => {},
      paste: () => {},
      selectAll: () => {},
    };
    const noSelection = buildNotepadEditMenuItems({ hasSelection: false }, actions);
    expect(noSelection.map(label)).toEqual(['Cut', 'Copy', 'Paste', '---', 'Select All']);
    expect(noSelection.find((i) => i.label === 'Cut')?.disabled).toBe(true);
    // Paste never carries a disabled flag when enabled — assert absence too.
    expect(noSelection.find((i) => i.label === 'Paste')?.disabled ?? false).toBe(false);
    const selected = buildNotepadEditMenuItems({ hasSelection: true }, actions);
    expect(selected.find((i) => i.label === 'Cut')?.disabled).toBe(false);
  });

  it('Paint canvas menu disables both verbs on an empty canvas (DEC-0025)', () => {
    const actions = { undo: () => {}, clear: () => {} };
    const empty = buildPaintCanvasMenuItems({ strokeCount: 0 }, actions);
    expect(empty.map(label)).toEqual(['Undo', 'Clear canvas']);
    expect(empty.every((i) => i.disabled)).toBe(true);
    const drawn = buildPaintCanvasMenuItems({ strokeCount: 2 }, actions);
    expect(drawn.find((i) => i.label === 'Undo')?.disabled).toBe(false);
    expect(drawn.find((i) => i.label === 'Clear canvas')?.disabled).toBe(false);
  });
});

describe('window surface registry', () => {
  it('registers, returns and unregisters by windowId', () => {
    const surface = {
      openContextMenu: () => {},
      handleShellChord: () => true,
    };
    registerWindowSurface('win-1', surface);
    expect(windowSurface('win-1')).toBe(surface);
    unregisterWindowSurface('win-1');
    expect(windowSurface('win-1')).toBeUndefined();
  });

  it('re-registration replaces the previous surface for the same id', () => {
    const first = { openContextMenu: () => {} };
    const second = { openContextMenu: () => {} };
    registerWindowSurface('win-replace', first);
    registerWindowSurface('win-replace', second);
    expect(windowSurface('win-replace')).toBe(second);
    unregisterWindowSurface('win-replace');
  });

  it('desktopContextMenuOpen starts false and the closer is a safe no-op', () => {
    expect(desktopContextMenuOpen()).toBe(false);
    expect(() => closeActiveContextMenu()).not.toThrow();
  });
});
