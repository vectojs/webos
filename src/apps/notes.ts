/**
 * Notes app — TextArea is the sanctioned DOM exception for text input.
 * Save/Reload/Clear round-trips through the VFS.
 */

import { Entity, type IRenderer } from '@vectojs/core';
import type { AppContext, AppDefinition, Vfs } from '@vectojs/desktop';
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
    const area = new ThemedTextArea({
      value: 'Welcome to VectoJS Notes!\nEdit your notes and save directly to VFS.\n',
      placeholder: 'Type your note…',
      font: '13px "Consolas", monospace',
      width: 480,
      height: 280,
    });
    const status = p(`Document: ${path}`);
    const toolBar = hstack(
      [
        btn(
          '💾 Save',
          true,
          () => {
            void persist(ctx.vfs, path, area.value, status);
          },
          'Save',
        ),
        btn(
          '🔄 Reload',
          false,
          () => {
            void hydrate(ctx.vfs, path, area, status);
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

async function hydrate(vfs: Vfs | null, path: string, area: TextArea, status: Text): Promise<void> {
  if (!vfs) return;
  try {
    const data = await vfs.read(path);
    area.value = data;
    status.setText(`Document: ${path}  |  ${data.length} chars`);
  } catch {
    area.value = '';
    status.setText(`Document: ${path} (New file)`);
  }
  area.scene?.markDirty();
  status.scene?.markDirty();
}

async function persist(vfs: Vfs | null, path: string, data: string, status: Text): Promise<void> {
  if (!vfs) return;
  await vfs.write(path, data);
  status.setText(`Document: ${path}  |  Saved ${data.length} chars`);
  status.scene?.markDirty();
}
