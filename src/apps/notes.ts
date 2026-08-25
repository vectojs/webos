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
import type { ContextMenuItem } from '@vectojs/ui';
import { btn, ClientRoot, hstack, p, ThemedTextArea } from '../app/ui-helpers';
import { openConfirmDialog } from '../app/confirm-dialog';
import { appIconSvg } from '../desktop/icons';
import {
  registerWindowSurface,
  showSurfaceMenu,
  unregisterWindowSurface,
} from '../desktop/context-menu';
import { UnsavedGuard } from '../model/unsaved-guard';

const WELCOME_TEXT = 'Welcome to VectoJS Notes!\nEdit your notes and save directly to VFS.\n';

let noteCounter = 0;

/**
 * Open-with-path request channel (WEB-0039): desktop "New text document" and
 * future open-with flows set the next Notepad instance's document before
 * shell.open('notes'). Consumed once by the next create(); safe because Notes
 * is instances:'multiple' — an open always creates the consuming window.
 */
let pendingDocPath: string | null = null;

export function requestNoteDocument(path: string): void {
  pendingDocPath = path;
}

/** Window title of the requested document, or null when none is pending. */
export function peekPendingNoteWindowTitle(): string | null {
  return pendingDocPath ? `${baseName(pendingDocPath)} - Notepad` : null;
}

/**
 * Window title of the note that will be created by the NEXT open (audit #25
 * P2-D): the document name is deterministic (`note-<counter>.txt`), so the
 * taskbar and AT can carry it from launch instead of an anonymous
 * "Untitled". The engine has no live retitle API, so post-rename updates are
 * out of scope here.
 */
