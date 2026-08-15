/**
 * Frame-time sampler — pure TS, no canvas imports.
 * A fixed-capacity ring buffer of rAF deltas with p50/max/overflow-share
 * statistics, used by the Sysmon app.
 */

export class FrameSampler {
  private readonly samples: number[] = [];
  private readonly capacity: number;

  constructor(capacity = 120) {
    this.capacity = Math.max(16, capacity);
  }

  /** Record one frame delta in milliseconds. */
  public push(dtMs: number): void {
    if (!Number.isFinite(dtMs) || dtMs < 0) return;
    this.samples.push(dtMs);
    if (this.samples.length > this.capacity) this.samples.shift();
  }

  public get count(): number {
    return this.samples.length;
  }

  public p50(): number | null {
    if (this.samples.length === 0) return null;
    const sorted = [...this.samples].sort((a, b) => a - b);
    return sorted[Math.floor((sorted.length - 1) / 2)]!;
  }

  public max(): number | null {
    if (this.samples.length === 0) return null;
    return Math.max(...this.samples);
  }

  /** Share of samples exceeding `budgetMs` (0..1), or null with no data. */
  public overflowShare(budgetMs: number): number | null {
    if (this.samples.length === 0) return null;
    const over = this.samples.filter((s) => s > budgetMs).length;
    return over / this.samples.length;
  }
}
