/**
 * Calculator state machine — pure TS, no canvas imports.
 * Semantics follow a classic four-function pocket calculator:
 * operator precedence is NOT applied; each operator press commits the
 * pending binary operation (`2 + 3 × 4` = `(2+3)×4`).
 */

export type CalcOp = '+' | '-' | '×' | '÷';

const MAX_DIGITS = 12;

export class CalculatorModel {
  private current = '0';
  private previous = 0;
  private op: CalcOp | null = null;
  private resetOnNext = false;

  public get display(): string {
    return this.current;
  }

  private commitNext(): void {
    this.resetOnNext = true;
  }

  public digit(k: string): void {
    if (this.current === '0' || this.resetOnNext) {
      this.current = k;
      this.resetOnNext = false;
    } else if (this.current.replace(/[-.]/g, '').length < MAX_DIGITS) {
      this.current += k;
    }
  }

  public dot(): void {
    if (this.resetOnNext) {
      this.current = '0.';
      this.resetOnNext = false;
      return;
    }
    if (!this.current.includes('.')) this.current += '.';
  }

  public clear(): void {
    this.current = '0';
    this.previous = 0;
    this.op = null;
    this.resetOnNext = false;
  }

  /** Clear entry: reset only the operand being typed. */
  public clearEntry(): void {
    this.current = '0';
    this.resetOnNext = false;
  }

  public backspace(): void {
    if (this.resetOnNext || this.current === '0') return;
    this.current = this.current.length > 1 ? this.current.slice(0, -1) : '0';
  }

  public toggleSign(): void {
    if (this.current === '0') return;
    this.current = this.current.startsWith('-') ? this.current.slice(1) : `-${this.current}`;
    this.resetOnNext = false;
  }

  public pressOp(next: CalcOp): void {
    if (this.op) this.equals();
    this.previous = parseFloat(this.current);
    this.op = next;
    this.commitNext();
  }

  public equals(): void {
    if (!this.op) return;
    const b = parseFloat(this.current);
    let result = this.previous;
    switch (this.op) {
      case '+':
        result += b;
        break;
      case '-':
        result -= b;
        break;
      case '×':
        result *= b;
        break;
      case '÷':
        result = b !== 0 ? this.previous / b : 0;
        break;
    }
    this.current = String(Math.round(result * 1e6) / 1e6);
    this.previous = 0;
    this.op = null;
    this.commitNext();
  }
}