export function peekNextNoteWindowTitle(): string {
  return `note-${noteCounter + 1}.txt - Notepad`;
}

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
  // Fallback chrome/launcher label only — real window titles carry the
  // document name via peekNextNoteWindowTitle (see the main.ts open wrapper).
  title: 'Notepad',
  iconSvg: appIconSvg('notes'),
  instances: 'multiple',
  defaultWidth: 540,
  defaultHeight: 420,
  minWidth: 440,
  minHeight: 320,
  create: (ctx: AppContext) => {
    noteCounter++;
    const requestedPath = pendingDocPath;
    pendingDocPath = null;
    const path = requestedPath ?? `/notes/note-${noteCounter}.txt`;
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
        const choice = await openConfirmDialog(ctx.windowManager, {
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

    /**
     * Show persisted content immediately when this document already exists
     * (WEB-0035 defect A). After a reload the StorageVfs snapshot is restored
     * before any window opens, but the editor used to present seed text that
     * only an explicit Reload click replaced — the open path never read the
     * VFS. The restore stands down if the user started typing while the read
     * was in flight, so async loading can never clobber live edits.
     */
    function restorePersistedContent(): void {
      const vfs = ctx.vfs;
      if (!vfs) return;
      void (async () => {
        try {
          const stat = await vfs.stat(path);
          if (!stat) return; // new document — keep the welcome copy
          const data = await vfs.read(path);
          // Anything other than untouched seed text means the user typed
          // during the read; their edits win.
          if (area.value !== WELCOME_TEXT) return;
          area.value = data;
          guard.commit(data);
          statusBase = `Document: ${path}  |  ${data.length} chars`;
          refreshStatus();
        } catch {
          // Open stays on the seed text; read problems surface through the
          // explicit Reload path, which reports them in the status line.
        }
      })();
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

    // -------------------------------------------- right-click + owned chords
    // The edit menu operates on the projected shadow <textarea> (the sanctioned
    // DOM exception): cut/copy prefer execCommand (sync, gesture-permitted),
    // paste uses the async clipboard API and syncs the engine via a synthetic
    // input event (the projection forwards it as the entity 'change' event).
    function editorMirror(): HTMLTextAreaElement | null {
      const found = findTextArea(root);
      if (!found) return null;
      const el = document.getElementById(found.id);
      return el instanceof HTMLTextAreaElement ? el : null;
    }

    registerWindowSurface(ctx.windowId, {
      openContextMenu: (scene, x, y) => {
        const local = area.worldToLocal(x, y);
        const inEditor =
          local !== null &&
          local.x >= 0 &&
          local.y >= 0 &&
          local.x <= area.width &&
          local.y <= area.height;
        if (!inEditor) return;
        const el = editorMirror();
        if (!el) return;
        // Clipboard permission denials must not fail silently — the status
        // line carries a transient hint until the next refreshStatus().
        const reportClipboard = (ok: boolean): void => {
          if (!ok) {
            status.setText(`${statusBase}  |  Clipboard unavailable`);
            status.scene?.markDirty();
          }
        };
        showSurfaceMenu(
          scene,
          x,
          y,
          buildNotepadEditMenuItems(
            { hasSelection: el.selectionEnd > el.selectionStart },
            {
              cut: () => void mirrorCut(el).then(reportClipboard),
              copy: () => void mirrorCopy(el).then(reportClipboard),
              paste: () => void mirrorPaste(el).then(reportClipboard),
              selectAll: () => mirrorSelectAll(el),
            },
          ),
        );
      },
      handleShellChord: (chord) => {
        if (chord !== 'Control+S') return false;
        void saveCurrent();
        return true;
      },
    });
    ctx.windowManager.on((event) => {
      if (event.type === 'close' && event.window.windowId === ctx.windowId) {
        unregisterWindowSurface(ctx.windowId);
      }
    });

    refreshStatus();
    restorePersistedContent();
    return root;
  },
};

/** First TextArea under an entity subtree, depth-first. */
function findTextArea(root: Entity): TextArea | null {
  if (root instanceof TextArea) return root;
  for (const child of root.children ?? []) {
    const found = findTextArea(child);
    if (found) return found;
  }
  return null;
}

/**
 * Menu inventory for the Notepad editor surface. Cut/Copy disable without a
 * selection; Paste/Select All always apply. Shortcut hints are documentation
 * — the native editable path owns those chords.
 */
export function buildNotepadEditMenuItems(
  state: { hasSelection: boolean },
  actions: {
    cut: () => void;
    copy: () => void;
    paste: () => void;
    selectAll: () => void;
  },
): ContextMenuItem[] {
  return [
    {
      label: 'Cut',
      shortcut: 'Ctrl+X',
      disabled: !state.hasSelection,
      onClick: actions.cut,
    },
    {
      label: 'Copy',
      shortcut: 'Ctrl+C',
      disabled: !state.hasSelection,
      onClick: actions.copy,
    },
    { label: 'Paste', shortcut: 'Ctrl+V', onClick: actions.paste },
    { separator: true },
    { label: 'Select All', shortcut: 'Ctrl+A', onClick: actions.selectAll },
  ];
}

/** Sync a programmatic mirror mutation back into the canvas component. */
function emitInputEvent(el: HTMLTextAreaElement): void {
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

async function mirrorCopy(el: HTMLTextAreaElement): Promise<boolean> {
  const selected = el.value.slice(el.selectionStart, el.selectionEnd);
  if (document.execCommand?.('copy')) return true;
  try {
    await navigator.clipboard.writeText(selected);
    return true;
  } catch {
    return false;
  }
}

async function mirrorCut(el: HTMLTextAreaElement): Promise<boolean> {
  if (!document.execCommand?.('cut')) {
    const selected = el.value.slice(el.selectionStart, el.selectionEnd);
    try {
      await navigator.clipboard.writeText(selected);
    } catch {
      return false;
    }
    el.setRangeText('', el.selectionStart, el.selectionEnd, 'end');
    emitInputEvent(el);
  }
  return true;
}

async function mirrorPaste(el: HTMLTextAreaElement): Promise<boolean> {
  let text: string;
  try {
    text = await navigator.clipboard.readText();
  } catch {
    return false;
  }
  el.setRangeText(text, el.selectionStart, el.selectionEnd, 'end');
  emitInputEvent(el);
  return true;
}

function mirrorSelectAll(el: HTMLTextAreaElement): void {
  el.focus();
  el.select();
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
