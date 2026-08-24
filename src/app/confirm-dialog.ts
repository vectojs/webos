/**
 * ConfirmDialog — reusable canvas-native modal for unsaved-changes prompts
 * (WEB-0021, classic Mac HIG caution-alert layout).
 *
 * Three verb-named actions laid out so the destructive one is physically
 * isolated from the safe pair: Discard sits left-aligned under the message,
 * Cancel + Save right-aligned, Save (the safe default) innermost-right and
 * focused first. Enter always means confirm, Escape always means Cancel
 * (keep editing); the destructive action is reachable only by explicit Tab
 * navigation or pointer, never by a reflex key.
 *
 * Since @vectojs/desktop 0.7.0 (WEB-0027) the prompt is a REAL shell-modal:
 * WindowManager.openDialog hosts the panel in its own always-topmost window,
 * so modality (focus hold incl. Alt+Tab), Esc dismissal and opener-focus
 * restore are owned by the window manager instead of an overlay hack. The
 * window itself projects role=dialog + aria-modal=true with the title as its
 * accessible name. All surfaces consume WEB-0012 app-theme tokens;
 * interactive primitives keep their forced-colors fallbacks. No DOM is added.
 */

import { Entity, type IRenderer } from '@vectojs/core';
import type { AppContext, DesktopWindow, WindowManager } from '@vectojs/desktop';
import { Button } from '@vectojs/ui';
import { p, t, themedButton } from './ui-helpers';
import { isWindowFocused } from './window-utils';
import { dialogChoiceForKey, type ConfirmChoice } from '../model/unsaved-guard';

export interface ConfirmDialogOptions {
  /** Accessible name of the dialog and heading text ("Unsaved changes"). */
  title: string;
  /** Body text naming app + item ("Save changes to note-1.txt before reloading?"). */
  message: string;
  /** Safe-action label. Default 'Save'. */
  confirmLabel?: string;
  /** Destructive-action label. Default 'Discard'. */
  discardLabel?: string;
  /** Escape-bound label. Default 'Cancel'. */
  cancelLabel?: string;
}

const PANEL_WIDTH = 360;
const PAD = 16;
const TITLE_H = 20;
const MESSAGE_H = 40;
const BUTTON_W = 84;
const BUTTON_H = 28;
const BUTTON_GAP = 8;

/**
 * The prompt's client content: fixed-size themed panel hosting heading,
 * message and the three actions. Keyboard handling is gated on the hosting
 * dialog window being focused — which the window manager guarantees while
 * the modal is open.
 */
class ConfirmDialogPanel extends Entity {
  private readonly actions: Button[];
  private readonly confirmAction: Button;
  private focusIndex = 0;
  private keyListener: ((e: KeyboardEvent) => void) | null = null;

  /** Invoked with the chosen action; closes the dialog window. */
  choose: ((choice: ConfirmChoice) => void) | null = null;

  constructor(options: ConfirmDialogOptions) {
    super();
    this.width = PANEL_WIDTH;
    this.height = PAD + TITLE_H + 8 + MESSAGE_H + 12 + BUTTON_H + PAD;

    const confirmLabel = options.confirmLabel ?? 'Save';
    const discardLabel = options.discardLabel ?? 'Discard';
    const cancelLabel = options.cancelLabel ?? 'Cancel';

    const titleText = t(options.title, 14);
    // Static copy: the dialog element carries the name, buttons carry theirs.
    titleText.interactive = false;
    const messageText = p(options.message);
    messageText.interactive = false;
    messageText.setMaxWidth(PANEL_WIDTH - PAD * 2);

    // Visual order matters: Discard far from the safe pair, Cancel left of Save.
    const discard = themedButton(discardLabel, 'danger', () => this.choose?.('discard'));
    const cancel = themedButton(cancelLabel, 'secondary', () => this.choose?.('cancel'));
    this.confirmAction = themedButton(confirmLabel, 'primary', () => this.choose?.('confirm'));
    this.actions = [discard, cancel, this.confirmAction];
    this.focusIndex = this.actions.indexOf(this.confirmAction);
    for (const action of this.actions) {
      action.width = BUTTON_W;
      action.height = BUTTON_H;
    }
    this.add(titleText, messageText, ...this.actions);

    titleText.x = PAD;
    titleText.y = PAD - 2;
    messageText.x = PAD;
    messageText.y = TITLE_H + 8;
    let x = PAD;
    const rowY = this.height - PAD - BUTTON_H;
    for (const action of this.actions) {
      action.x = x;
      action.y = rowY;
      x += BUTTON_W + BUTTON_GAP;
    }
  }

  // Hit-target like the host: the panel is the dialog's whole client area.
  public override isPointInside(gx: number, gy: number): boolean {
    const local = this.worldToLocal(gx, gy);
    if (!local) return false;
    return local.x >= 0 && local.y >= 0 && local.x <= this.width && local.y <= this.height;
  }

  public override render(_r: IRenderer): void {}

  protected override onMounted(): void {
    this.keyListener = (e: KeyboardEvent) => {
      if (!this.choose || !isWindowFocused(this)) return;
      // Modifier chords belong to the shell or browser, same guard as the
      // calculator and terminal.
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const choice = dialogChoiceForKey(e.key);
      if (choice) {
        e.preventDefault();
        this.choose(choice);
        return;
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        const count = this.actions.length;
        const step = e.shiftKey ? count - 1 : 1;
        this.moveFocus((this.focusIndex + step) % count);
      }
    };
    window.addEventListener('keydown', this.keyListener);
    // Initial focus on the SAFE action; Entity.focus() targets the projected
    // shadow <button> so AT and canvas focus agree (retries next frame).
    this.confirmAction.focus();
    this.syncFocusVisuals();
  }

  public override destroy(): void {
    if (this.keyListener) {
      window.removeEventListener('keydown', this.keyListener);
      this.keyListener = null;
    }
    super.destroy();
  }

  private moveFocus(index: number): void {
    this.focusIndex = index;
    this.actions[index]?.focus();
    this.syncFocusVisuals();
  }

  /** Keep drawn rings in step even where no DOM mirror reports focus back. */
  private syncFocusVisuals(): void {
    this.actions.forEach((action, i) => {
      action.focused = i === this.focusIndex;
    });
    this.scene?.markDirty();
  }
}

export function openConfirmDialog(
  wm: WindowManager,
  options: ConfirmDialogOptions,
): Promise<ConfirmChoice> {
  /**
   * Resolves with the chosen action once the user answers. Closing the
   * window by ANY other route (titlebar button, Escape handled upstream,
   * `ctx.close()`) resolves 'cancel' — the answer can then only ever be a
   * cancel at worst.
   */
  return new Promise<ConfirmChoice>((resolve) => {
    let settled = false;
    let panel: ConfirmDialogPanel | null = null;
    let win: DesktopWindow | null = null;
    let closeDialog: (() => void) | null = null;
    let off: () => void = () => {};
    const finish = (choice: ConfirmChoice): void => {
      if (settled) return;
      settled = true;
      off();
      resolve(choice);
    };
    off = wm.on((event) => {
      if (event.type === 'close' && win && event.window === win) {
        if (panel) panel.choose = null;
        finish('cancel');
      }
    });
    panel = new ConfirmDialogPanel(options);
    panel.choose = (choice) => {
      panel!.choose = null;
      finish(choice);
      closeDialog?.();
    };
    win = wm.openDialog({
      title: options.title,
      width: PANEL_WIDTH,
      height: panel.height,
      modal: true,
      dismissible: true,
      content: (ctx: AppContext) => {
        closeDialog = () => ctx.close();
        return panel!;
      },
    });
  });
}
