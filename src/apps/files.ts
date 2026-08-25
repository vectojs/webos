/**
 * Files app — browse directories, open files in a read-only preview.
 * Pure VFS view; entries are clickable Button rows.
 *
 * Right-click (WEB-0039 / issue #40): an entry row offers Open / Rename… /
 * Delete, an empty area offers New folder… — routed here by the shell's
 * context-menu router through the window surface registered in create().
 * Clipboard Paste is deferred (DEC-0027: no clipboard infra exists yet).
 */

import type { AppContext, AppDefinition, Vfs } from '@vectojs/desktop';
import { DOCUMENT_SCROLL_PHYSICS, ScrollView, Stack, Text } from '@vectojs/ui';
import type { ContextMenuItem } from '@vectojs/ui';
import { btn, p, ScrollableClientRoot, t } from '../app/ui-helpers';
import { openConfirmDialog } from '../app/confirm-dialog';
import { openInputDialog } from '../app/input-dialog';
import { HRule } from './_hrule';
import { appIconSvg } from '../desktop/icons';
import {
  registerWindowSurface,
  showSurfaceMenu,
  unregisterWindowSurface,
} from '../desktop/context-menu';
import { SEED_DOCS } from '../model/seed-docs';
import { nextAvailableName } from '../model/vfs-names';

type VfsEntry = Awaited<ReturnType<Vfs['list']>>[number];

/** Minimal entry shape the item-menu builder needs (pure/testable). */
export interface FileEntryRef {
  name: string;
  kind: 'dir' | 'file';
}

export interface FileItemMenuActions {
  open: () => void;
  rename: () => void;
  remove: () => void;
}

/**
 * Entry-row menu. Rename is disabled for directories: VFS rename is
 * read-write-remove, which cannot move a dir's subtree (delete cascades,
 * copy does not) — recorded as a known limit in the issue table.
 */
export function buildFileContextMenuItems(
  entry: FileEntryRef,
  actions: FileItemMenuActions,
): ContextMenuItem[] {
  return [
    { label: 'Open', onClick: actions.open },
    {
      label: 'Rename…',
      disabled: entry.kind === 'dir',
      onClick: actions.rename,
    },
    { separator: true },
    { label: 'Delete', onClick: actions.remove },
  ];
}

export interface FilesEmptyAreaMenuActions {
  newFolder: () => void;
}

/** Empty-area menu. Paste lands here once clipboard infra exists (DEC-0027). */
export function buildFilesEmptyAreaMenuItems(
  actions: FilesEmptyAreaMenuActions,
): ContextMenuItem[] {
  return [{ label: 'New folder…', onClick: actions.newFolder }];
}

/** Preview character ceiling — parity with the browser's truncated hint. */
const PREVIEW_LIMIT = 2000;

/** Floor for the list viewport so tiny windows keep a usable listing. */
export const FILES_MIN_LIST_HEIGHT = 120;

/**
 * Lays out the client column: every sibling keeps its own height and the
 * inner list ScrollView takes the remaining window height (audit-3, issue
 * #33 — it was a hardcoded 150px strip that never grew with the window).
 */
export class FilesContent extends Stack {
  constructor(
    private readonly navBar: Stack,
    private readonly list: ScrollView,
    private readonly rows: Stack,
    private readonly responsiveText: Text[],
  ) {
    super({ direction: 'vertical', gap: 12 });
  }

  public override layout(): void {
    const width = Math.max(0, this.width);
    this.navBar.maxWidth = width;
    this.navBar.layout();
    let others = 0;
    for (const child of this.children) {
      if (child !== this.list) others += child.height;
    }
    const gaps = Math.max(0, this.children.length - 1) * this.gap;
    // `this.height` is the client-area height the hosting root assigned before
    // layout; at minimum-size windows the floor overflows into the outer
    // document scroll, which is its reason to exist.
    this.list.height = Math.max(FILES_MIN_LIST_HEIGHT, this.height - others - gaps);
    this.list.width = width;
    for (const row of this.rows.children) row.width = width;
    this.rows.width = width;
    this.rows.layout();
    this.list.content.width = width;
    this.list.content.height = Math.max(this.rows.height, this.list.height);
    for (const text of this.responsiveText) {
      if (text.maxWidth !== width) text.setMaxWidth(width);
    }
    super.layout();
  }
}

