/**
 * Files app — browse directories, open files in a read-only preview.
 * Pure VFS view; entries are clickable Button rows.
 */

import type { AppContext, AppDefinition, Vfs } from '@vectojs/desktop';
import { DOCUMENT_SCROLL_PHYSICS, ScrollView, Stack, Text } from '@vectojs/ui';
import { btn, p, ScrollableClientRoot, t } from '../app/ui-helpers';
import { openConfirmDialog } from '../app/confirm-dialog';
import { HRule } from './_hrule';
import { appIconSvg } from '../desktop/icons';
import { SEED_DOCS } from '../model/seed-docs';

type VfsEntry = Awaited<ReturnType<Vfs['list']>>[number];

/** Preview character ceiling — parity with the browser's truncated hint. */
const PREVIEW_LIMIT = 2000;

class FilesContent extends Stack {
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
    // Scrollable list region: rows stack inside a ScrollView so a long listing
    // scrolls instead of clipping (the outer vstack lays out once).
    const rowsHost = new Stack({ direction: 'vertical', gap: 2 });
    rowsHost.interactive = false;
    const scroll = new ScrollView({
      width: 480,
      height: 150,
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
        rowsHost.add(p('(Directory not found)'));
        countLabel.setText('0 items');
        return;
      }
      countLabel.setText(`${entries.length} item${entries.length === 1 ? '' : 's'}`);
      if (entries.length === 0) {
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
      syncScrollSize();
      rowsHost.scene?.markDirty();
    };

    const openEntry = async (name: string, kind: 'dir' | 'file'): Promise<void> => {
      if (!ctx.vfs) return;
      const target = currentDir === '/' ? `/${name}` : `${currentDir}/${name}`;
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
    void refresh().then(() => {
      preview.setText('Select a file to preview its contents.');
      preview.scene?.markDirty();
    });
    return root;
  },
};

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
