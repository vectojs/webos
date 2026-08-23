/**
 * Calculator app — CalculatorModel from `model/` drives the display; mouse
 * and keyboard input (scoped to the focused window) both work.
 *
 * The keypad is a manually laid-out 4-column grid that fills the client
 * width and reflows on window resize (ui Stack lays out once, so it cannot
 * express "stretch to fill the row" for late-sized buttons).
 */

import type { IRenderer } from '@vectojs/core';
import { Entity } from '@vectojs/core';
import type { AppContext, AppDefinition } from '@vectojs/desktop';
import { Button, Text } from '@vectojs/ui';
import { btn, t } from '../app/ui-helpers';
import { isWindowFocused } from '../app/window-utils';
import { appIconSvg } from '../desktop/icons';
import { CalculatorModel, type CalcOp } from '../model/calculator';

const OP_KEYS = ['÷', '×', '-', '+'];
const PAD = 16;
const GAP = 6;
const BTN_H = 32;
const DISPLAY_H = 36;

class CalculatorRoot extends Entity {
  private readonly model = new CalculatorModel();
  private readonly displayLabel: Text;
  private readonly rows: Button[][] = [];
  private keyListener: ((e: KeyboardEvent) => void) | null = null;

  constructor() {
    super();
    this.clipChildren = true;

    this.displayLabel = t('0', 24);
    this.displayLabel.font = '700 24px "Segoe UI", system-ui, sans-serif';
    this.displayLabel.height = DISPLAY_H;
    this.displayLabel.interactive = false;
    // Right-align within the padded client width; maxWidth tracks window
    // resizes in render(), alignment engages once it is set.
    this.displayLabel.setTextAlign('right');
    this.displayLabel.y = PAD;
    this.add(this.displayLabel);

    const grid = [
      ['C', 'CE', '←', '÷'],
      ['7', '8', '9', '×'],
      ['4', '5', '6', '-'],
      ['1', '2', '3', '+'],
      ['±', '0', '.', '='],
    ];
    for (const labels of grid) {
      const buttons = labels.map((lbl) => {
        const isOp = OP_KEYS.includes(lbl) || lbl === '=';
        const b = btn(lbl, isOp, () => this.handleKey(lbl));
        b.height = BTN_H;
        return b;
      });
      this.rows.push(buttons);
      for (const b of buttons) this.add(b);
    }
  }

  public override isPointInside(gx: number, gy: number): boolean {
    const local = this.worldToLocal(gx, gy);
    if (!local) return false;
    return local.x >= 0 && local.y >= 0 && local.x <= this.width && local.y <= this.height;
  }

  public override render(_r: IRenderer): void {
    const w = Math.max(0, this.width - PAD * 2);
    if (this.displayLabel.maxWidth !== w) this.displayLabel.setMaxWidth(w);
    const btnW = Math.max(40, (w - 3 * GAP) / 4);
    let y = PAD + DISPLAY_H + 8;
    for (const row of this.rows) {
      let x = PAD;
      for (const b of row) {
        b.x = x;
        b.y = y;
        b.width = btnW;
        x += btnW + GAP;
      }
      y += BTN_H + 7;
    }
  }

  protected override onMounted(): void {
    this.keyListener = (e: KeyboardEvent) => {
      // Keyboard input only while this window is focused (multi-window safe).
      if (!isWindowFocused(this)) return;
      // Modifier chords belong to the shell or browser (Ctrl+C copy etc.) —
      // never read as keypad keys, same guard as the terminal.
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key;
      if (k >= '0' && k <= '9') {
        this.model.digit(k);
      } else if (k === '.') {
        this.model.dot();
      } else if (k === 'Enter' || k === '=') {
        this.model.equals();
      } else if (k === 'Backspace') {
        this.model.backspace();
      } else if (k === 'Escape' || k === 'c' || k === 'C') {
        this.model.clear();
      } else if (k === '+' || k === '-') {
        this.model.pressOp(k as CalcOp);
      } else if (k === '*') {
        this.model.pressOp('×');
      } else if (k === '/') {
        e.preventDefault?.();
        this.model.pressOp('÷');
      } else {
        return;
      }
      this.displayLabel.setText(this.model.display);
      this.scene?.markDirty();
    };
    window.addEventListener('keydown', this.keyListener);
  }

  public override destroy(): void {
    if (this.keyListener) {
      window.removeEventListener('keydown', this.keyListener);
      this.keyListener = null;
    }
    super.destroy();
  }

  private handleKey(k: string): void {
    if (k >= '0' && k <= '9') {
      this.model.digit(k);
    } else if (k === '.') {
      this.model.dot();
    } else if (k === 'C') {
      this.model.clear();
    } else if (k === 'CE') {
      this.model.clearEntry();
    } else if (k === '←') {
      this.model.backspace();
    } else if (k === '±') {
      this.model.toggleSign();
    } else if (k === '=') {
      this.model.equals();
    } else if (OP_KEYS.includes(k)) {
      this.model.pressOp(k as CalcOp);
    }
    this.displayLabel.setText(this.model.display);
    this.scene?.markDirty();
  }
}

export const calculatorApp: AppDefinition = {
  id: 'calculator',
  title: 'Calculator',
  iconSvg: appIconSvg('calculator'),
  instances: 'single',
  defaultWidth: 280,
  defaultHeight: 330,
  minWidth: 240,
  minHeight: 280,
  create: (_ctx: AppContext) => new CalculatorRoot(),
};
