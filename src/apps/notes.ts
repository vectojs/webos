/**
 * Notes app — TextArea is the sanctioned DOM exception for text input.
 * Save/Reload/Clear round-trips through the VFS; read/write errors surface
 * in the status line instead of silently wiping the editor or rejecting
 * unhandled (review F5).
 */

import { Entity, type IRenderer } from '@vectojs/core';
import type { AppContext, AppDefinition } from '@vectojs/desktop';
import { Stack, Text, TextArea } from '@vectojs/ui';
import { btn, ClientRoot, hstack, p, ThemedTextArea } from '../app/ui-helpers';
import { appIconSvg } from '../desktop/icons';

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
    const status = p(`Document: ${path}`);
    const area = new ThemedTextArea({
      value: 'Welcome to VectoJS Notes!\nEdit your notes and save directly to VFS.\n',
      placeholder: 'Type your note…',
      font: '13px "Consolas", monospace',
      width: 480,
      height: 280,
    });

    function setStatus(text: string): void {
      status.setText(text);
      status.scene?.markDirty();
    }

    /** Write current content to the VFS. Returns success; status reports. */
    async function saveCurrent(): Promise<boolean> {
      const vfs = ctx.vfs;
      if (!vfs) {
        setStatus(`Document: ${path}  |  No filesystem`);
        return false;
      }
      try {
        await vfs.write(path, area.value);
        setStatus(`Document: ${path}  |  Saved ${area.value.length} chars`);
        return true;
      } catch (err) {
        setStatus(`Document: ${path}  |  Write failed: ${errorMessage(err)}`);
        return false;
      }
    }

    /**
     * Reload from disk. Read errors leave the editor content untouched and
     * report in the status line; a missing file still resets to a new
     * document (nothing to lose).
     */
    async function reloadFromVfs(): Promise<void> {
      const vfs = ctx.vfs;
      if (!vfs) {
        setStatus(`Document: ${path}  |  No filesystem`);
        return;
      }
      try {
        // stat() separates "no file yet" (null → new-document reset) from a
        // failing read (editor content must survive).
        const stat = await vfs.stat(path);
        if (!stat) {
          area.value = '';
          setStatus(`Document: ${path} (New file)`);
        } else {
          const data = await vfs.read(path);
          area.value = data;
          setStatus(`Document: ${path}  |  ${data.length} chars`);
        }
      } catch (err) {
        setStatus(`Document: ${path}  |  Read failed: ${errorMessage(err)}`);
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
            area.scene?.markDirty();
          },
          'Clear',
        ),
      ],
      8,
    );
    return new ClientRoot(new NotesLayout(status, area, toolBar), 16);
  },
};

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
