import { describe, expect, it } from 'bun:test';
import { MemoryVfs } from '@vectojs/desktop';
import { executeCommand, parseCommand, trimHistory } from '../../src/model/terminal';

const themeIds = ['aero', 'breeze'];

async function run(line: string, vfs: MemoryVfs | null = null) {
  return executeCommand(line, { vfs, themeIds });
}

describe('parseCommand', () => {
  it('splits command word and argument', () => {
    expect(parseCommand('  Cat /docs/readme.txt ')).toEqual({
      cmd: 'cat',
      arg: '/docs/readme.txt',
    });
  });

  it('handles empty input', () => {
    expect(parseCommand('   ')).toEqual({ cmd: '', arg: '' });
  });
});

describe('executeCommand', () => {
  it('help lists commands including theme ids', async () => {
    const r = await run('help');
    expect(r.lines.join('\n')).toContain('aero, breeze');
  });

  it('unknown command prints an error line', async () => {
    const r = await run('frobnicate now');
    expect(r.lines[0]).toContain('command not found: frobnicate');
  });

  it('clear requests a history reset', async () => {
    const r = await run('clear');
    expect(r.clear).toBe(true);
  });

  it('echo and date', async () => {
    expect((await run('echo hi there')).lines).toEqual(['hi there']);
    expect(typeof (await run('date')).lines[0]).toBe('string');
  });

  it('theme resolves only known ids', async () => {
    expect((await run('theme breeze')).themeId).toBe('breeze');
    expect((await run('theme win7')).themeId).toBeUndefined();
    expect((await run('theme win7')).lines[0]).toContain('Unknown theme');
  });

  it('ls lists a seeded directory through the VFS', async () => {
    const vfs = new MemoryVfs();
    await vfs.mkdir('/docs');
    await vfs.write('/docs/a.txt', 'aaa');
    const r = await run('ls /docs', vfs);
    expect(r.lines.join('\n')).toContain('a.txt');
  });

  it('ls on a missing path prints the not-found line', async () => {
    const vfs = new MemoryVfs();
    const r = await run('ls /nope', vfs);
    expect(r.lines[0]).toContain('No such file or directory');
  });

  it('cat reads file contents; cat without VFS is graceful', async () => {
    const vfs = new MemoryVfs();
    await vfs.mkdir('/docs');
    await vfs.write('/docs/a.txt', 'line1\nline2');
    const r = await run('cat /docs/a.txt', vfs);
    expect(r.lines).toEqual(['line1', 'line2']);

    const noVfs = await run('cat /docs/a.txt');
    expect(noVfs.lines[0]).toContain('VFS not attached');
  });

  it('cat requires an argument', async () => {
    const r = await run('cat');
    expect(r.lines[0]).toContain('Usage: cat <filename>');
  });
});

describe('trimHistory', () => {
  it('drops oldest lines beyond the limit', () => {
    const history = Array.from({ length: 60 }, (_, i) => `line${i}`);
    const trimmed = trimHistory(history);
    expect(trimmed.length).toBe(50);
    expect(trimmed[0]).toBe('line10');
    expect(trimmed[trimmed.length - 1]).toBe('line59');
  });
});
