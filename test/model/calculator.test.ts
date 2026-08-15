import { describe, expect, it } from 'bun:test';
import { CalculatorModel } from '../../src/model/calculator';

describe('CalculatorModel', () => {
  it('builds numbers and evaluates binary ops left-to-right', () => {
    const c = new CalculatorModel();
    c.digit('2');
    c.pressOp('+');
    c.digit('3');
    c.pressOp('×');
    c.digit('4');
    c.equals();
    expect(c.display).toBe('20'); // (2+3)*4 — no precedence, pocket semantics
  });

  it('handles division by zero as 0', () => {
    const c = new CalculatorModel();
    c.digit('8');
    c.pressOp('÷');
    c.digit('0');
    c.equals();
    expect(c.display).toBe('0');
  });

  it('supports dot input', () => {
    const c = new CalculatorModel();
    c.digit('1');
    c.dot();
    c.digit('5');
    expect(c.display).toBe('1.5');
    c.dot();
    expect(c.display).toBe('1.5'); // only one dot
  });

  it('CE resets the operand only', () => {
    const c = new CalculatorModel();
    c.digit('9');
    c.pressOp('+');
    c.digit('5');
    c.clearEntry();
    expect(c.display).toBe('0');
    c.digit('2');
    c.equals();
    expect(c.display).toBe('11');
  });

  it('backspace and toggle sign', () => {
    const c = new CalculatorModel();
    c.digit('1');
    c.digit('2');
    c.digit('3');
    c.backspace();
    expect(c.display).toBe('12');
    c.toggleSign();
    expect(c.display).toBe('-12');
    c.toggleSign();
    expect(c.display).toBe('12');
  });

  it('clear resets everything', () => {
    const c = new CalculatorModel();
    c.digit('4');
    c.pressOp('-');
    c.digit('1');
    c.clear();
    expect(c.display).toBe('0');
    c.digit('7');
    c.equals(); // no pending op
    expect(c.display).toBe('7');
  });
});
