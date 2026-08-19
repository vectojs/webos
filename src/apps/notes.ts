/**
 * Notes app — TextArea is the sanctioned DOM exception for text input.
 * Save/Reload/Clear round-trips through the VFS.
 */

import type { AppContext, AppDefinition, Vfs } from '@vectojs/desktop';
import { Text, TextArea } from '@vectojs/ui';
import { btn, ClientRoot, hstack, p, ThemedTextArea, vstack } from '../app/ui-helpers';

let noteCounter = 0;

export const notesApp: AppDefinition = {
  id: 'notes',
  title: 'Untitled - Notepad',
  icon: '📝',
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
        btn('💾 Save', true, () => {
          void persist(ctx.vfs, path, area.value, status);
        }),
        btn('🔄 Reload', false, () => {
          void hydrate(ctx.vfs, path, area, status);
        }),
        btn('🗑 Clear', false, () => {
          area.value = '';
          area.scene?.markDirty();
        }),
      ],
      8,
    );
    const stack = vstack([status, area, toolBar], 10);
    return new ClientRoot(stack, 16);
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