export const filesApp: AppDefinition = {
  id: 'files',
  title: 'Computer',
  iconSvg: appIconSvg('files'),
  instances: 'single',
  defaultWidth: 580,
  defaultHeight: 470,
  minWidth: 420,
  minHeight: 340,
  create: (ctx: AppContext) => {
    let currentDir = '/';
    const pathLabel = t('Location: /', 14);
    const preview = p('');
    const countLabel = p('0 items', 11);
    // Entries aligned 1:1 with rowsHost.children after each refresh — the
    // right-click hit-test zips the two (guard: equal, non-zero length).
    let listedEntries: VfsEntry[] = [];
    // Scrollable list region: rows stack inside a ScrollView whose viewport
    // height FilesContent.layout() binds to the window client area, so a tall
    // window shows more listing instead of clipping at a fixed strip.
    const rowsHost = new Stack({ direction: 'vertical', gap: 2 });
    rowsHost.interactive = false;
    const scroll = new ScrollView({
      width: 480,
      height: FILES_MIN_LIST_HEIGHT,
      scrollPhysics: DOCUMENT_SCROLL_PHYSICS,
    });
    scroll.content.add(rowsHost);

    const syncScrollSize = () => {
      scroll.content.width = scroll.width;
      scroll.content.height = Math.max(rowsHost.height, scroll.height);
    };

    const clearRows = () => {
      for (const child of [...rowsHost.children]) {
        rowsHost.remove(child);
        child.destroy();
      }
      syncScrollSize();
    };

    let hasLoaded = false;
    const refresh = async (): Promise<void> => {
      if (!ctx.vfs) return;
      pathLabel.setText(`Location: ${currentDir}`);
      clearRows();
      // Keep the initial hint until the first load lands; navigation clears
      // stale previews instead.
      if (hasLoaded) preview.setText('');
      hasLoaded = true;
      let entries: VfsEntry[];
      try {
        entries = await ctx.vfs.list(currentDir);
      } catch {
        listedEntries = [];
        rowsHost.add(p('(Directory not found)'));
        countLabel.setText('0 items');
        return;
      }
      countLabel.setText(`${entries.length} item${entries.length === 1 ? '' : 's'}`);
      if (entries.length === 0) {
        listedEntries = [];
        rowsHost.add(p('(empty directory)'));
        return;
      }
      for (const e of entries) {
        const icon = e.kind === 'dir' ? '📁' : '📄';
        const name = `${e.name}  (${e.size} B)`;
        // Glyph is decoration; the accessible name carries plain text only.
        const row = btn(
          `${icon} ${name}`,
          false,
          () => {
            void openEntry(e.name, e.kind);
          },
          name,
        );
        row.height = 26;
        rowsHost.add(row);
      }
      listedEntries = entries;
      syncScrollSize();
      rowsHost.scene?.markDirty();
    };

    const openEntry = async (name: string, kind: 'dir' | 'file'): Promise<void> => {
      if (!ctx.vfs) return;
      const target = pathFor(name);
      if (kind === 'dir') {
        currentDir = target;
        await refresh();
        return;
      }
      try {
        const data = await ctx.vfs.read(target);
        // Truncation hint parity with the browser (audit #25 P2-D): a silent
        // cut read like a complete file.
        preview.setText(
          data.length > PREVIEW_LIMIT
            ? `${data.slice(0, PREVIEW_LIMIT)}\n\n[Preview truncated — showing ${PREVIEW_LIMIT} of ${data.length} characters. Open the file in Notes to read the rest.]`
            : data,
        );
      } catch {
        preview.setText('(No such file or directory)');
      }
      preview.scene?.markDirty();
    };

    /** Absolute VFS path of an entry in the current directory. */
    function pathFor(name: string): string {
      return currentDir === '/' ? `/${name}` : `${currentDir}/${name}`;
    }

    /**
     * Entry under a scene point, or null when the point is on empty listing
     * area / a placeholder row (alignment guard keeps placeholders unzippable).
     */
    function entryAtPoint(x: number, y: number): VfsEntry | null {
      const rows = [...rowsHost.children];
      if (listedEntries.length === 0 || rows.length !== listedEntries.length) {
        return null;
      }
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]!;
        const local = row.worldToLocal(x, y);
        if (!local) continue;
        if (local.x >= 0 && local.y >= 0 && local.x <= row.width && local.y <= row.height) {
          return listedEntries[i] ?? null;
        }
      }
      return null;
    }

    /** Rename a FILE via the shell-modal prompt; dirs are disabled upstream. */
    async function renameEntry(name: string): Promise<void> {
      const vfs = ctx.vfs;
      if (!vfs) return;
      const next = await openInputDialog(ctx.windowManager, {
        title: `Rename "${name}"`,
        initialValue: name,
        confirmLabel: 'Rename',
      });
      if (next === null || next === name || next.includes('/')) return;
      const result = await renameVfsFile(vfs, currentDir, name, next);
      if (result === 'exists') {
        preview.setText(`(Rename failed: "${next}" already exists here.)`);
      } else if (result === 'error') {
        preview.setText('(Rename failed.)');
      }
      if (result !== 'ok') {
        preview.scene?.markDirty();
        return;
      }
      await refresh();
    }

    /** Delete a file or folder after an explicit destructive confirmation. */
    async function deleteEntry(name: string, kind: 'dir' | 'file'): Promise<void> {
      const vfs = ctx.vfs;
      if (!vfs) return;
      const choice = await openConfirmDialog(ctx.windowManager, {
        title: kind === 'dir' ? `Delete folder "${name}"?` : `Delete "${name}"?`,
        message:
          kind === 'dir'
            ? 'The folder and everything inside it will be removed.'
            : 'The file will be removed from this WebOS.',
        confirmLabel: 'Keep it',
        discardLabel: 'Delete',
      });
      // 'discard' is the isolated destructive verb; Enter/cancel keep the file.
      if (choice !== 'discard') return;
      if (!(await deleteVfsEntry(vfs, currentDir, name))) {
        preview.setText('(Delete failed.)');
        preview.scene?.markDirty();
        return;
      }
      await refresh();
    }

    /** Create a folder in the current directory, auto-suffixing collisions. */
    async function createFolder(): Promise<void> {
      const vfs = ctx.vfs;
      if (!vfs) return;
      const desired = await openInputDialog(ctx.windowManager, {
        title: 'New folder',
        message: 'Enter a name for the new folder.',
        initialValue: 'New Folder',
        confirmLabel: 'Create',
      });
      if (desired === null || desired.includes('/')) return;
      const finalName = await createVfsDir(vfs, currentDir, desired);
      if (finalName === '') {
        preview.setText('(Could not create folder.)');
        preview.scene?.markDirty();
        return;
      }
      await refresh();
    }

    const navBar = new Stack({ direction: 'horizontal', gap: 6, wrap: true });
    for (const button of [
      btn(
        '📁 Root',
        false,
        () => {
          currentDir = '/';
          void refresh();
        },
        'Root',
      ),
      btn(
        '📄 /docs',
        false,
        () => {
          currentDir = '/docs';
          void refresh();
        },
        '/docs',
      ),
      btn(
        '📝 /notes',
        false,
        () => {
          currentDir = '/notes';
          void refresh();
        },
        '/notes',
      ),
      btn(
        '🔄 Refresh',
        false,
        () => {
          void refresh();
        },
        'Refresh',
      ),
      btn(
        '🌱 Seed Samples',
        true,
        () => {
          void confirmSeedSamples(ctx).then(refresh);
        },
        'Seed Samples',
      ),
    ]) {
      navBar.add(button);
    }

    const itemsTitle = t('Items (click a file to preview, a folder to open)', 14);
    const previewTitle = t('Preview', 14);
    const content = new FilesContent(navBar, scroll, rowsHost, [
      pathLabel,
      itemsTitle,
      previewTitle,
      preview,
      countLabel,
    ]);
    for (const child of [
      pathLabel,
      navBar,
      itemsTitle,
      scroll,
      new HRule(),
      previewTitle,
      preview,
      countLabel,
    ]) {
      content.add(child);
    }
    const root = new ScrollableClientRoot(
      content,
      [pathLabel, itemsTitle, previewTitle, preview, countLabel],
      18,
    );

    // Right-click surface (issue #40): the shell router calls this with the
    // scene point; entry rows get the item menu, anything else in the client
    // area gets the empty-area menu.
    registerWindowSurface(ctx.windowId, {
      openContextMenu: (scene, x, y) => {
        const entry = entryAtPoint(x, y);
        if (entry) {
          showSurfaceMenu(
            scene,
            x,
            y,
            buildFileContextMenuItems(entry, {
              open: () => void openEntry(entry.name, entry.kind),
              rename: () => void renameEntry(entry.name),
              remove: () => void deleteEntry(entry.name, entry.kind),
            }),
          );
        } else {
          showSurfaceMenu(
            scene,
            x,
            y,
            buildFilesEmptyAreaMenuItems({
              newFolder: () => void createFolder(),
            }),
          );
        }
      },
    });
    ctx.windowManager.on((event) => {
      if (event.type === 'close' && event.window.windowId === ctx.windowId) {
        unregisterWindowSurface(ctx.windowId);
      }
    });

    void refresh().then(() => {
      preview.setText('Select a file to preview its contents.');
      preview.scene?.markDirty();
    });
    return root;
  },
};

