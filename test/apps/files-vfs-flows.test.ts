/**
 * Files VFS mutation flows (WEB-0039 / issue #40): rename (read→write→remove,
 * collision-safe), delete, and auto-suffixed folder creation round-trip
 * against a real MemoryVfs — the same helpers the right-click menu actions
 * call, exercised without window plumbing.
 */

import { describe, expect, it } from 'bun:test';
import { MemoryVfs } from '@vectojs/desktop';
import { createVfsDir, deleteVfsEntry, renameVfsFile } from '../../src/apps/files';

async function seeded(): Promise<MemoryVfs> {
  const vfs = new MemoryVfs();
  await vfs.mkdir('/docs');
  await vfs.write('/docs/readme.txt', 'hello');
  await vfs.write('/docs/shortcuts.txt', 'keys');
  return vfs;
}

describe('renameVfsFile', () => {
  it('moves content to the new name and drops the old entry', async () => {
    const vfs = await seeded();
    expect(await renameVfsFile(vfs, '/docs', 'readme.txt', 'guide.txt')).toBe('ok');
    expect(await vfs.stat('/docs/readme.txt')).toBeNull();
    expect(await vfs.read('/docs/guide.txt')).toBe('hello');
  });

  it('refuses to clobber an existing destination', async () => {
    const vfs = await seeded();
    expect(await renameVfsFile(vfs, '/docs', 'readme.txt', 'shortcuts.txt')).toBe('exists');
    // Both originals survive untouched.
    expect(await vfs.read('/docs/readme.txt')).toBe('hello');
    expect(await vfs.read('/docs/shortcuts.txt')).toBe('keys');
  });

  it('reports error for a missing source without inventing files', async () => {
    const vfs = await seeded();
    expect(await renameVfsFile(vfs, '/docs', 'ghost.txt', 'any.txt')).toBe('error');
    expect(await vfs.stat('/docs/any.txt')).toBeNull();
  });
});

describe('deleteVfsEntry', () => {
  it('removes a file', async () => {
    const vfs = await seeded();
    expect(await deleteVfsEntry(vfs, '/docs', 'readme.txt')).toBe(true);
    expect(await vfs.stat('/docs/readme.txt')).toBeNull();
  });

  it('cascades a folder remove', async () => {
    const vfs = await seeded();
    await vfs.mkdir('/docs/nested');
    await vfs.write('/docs/nested/deep.txt', 'x');
    expect(await deleteVfsEntry(vfs, '/docs', 'nested')).toBe(true);
    expect(await vfs.stat('/docs/nested/deep.txt')).toBeNull();
  });
});

describe('createVfsDir', () => {
  it('creates the desired name when free', async () => {
    const vfs = await seeded();
    expect(await createVfsDir(vfs, '/docs', 'Projects')).toBe('Projects');
    expect((await vfs.list('/docs')).some((e) => e.name === 'Projects')).toBe(true);
  });

  it('auto-suffixes collisions instead of failing', async () => {
    const vfs = await seeded();
    await vfs.mkdir('/docs/New Folder');
    expect(await createVfsDir(vfs, '/docs', 'New Folder')).toBe('New Folder (2)');
  });
});
