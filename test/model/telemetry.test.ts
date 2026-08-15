import { describe, expect, it } from 'bun:test';
import { FrameSampler } from '../../src/model/telemetry';

describe('FrameSampler', () => {
  it('returns null with no samples', () => {
    const s = new FrameSampler();
    expect(s.p50()).toBeNull();
    expect(s.max()).toBeNull();
    expect(s.overflowShare(16.67)).toBeNull();
  });

  it('computes p50 and max', () => {
    const s = new FrameSampler();
    for (const v of [5, 8, 3, 20, 4]) s.push(v);
    expect(s.p50()).toBe(5);
    expect(s.max()).toBe(20);
    expect(s.overflowShare(16.67)).toBeCloseTo(1 / 5);
  });

  it('caps the buffer at its capacity', () => {
    const s = new FrameSampler(16);
    for (let i = 0; i < 100; i++) s.push(i);
    expect(s.count).toBe(16);
    expect(s.max()).toBe(99);
  });

  it('ignores non-finite samples', () => {
    const s = new FrameSampler();
    s.push(Number.NaN);
    s.push(-1);
    s.push(4);
    expect(s.count).toBe(1);
  });
});
