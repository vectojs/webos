/**
 * StorageVfs persistence contract (audit #25 P1-B): writes survive instance
 * recreation (the reload path), and the restore is synchronous with respect
 * to the constructor.
 */

import { describe, expect, it } from 'bun:test';
import { StorageVfs, type StorageLike } from '../../src/model/storage-vfs';

function fakeStorage(): StorageLike & { dump(): Record<string, string> } {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    dump: () => Object.fromEntries(map),
  };
}

describe('storage vfs', () => {
  it('round-trips files and dirs across instances', async () => {
    const storage = fakeStorage();
    const first = new StorageVfs(storage);
    await first.mkdir('/notes');
    await first.write('/notes/note-1.txt', 'hello persistence');
    await first.write('/docs/readme.txt', 'seed copy');
    first.flush();

    // Fresh boot: same storage backend, new instance. The restore settles
    // asynchronously (MemoryVfs ops await internally), so wait for it.
    const second = new StorageVfs(storage);
    await second.restored;
    expect(await second.read('/notes/note-1.txt')).toBe('hello persistence');
    expect(await second.read('/docs/readme.txt')).toBe('seed copy');
    const entries = await second.list('/notes');
    expect(entries.map((e) => e.name)).toEqual(['note-1.txt']);
    const stat = await second.stat('/notes/note-1.txt');
    expect(stat?.kind).toBe('file');
    expect(stat?.size).toBe('hello persistence'.length);
  });

  it('reports whether a snapshot existed so boot can skip reseeding', async () => {
    const storage = fakeStorage();
    expect(new StorageVfs(storage).restored).resolves.toBe(false);

    const writer = new StorageVfs(storage);
    await writer.write('/docs/shortcuts.txt', 'Ctrl+Space');
    writer.flush();
    expect(new StorageVfs(storage).restored).resolves.toBe(true);
  });

  it('removes deleted files from later snapshots', async () => {
    const storage = fakeStorage();
    const vfs = new StorageVfs(storage);
    await vfs.write('/notes/gone.txt', 'bye');
    await vfs.remove('/notes/gone.txt');
    await vfs.write('/notes/kept.txt', 'stay');
    vfs.flush();

    const revived = new StorageVfs(storage);
    await revived.restored;
    expect(await revived.stat('/notes/gone.txt')).toBeNull();
    expect(await revived.read('/notes/kept.txt')).toBe('stay');
  });

  it('cascades a directory delete out of later snapshots', async () => {
    // Review PX-0078: remove() only dropped the exact dir entry, so nested
    // contents survived in the snapshot and resurrected on reload.
    const storage = fakeStorage();
    const vfs = new StorageVfs(storage);
    await vfs.mkdir('/docs');
    await vfs.write('/docs/readme.txt', 'A');
    await vfs.write('/docs/sub/deep.txt', 'B');
    await vfs.remove('/docs');
    vfs.flush();

    const snap = JSON.parse(storage.dump()['webos:vfs'] as string) as {
      files: Record<string, string>;
      dirs: string[];
    };
    expect(Object.keys(snap.files).filter((p) => p === '/docs' || p.startsWith('/docs/'))).toEqual(
      [],
    );
    expect(snap.dirs.filter((d) => d === '/docs' || d.startsWith('/docs/'))).toEqual([]);

    // The resurrection path itself: fresh instance replays the snapshot.
    const revived = new StorageVfs(storage);
    await revived.restored;
    expect(await revived.stat('/docs')).toBeNull();
    expect(await revived.stat('/docs/readme.txt')).toBeNull();
    expect(await revived.stat('/docs/sub/deep.txt')).toBeNull();
  });

  it('tolerates corrupt snapshots and missing storage', async () => {
    const storage = fakeStorage();
    storage.setItem('webos:vfs', '{not json');
    expect(new StorageVfs(storage).restored).resolves.toBe(false);

    const memoryOnly = new StorageVfs(null);
    await memoryOnly.write('/x', 'y');
    memoryOnly.flush(); // no-op, must not throw
    expect(await memoryOnly.read('/x')).toBe('y');
  });

  it('coalesces rapid writes into one debounced flush', async () => {
    const storage = fakeStorage();
    const vfs = new StorageVfs(storage);
    await vfs.write('/a.txt', '1');
    await new Promise((r) => setTimeout(r, 5));
    await vfs.write('/a.txt', '2'); // still inside the debounce window
    expect(storage.dump()['webos:vfs']).toBeUndefined();
    vfs.flush();
    const snap = JSON.parse(storage.dump()['webos:vfs'] as string) as {
      files: Record<string, string>;
    };
    expect(snap.files['/a.txt']).toBe('2');
  });
});
