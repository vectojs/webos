/**
 * Storage-backed VFS — a MemoryVfs core whose contents survive page reloads
 * (audit #25 P1-B). Every mutating call mirrors into a debounced JSON
 * snapshot written to a `StorageLike` backend (localStorage in the app); a
 * fresh instance replays the snapshot synchronously at construction, before
 * any consumer can observe the filesystem.
 *
 * Why localStorage over IndexedDB: the workload is a handful of kilobyte text
 * documents, the write path is already best-effort (quota/private mode is
 * swallowed, mirroring the theme-persistence contract in config.ts), and a
 * synchronous read lets boot restore complete with no async ordering hazard
 * against the shell's seed writes. IndexedDB would buy capacity WebOS does
 * not need at the cost of an async-open dance on every boot.
 *
 * Persistence is whole-map per flush: notes are tiny, and a single atomic
 * `setItem` avoids partial-write states entirely.
 */

import { MemoryVfs, normalizePath, type Vfs, type VfsEntry, type VfsStat } from '@vectojs/desktop';

const FLUSH_DELAY_MS = 250;

/** Minimal surface actually used — satisfied by localStorage. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

interface Snapshot {
  version: 1;
  files: Record<string, string>;
  dirs: string[];
}

function isSnapshot(value: unknown): value is Snapshot {
  if (typeof value !== 'object' || value === null) return false;
  const snap = value as Record<string, unknown>;
  return (
    snap.version === 1 &&
    typeof snap.files === 'object' &&
    snap.files !== null &&
    Array.isArray(snap.dirs)
  );
}

export class StorageVfs implements Vfs {
  private readonly inner = new MemoryVfs();
  private readonly dirs = new Set<string>();
  /** Mirror of file contents kept so flush() can serialize synchronously
   * (an async rebuild could be cut off by tab close before setItem lands). */
  private readonly contents = new Map<string, string>();
  private flushTimer: ReturnType<typeof setTimeout> | null = null;

  /** Resolves once the constructor-time restore has been applied. Consumers
   * that seed or read at boot await this: MemoryVfs mutations settle across
   * microtasks (its write awaits ensureDir before setting), so the replay is
   * not observable synchronously. */
  readonly restored: Promise<boolean>;

  constructor(
    private readonly storage: StorageLike | null,
    private readonly key = 'webos:vfs',
  ) {
    this.restored = this.restore();
    if (storage && typeof window !== 'undefined') {
      // A tab close/reload must not outrun the debounce timer.
      window.addEventListener('pagehide', () => this.flush());
    }
  }

  async read(path: string): Promise<string> {
    return this.inner.read(path);
  }

  async write(path: string, data: string): Promise<void> {
    await this.inner.write(path, data);
    this.contents.set(path, data);
    this.scheduleFlush();
  }

  async list(path: string): Promise<VfsEntry[]> {
    return this.inner.list(path);
  }

  async stat(path: string): Promise<VfsStat | null> {
    return this.inner.stat(path);
  }

  async mkdir(path: string): Promise<void> {
    await this.inner.mkdir(path);
    this.dirs.add(path);
    this.scheduleFlush();
  }

  async remove(path: string): Promise<void> {
    await this.inner.remove(path);
    // Cascade like MemoryVfs.remove (review PX-0078): a directory delete must
    // also drop every mirrored entry beneath it, or the next flush
    // re-serializes them and a reload resurrects the children.
    const dir = normalizePath(path);
    const prefix = dir + '/';
    for (const key of [...this.contents.keys()]) {
      if (key === dir || key.startsWith(prefix)) this.contents.delete(key);
    }
    for (const d of [...this.dirs]) {
      if (d === dir || d.startsWith(prefix)) this.dirs.delete(d);
    }
    this.scheduleFlush();
  }

  /**
   * Replay a stored snapshot into the memory core. Called from the
   * constructor so it is ordered before every consumer call; `restored`
   * resolves only once the replayed ops have settled.
   */
  private async restore(): Promise<boolean> {
    if (!this.storage) return false;
    let raw: string | null;
    try {
      raw = this.storage.getItem(this.key);
    } catch {
      return false;
    }
    if (!raw) return false;
    let snap: unknown;
    try {
      snap = JSON.parse(raw);
    } catch {
      return false;
    }
    if (!isSnapshot(snap)) return false;
    const applied: Promise<void>[] = [];
    for (const dir of snap.dirs) {
      this.dirs.add(dir);
      applied.push(this.inner.mkdir(dir));
    }
    for (const [path, data] of Object.entries(snap.files)) {
      this.contents.set(path, data);
      applied.push(this.inner.write(path, data));
    }
    await Promise.all(applied);
    return true;
  }

  private scheduleFlush(): void {
    if (!this.storage || this.flushTimer !== null) return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      this.flush();
    }, FLUSH_DELAY_MS);
  }

  /** Serialize the current index+contents into storage. Best-effort. */
  flush(): void {
    if (!this.storage) return;
    if (this.flushTimer !== null) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    const files: Record<string, string> = {};
    for (const [path, data] of this.contents) files[path] = data;
    const snap: Snapshot = { version: 1, files, dirs: [...this.dirs] };
    try {
      this.storage.setItem(this.key, JSON.stringify(snap));
    } catch {
      // Quota exceeded / storage unavailable — persistence stays best-effort,
      // matching the theme persistence contract.
    }
  }
}
