/**
 * InputDialog — reusable canvas-native text prompt for Files rename and
 * New Folder flows (WEB-0039, issue #40). Mirrors the ConfirmDialog contract:
 * a REAL shell-modal via WindowManager.openDialog (@vectojs/desktop 0.7.0,
 * DEC-0006), Enter confirms, Escape cancels, opener focus restore owned by the
 * window manager; the destructive/no-op path is never bound to a reflex key.
 *
 * The input is a ThemedInput — the sanctioned DOM exception for text entry —
 * focused with its initial value preselected so typing replaces it, matching
 * the Browser address-bar convention (audit-3 #33).
 */

import { Entity, type IRenderer } from '@vectojs/core';
import type { AppContext, DesktopWindow, WindowManager } from '@vectojs/desktop';
import { Button } from '@vectojs/ui';
import { p, t, themedButton, ThemedInput } from './ui-helpers';
import { isWindowFocused } from './window-utils';

export interface InputDialogOptions {
  /** Accessible name of the dialog and heading text ("Rename "readme.txt""). */
  title: string;
  /** Optional body line under the heading ("Enter a name for the new folder."). */
  message?: string;
  /** Initial field value, preselected on open. Default ''. */
  initialValue?: string;
  /** Confirm-action label. Default 'OK'. */
  confirmLabel?: string;
}

const PANEL_WIDTH = 360;
const PAD = 16;
const TITLE_H = 20;
const MESSAGE_H = 22;
const INPUT_H = 30;
const BUTTON_W = 84;
const BUTTON_H = 28;
const BUTTON_GAP = 8;

/**
 * The prompt's client content: fixed-size themed panel hosting heading,
 * optional message, the text field and Cancel/Confirm actions. Keyboard
 * handling is gated on the hosting dialog window being focused, which the
 * window manager guarantees while the modal is open.
 */
class InputDialogPanel extends Entity {
  private readonly confirmAction: Button;
  private readonly cancelAction: Button;
  private readonly input: ThemedInput;
  private keyListener: ((e: KeyboardEvent) => void) | null = null;

  /** Invoked with the trimmed value; closes the dialog window. */
  submit: ((value: string | null) => void) | null = null;

  constructor(options: InputDialogOptions) {
    super();
    const message = options.message ?? '';
    this.width = PANEL_WIDTH;
    this.height = PAD + TITLE_H + 8 + (message ? MESSAGE_H + 6 : 0) + INPUT_H + 14 + BUTTON_H + PAD;

    const titleText = t(options.title, 14);
    titleText.interactive = false;
    const children: Entity[] = [titleText];
    let y = PAD + TITLE_H + 8;
    if (message) {
      const messageText = p(message);
      messageText.interactive = false;
      messageText.setMaxWidth(PANEL_WIDTH - PAD * 2);
      messageText.x = PAD;
      messageText.y = y;
      children.push(messageText);
      y += MESSAGE_H + 6;
    }

    this.input = new ThemedInput({
      width: PANEL_WIDTH - PAD * 2,
      value: options.initialValue ?? '',
      font: '500 12px "Segoe UI", system-ui, sans-serif',
    });
    this.input.height = INPUT_H;
    this.input.x = PAD;
    this.input.y = y;
    y += INPUT_H + 14;

    // Visual order matches ConfirmDialog: Cancel left of the safe default,
    // which is focused first so Enter means confirm without Tab hops.
    this.cancelAction = themedButton('Cancel', 'secondary', () => this.submit?.(null));
    this.confirmAction = themedButton(options.confirmLabel ?? 'OK', 'primary', () =>
      this.confirm(),
    );
    for (const action of [this.cancelAction, this.confirmAction]) {
      action.width = BUTTON_W;
      action.height = BUTTON_H;
      action.x = PAD + (action === this.cancelAction ? 0 : BUTTON_W + BUTTON_GAP);
      action.y = y;
    }
    this.add(titleText, ...children.slice(1), this.input, this.cancelAction, this.confirmAction);
  }

  private confirm(): void {
    const value = this.input.value.trim();
    this.submit?.(value.length > 0 ? value : null);
  }

  public override isPointInside(gx: number, gy: number): boolean {
    const local = this.worldToLocal(gx, gy);
    if (!local) return false;
    return local.x >= 0 && local.y >= 0 && local.x <= this.width && local.y <= this.height;
  }

  public override render(_r: IRenderer): void {}

  protected override onMounted(): void {
    this.keyListener = (e: KeyboardEvent) => {
      if (!this.submit || !isWindowFocused(this)) return;
      // Modifier chords belong to the shell, same guard as ConfirmDialog.
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      // Enter always means confirm; Escape always cancels — the modal window
      // holds focus while open, so the field need not carry it.
      if (e.key === 'Enter') {
        e.preventDefault();
        this.confirm();
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        this.submit?.(null);
      }
    };
    window.addEventListener('keydown', this.keyListener);
    // Preselect the initial value so typing replaces it (address-bar rule).
    this.input.focus();
    const el = document.activeElement;
    if (el instanceof HTMLInputElement) el.select();
  }

  public override destroy(): void {
    if (this.keyListener) {
      window.removeEventListener('keydown', this.keyListener);
      this.keyListener = null;
    }
    super.destroy();
  }
}

/**
 * Open a shell-modal text prompt. Resolves with the trimmed non-empty value
 * on confirm, or null when cancelled/empty/closed by ANY other route
 * (Escape, titlebar button, `ctx.close()`) — callers treat null as "do
 * nothing", never as a name.
 */
export function openInputDialog(
  wm: WindowManager,
  options: InputDialogOptions,
): Promise<string | null> {
  return new Promise<string | null>((resolve) => {
    let settled = false;
    let panel: InputDialogPanel | null = null;
    let win: DesktopWindow | null = null;
    let closeDialog: (() => void) | null = null;
    let off: () => void = () => {};
    const finish = (value: string | null): void => {
      if (settled) return;
      settled = true;
      off();
      resolve(value);
    };
    off = wm.on((event) => {
      if (event.type === 'close' && win && event.window === win) {
        if (panel) panel.submit = null;
        finish(null);
      }
    });
    panel = new InputDialogPanel(options);
    panel.submit = (value) => {
      panel!.submit = null;
      finish(value);
      closeDialog?.();
    };
    win = wm.openDialog({
      title: options.title,
      width: PANEL_WIDTH,
      height: panel.height,
      modal: true,
      dismissible: true,
      content: (_ctx: AppContext) => {
        closeDialog = () => _ctx.close();
        return panel!;
      },
    });
  });
}