/** Absolute VFS path of `name` inside `dir` (root-safe join). */
function joinPath(dir: string, name: string): string {
  return dir === '/' ? `/${name}` : `${dir}/${name}`;
}

/** Outcome of {@link renameVfsFile}. */
export type RenameResult = 'ok' | 'exists' | 'error';

/**
 * Rename a FILE inside `dir`: read → write → remove (the VFS has no move).
 * A destination that already exists fails with 'exists' instead of clobbering
 * it — the old silent overwrite class of bug (audit #25 P2-D), kept dead.
 * Exported for direct VFS round-trip tests; dirs never reach it (DEC-0029).
 *
 * Known crash-window (review PX-0225): process death between
 * write(destination) and remove(source) strands BOTH copies — a duplicate,
 * never a loss, because remove(source) runs only after the destination write
 * succeeded, so the content is always represented somewhere on disk. The
 * best-effort unwind below covers thrown errors only; Ctrl+R is swallowed
 * (DEC-0028), but the Ctrl+Shift+R valve or a tab close can still land here.
 */
export async function renameVfsFile(
  vfs: Vfs,
  dir: string,
  from: string,
  to: string,
): Promise<RenameResult> {
  const source = joinPath(dir, from);
  const destination = joinPath(dir, to);
  try {
    if ((await vfs.stat(destination)) !== null) return 'exists';
    const data = await vfs.read(source);
    await vfs.write(destination, data);
    await vfs.remove(source);
    return 'ok';
  } catch {
    // Best-effort unwind so a half-finished rename cannot strand a copy.
    try {
      if ((await vfs.stat(destination)) !== null && (await vfs.stat(source)) !== null) {
        await vfs.remove(destination);
      }
    } catch {
      // Unwind is best-effort too; surface 'error' regardless.
    }
    return 'error';
  }
}

