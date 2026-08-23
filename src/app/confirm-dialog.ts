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
 * The dialog is window-modal by design (DEC-0006): it overlays its host
 * entity's client area and swallows pointer input there; keyboard handling is
 * gated on the hosting window being focused. All surfaces consume WEB-0012
 * app-theme tokens; interactive primitives keep their forced-colors fallbacks.
 * No DOM is added — the semantic tree carries role=dialog + aria-modal and an
 * accessible name derived from the title, exactly like window chrome.
 */

import { Entity, type A11yAttributes, type IRenderer } from '@vectojs/core';
import { Button, Text } from '@vectojs/ui';
import { p, t, themedButton } from './ui-helpers';
import { isWindowFocused } from './window-utils';
import { dialogChoiceForKey, type ConfirmChoice } from '../model/unsaved-guard';
import { appTheme } from '../model/app-theme';

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

/** Dimmed backdrop over the host client area; theme-independent like chrome. */
const BACKDROP = 'rgba(2, 6, 23, 0.45)';
const PANEL_WIDTH = 360;
const PANEL_RADIUS = 8;
const PAD = 16;
const TITLE_H = 20;
const MESSAGE_H = 40;
const BUTTON_W = 84;
const BUTTON_H = 28;
const BUTTON_GAP = 8;

export class ConfirmDialog extends Entity {
  private readonly titleText: Text;
  private readonly messageText: Text;
  /** Visual/tab order: destructive isolated left, safe pair right. */
  private readonly actions: Button[];
  private readonly confirmAction: Button;
  private resolve: ((choice: ConfirmChoice) => void) | null = null;
  private focusIndex = 0;
  private keyListener: ((e: KeyboardEvent) => void) | null = null;

  /** Resolves once a choice is made; the dialog removes itself afterwards. */
  public readonly done: Promise<ConfirmChoice>;

  constructor(options: ConfirmDialogOptions) {
    super();
    this.clipChildren = false;
    this.a11yProjection = 'eager';

    const confirmLabel = options.confirmLabel ?? 'Save';
    const discardLabel = options.discardLabel ?? 'Discard';
    const cancelLabel = options.cancelLabel ?? 'Cancel';

    this.done = new Promise<ConfirmChoice>((resolve) => {
      this.resolve = resolve;
    });

    this.titleText = t(options.title, 14);
    this.messageText = p(options.message);
    this.messageText.height = MESSAGE_H;
    // Static copy: the dialog element carries the name, buttons carry theirs.
    this.titleText.interactive = false;
    this.messageText.interactive = false;
    this.add(this.titleText, this.messageText);

    const choose = (choice: ConfirmChoice): void => this.choose(choice);
    // Visual order matters: Discard far from the safe pair, Cancel left of Save.
    const discard = themedButton(discardLabel, 'danger', () => choose('discard'));
    const cancel = themedButton(cancelLabel, 'secondary', () => choose('cancel'));
    this.confirmAction = themedButton(confirmLabel, 'primary', () => choose('confirm'));
    this.actions = [discard, cancel, this.confirmAction];
    this.focusIndex = this.actions.indexOf(this.confirmAction);
    for (const action of this.actions) {
      action.width = BUTTON_W;
      action.height = BUTTON_H;
      this.add(action);
    }
  }

  /**
   * Open against `host`, covering its client area, and resolve with the
   * chosen action once the user answers. The dialog detaches itself.
   */
  public static open(host: Entity, options: ConfirmDialogOptions): Promise<ConfirmChoice> {
    const dialog = new ConfirmDialog(options);
    host.add(dialog);
    return dialog.done;
  }

  public override getA11yAttributes(): A11yAttributes {
    return {
      ...super.getA11yAttributes(),
      role: 'dialog',
      ariaModal: 'true',
      label: this.titleText.text,
    };
  }

  public override isPointInside(gx: number, gy: number): boolean {
    // Full-cover backdrop: every pointer hit inside the client area lands on
    // the dialog (children win the topmost-first walk), never on the editor.
    const local = this.worldToLocal(gx, gy);
    if (!local) return false;
    return local.x >= 0 && local.y >= 0 && local.x <= this.width && local.y <= this.height;
  }

  protected override onMounted(): void {
    this.keyListener = (e: KeyboardEvent) => {
      if (!this.resolve || !isWindowFocused(this)) return;
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

  public override render(r: IRenderer): void {
    const host = this.parent;
    const coverW = Math.max(0, host?.width ?? 0);
    const coverH = Math.max(0, host?.height ?? 0);
    this.x = 0;
    this.y = 0;
    this.width = coverW;
    this.height = coverH;

    r.beginPath();
    r.roundRect(0, 0, coverW, coverH, 0);
    r.fill(BACKDROP);

    const theme = appTheme();
    const panelW = Math.min(PANEL_WIDTH, Math.max(240, coverW - PAD * 2));
    const panelH = PAD + TITLE_H + 8 + MESSAGE_H + 12 + BUTTON_H + PAD;
    const panelX = Math.round((coverW - panelW) / 2);
    const panelY = Math.round((coverH - panelH) / 2);

    r.beginPath();
    r.roundRect(panelX, panelY, panelW, panelH, PANEL_RADIUS);
    r.fill(theme.surfaceRaised);
    r.stroke(theme.border, 1);

    const innerW = panelW - PAD * 2;
    this.titleText.x = panelX + PAD;
    this.titleText.y = panelY + PAD - 2;
    if (this.messageText.maxWidth !== innerW) this.messageText.setMaxWidth(innerW);
    this.messageText.x = panelX + PAD;
    this.messageText.y = this.titleText.y + TITLE_H + 8;

    let x = panelX + PAD;
    const rowY = panelY + panelH - PAD - BUTTON_H;
    for (const action of this.actions) {
      action.x = x;
      action.y = rowY;
      x += BUTTON_W + BUTTON_GAP;
    }
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

  private choose(choice: ConfirmChoice): void {
    const resolve = this.resolve;
    if (!resolve) return;
    this.resolve = null;
    const parent = this.parent;
    if (parent) parent.remove(this);
    this.destroy();
    resolve(choice);
  }
}
