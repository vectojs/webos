/**
 * Notes app — TextArea is the sanctioned DOM exception for text input.
 * Save/Reload/Clear round-trips through the VFS; unsaved edits are guarded by
 * a ConfirmDialog before reload (WEB-0021), and read/write errors surface in
 * the status line instead of silently wiping the editor or rejecting
 * unhandled (review F5).
 */

import { Entity, type IRenderer } from '@vectojs/core';
import { baseName, type AppContext, type AppDefinition } from '@vectojs/desktop';
import { Stack, Text, TextArea } from '@vectojs/ui';
import { btn, ClientRoot, hstack, p, ThemedTextArea } from '../app/ui-helpers';
import { ConfirmDialog } from '../app/confirm-dialog';
import { appIconSvg } from '../desktop/icons';
import { UnsavedGuard } from '../model/unsaved-guard';

const WELCOME_TEXT = 'Welcome to VectoJS Notes!\nEdit your notes and save directly to VFS.\n';

let noteCounter = 0;

class NotesLayout extends Entity {
  constructor(
    private readonly status: Text,
    private readonly area: TextArea,
    private readonly toolbar: Stack,
    private readonly gap = 10,
  ) {
    super();
    this.clipChildren = true;
    this.add(status, area, toolbar);
  }

  public override isPointInside(gx: number, gy: number): boolean {
    const local = this.worldToLocal(gx, gy);
    if (!local) return false;
    return local.x >= 0 && local.y >= 0 && local.x <= this.width && local.y <= this.height;
  }

  public override render(_r: IRenderer): void {
    const width = Math.max(0, this.width);
    this.status.setMaxWidth(width);
    this.status.x = 0;
    this.status.y = 0;
    this.toolbar.x = 0;
    this.toolbar.y = Math.max(0, this.height - this.toolbar.height);
    this.area.x = 0;
    this.area.y = this.status.height + this.gap;
    this.area.width = width;
    this.area.height = Math.max(0, this.toolbar.y - this.gap - this.area.y);
  }
}

export const notesApp: AppDefinition = {
  id: 'notes',
  title: 'Untitled - Notepad',
  iconSvg: appIconSvg('notes'),
  instances: 'multiple',
  defaultWidth: 540,
  defaultHeight: 420,
  minWidth: 440,
  minHeight: 320,
  create: (ctx: AppContext) => {
    noteCounter++;
    const path = `/notes/note-${noteCounter}.txt`;
    const docName = baseName(path);
    // Baseline starts at the boot text: reloading pristine welcome copy loses
    // nothing, so no dialog — any divergence since boot is an edit.
    const guard = new UnsavedGuard(WELCOME_TEXT);

    const status = p('');
    const area = new ThemedTextArea({
      value: WELCOME_TEXT,
      placeholder: 'Type your note…',
      font: '13px "Consolas", monospace',
      width: 480,
      height: 280,
      onChange: () => refreshStatus(),
    });

    // The dialog overlays the client root (DEC-0006); resolved once create()
    // finishes assembling it. Click-time access only.
    const rootHolder: { root: ClientRoot | null } = { root: null };

    let statusBase = `Document: ${path}`;

    function refreshStatus(): void {
      status.setText(guard.isDirty(area.value) ? `${statusBase}  |  Unsaved edits` : statusBase);
      status.scene?.markDirty();
    }

    /** Write current content to the VFS. Returns success; status reports. */
    async function saveCurrent(): Promise<boolean> {
      const vfs = ctx.vfs;
      if (!vfs) {
        statusBase = `Document: ${path}  |  No filesystem`;
        refreshStatus();
        return false;
      }
      try {
        await vfs.write(path, area.value);
        guard.commit(area.value);
        statusBase = `Document: ${path}  |  Saved ${area.value.length} chars`;
        refreshStatus();
        return true;
      } catch (err) {
        statusBase = `Document: ${path}  |  Write failed: ${errorMessage(err)}`;
        refreshStatus();
        return false;
      }
    }

    /**
     * Reload from disk. While dirty, ask first — classic HIG caution alert:
     * Save (safe default) / Discard / Cancel, Esc keeps editing. Read errors
     * leave the editor content untouched and report in the status line.
     */
    async function reloadFromVfs(): Promise<void> {
      const vfs = ctx.vfs;
      if (!vfs) {
        statusBase = `Document: ${path}  |  No filesystem`;
        refreshStatus();
        return;
      }
      if (guard.isDirty(area.value) && rootHolder.root) {
        const choice = await ConfirmDialog.open(rootHolder.root, {
          title: 'Unsaved changes',
          message: `Save changes to ${docName} before reloading?`,
        });
        if (choice === 'cancel') return;
        if (choice === 'confirm' && !(await saveCurrent())) return;
      }
      try {
        // stat() separates "no file yet" (null → new-document reset, which is
        // safe now that the guard approved losing edits) from a failing read.
        const stat = await vfs.stat(path);
        if (!stat) {
          area.value = '';
          guard.commit('');
          statusBase = `Document: ${path} (New file)`;
          refreshStatus();
        } else {
          const data = await vfs.read(path);
          area.value = data;
          guard.commit(data);
          statusBase = `Document: ${path}  |  ${data.length} chars`;
          refreshStatus();
        }
      } catch (err) {
        statusBase = `Document: ${path}  |  Read failed: ${errorMessage(err)}`;
        refreshStatus();
      }
      area.scene?.markDirty();
    }

    const toolBar = hstack(
      [
        btn(
          '💾 Save',
          true,
          () => {
            void saveCurrent();
          },
          'Save',
        ),
        btn(
          '🔄 Reload',
          false,
          () => {
            void reloadFromVfs();
          },
          'Reload',
        ),
        btn(
          '🗑 Clear',
          false,
          () => {
            area.value = '';
            refreshStatus();
            area.scene?.markDirty();
          },
          'Clear',
        ),
      ],
      8,
    );
    const root = new ClientRoot(new NotesLayout(status, area, toolBar), 16);
    rootHolder.root = root;
    refreshStatus();
    return root;
  },
};

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