/** Remove a file OR folder (remove cascades) from `dir`. */
export async function deleteVfsEntry(vfs: Vfs, dir: string, name: string): Promise<boolean> {
  try {
    await vfs.remove(joinPath(dir, name));
    return true;
  } catch {
    return false;
  }
}

/**
 * Create a folder named `desired`, auto-suffixing collisions via
 * nextAvailableName. Returns the FINAL folder name ('' on failure) so the
 * caller can refresh/report accurately.
 */
export async function createVfsDir(vfs: Vfs, dir: string, desired: string): Promise<string> {
  try {
    const existing = (await vfs.list(dir)).map((entry) => entry.name);
    const finalName = nextAvailableName(existing, desired);
    await vfs.mkdir(joinPath(dir, finalName));
    return finalName;
  } catch {
    return '';
  }
}

/**
 * Rewrite the sample documents from the shared seed constant. Overwriting
 * existing files asks first (audit #25 P2-D) — the old silent overwrite could
 * destroy user edits to /docs with no warning.
 */
async function confirmSeedSamples(ctx: AppContext): Promise<void> {
  if (!ctx.vfs) return;
  const existing = await Promise.all(
    Object.keys(SEED_DOCS).map(async (path) => (await ctx.vfs?.stat(path)) !== null),
  );
  const overwrites = existing.some(Boolean);
  if (
    overwrites &&
    (await openConfirmDialog(ctx.windowManager, {
      title: 'Overwrite sample documents?',
      message:
        'Seeding replaces /docs/readme.txt and /docs/shortcuts.txt with their original copies. Your edits to them are lost.',
      confirmLabel: 'Replace',
    })) !== 'confirm'
  ) {
    return;
  }
  await seedSamples(ctx.vfs);
}

async function seedSamples(vfs: Vfs | null): Promise<void> {
  if (!vfs) return;
  await vfs.mkdir('/notes');
  await vfs.mkdir('/docs');
  await vfs.mkdir('/system');
  // Same source as the boot seeder — the two copies can no longer drift.
  for (const [path, content] of Object.entries(SEED_DOCS)) {
    await vfs.write(path, content);
  }
}
