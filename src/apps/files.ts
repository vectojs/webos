/**
 * Files app — browse directories, open files in a read-only preview.
 * Pure VFS view; entries are clickable Button rows.
 */

import type { AppContext, AppDefinition, Vfs } from '@vectojs/desktop';
import { Button, Stack } from '@vectojs/ui';
import { btn, ClientRoot, hstack, p, t, vstack } from '../app/ui-helpers';

type VfsEntry = Awaited<ReturnType<Vfs['list']>>[number];

export const filesApp: AppDefinition = {
  id: 'files',
  title: 'Computer',
  icon: '📁',
  instances: 'single',
  defaultWidth: 580,
  defaultHeight: 440,
  create: (ctx: AppContext) => {
    let currentDir = '/';
    const pathLabel = t('Location: /', 14);
    const preview = p('');
    const rowsHost = new Stack({ direction: 'vertical', gap: 2 });
    rowsHost.interactive = false;

    const clearRows = () => {
      for (const child of [...rowsHost.children]) {
        rowsHost.remove(child);
        child.destroy();
      }
    };

    const refresh = async (): Promise<void> => {
      if (!ctx.vfs) return;
      pathLabel.setText(`Location: ${currentDir}`);
      clearRows();
      preview.setText('');
      let entries: VfsEntry[];
      try {
        entries = await ctx.vfs.list(currentDir);
      } catch {
        rowsHost.add(p('(Directory not found)'));
        return;
      }
      if (entries.length === 0) {
        rowsHost.add(p('(empty directory)'));
        return;
      }
      for (const e of entries) {
        const icon = e.kind === 'dir' ? '📁' : '📄';
        const row = new Button(`${icon} ${e.name}  (${e.size} B)`, {
          bg: '#f8fafc',
          hoverBg: '#e2e8f0',
          color: '#0f172a',
          font: '500 12px "Segoe UI", system-ui, sans-serif',
          padding: 6,
          radius: 4,
          height: 26,
          onClick: () => {
            void openEntry(e.name, e.kind);
          },
        });
        row.a11yProjection = 'eager';
        rowsHost.add(row);
      }
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
        preview.setText(data.slice(0, 2000));
      } catch {
        preview.setText('(No such file or directory)');
      }
      preview.scene?.markDirty();
    };

    const navBar = hstack(
      [
        btn('📁 Root', false, () => {
          currentDir = '/';
          void refresh();
        }),
        btn('📄 /docs', false, () => {
          currentDir = '/docs';
          void refresh();
        }),
        btn('📝 /notes', false, () => {
          currentDir = '/notes';
          void refresh();
        }),
        btn('🔄 Refresh', false, () => {
          void refresh();
        }),
        btn('🌱 Seed Samples', true, () => {
          void seedSamples(ctx.vfs).then(refresh);
        }),
      ],
      6,
    );

    const stack = vstack(
      [
        pathLabel,
        navBar,
        t('Items (click a file to preview, a folder to open)', 14, '#1e293b', true, 460),
        rowsHost,
        t('Preview', 14, '#1e293b', true, 460),
        preview,
      ],
      10,
    );
    const root = new ClientRoot(stack, 18);
    void refresh();
    return root;
  },
};

async function seedSamples(vfs: Vfs | null): Promise<void> {
  if (!vfs) return;
  await vfs.mkdir('/notes');
  await vfs.mkdir('/docs');
  await vfs.mkdir('/system');
  await vfs.write(
    '/docs/readme.txt',
    'Welcome to VectoJS WebOS!\n\nA complete Zero-DOM Canvas operating environment.\nUse Ctrl+N for Notes, or double click any desktop icon.\n',
  );
  await vfs.write(
    '/docs/shortcuts.txt',
    '- Start Menu: Ctrl+Space\n- New Notes: Ctrl+N\n- Close Window: Ctrl+W\n- Maximize: Double-click Titlebar\n',
  );
}
