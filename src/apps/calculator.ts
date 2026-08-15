/**
 * Calculator app — CalculatorModel from `model/` drives the display; mouse
 * and keyboard input (scoped to the focused window) both work.
 */

import type { AppContext, AppDefinition } from '@vectojs/desktop';
import { Text } from '@vectojs/ui';
import { btn, ClientRoot, hstack, vstack } from '../app/ui-helpers';
import { isWindowFocused } from '../app/window-utils';
import { CalculatorModel, type CalcOp } from '../model/calculator';

const OP_KEYS = ['÷', '×', '-', '+'];

class CalculatorRoot extends ClientRoot {
  private readonly model = new CalculatorModel();
  private readonly displayLabel: Text;
  private keyListener: ((e: KeyboardEvent) => void) | null = null;

  constructor() {
    const display = new Text('0', {
      font: '700 24px "Segoe UI", system-ui, sans-serif',
      color: '#0f172a',
    });
    display.height = 36;

    const row = (labels: string[]) =>
      hstack(
        labels.map((lbl) => {
          const isOp = OP_KEYS.includes(lbl) || lbl === '=';
          return btn(lbl, isOp, () => this.handleKey(lbl));
        }),
        6,
      );

    const stack = vstack(
      [
        display,
        row(['C', 'CE', '←', '÷']),
        row(['7', '8', '9', '×']),
        row(['4', '5', '6', '-']),
        row(['1', '2', '3', '+']),
        row(['±', '0', '.', '=']),
      ],
      8,
    );

    super(stack, 16);
    this.displayLabel = display;
  }

  protected override onMounted(): void {
    this.keyListener = (e: KeyboardEvent) => {
      // Keyboard input only while this window is focused (multi-window safe).
      if (!isWindowFocused(this)) return;
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
  icon: '🔢',
  instances: 'single',
  defaultWidth: 280,
  defaultHeight: 330,
  create: (_ctx: AppContext) => new CalculatorRoot(),
};
