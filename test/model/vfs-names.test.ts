/**
 * VFS collision-free naming (WEB-0039 / issue #40): Windows-style ` (n)`
 * suffixing with extension preservation and case-insensitive occupancy.
 */

import { describe, expect, it } from 'bun:test';
import { nextAvailableName } from '../../src/model/vfs-names';

describe('nextAvailableName', () => {
  it('keeps a free base name untouched', () => {
    expect(nextAvailableName([], 'New Folder')).toBe('New Folder');
    expect(nextAvailableName(['other.txt'], 'New Document.txt')).toBe('New Document.txt');
  });

  it('suffixes a taken name starting at (2)', () => {
    expect(nextAvailableName(['New Document.txt'], 'New Document.txt')).toBe(
      'New Document (2).txt',
    );
  });

  it('skips to the first free counter instead of colliding', () => {
    const existing = ['New Folder', 'New Folder (2)', 'New Folder (3)'];
    expect(nextAvailableName(existing, 'New Folder')).toBe('New Folder (4)');
  });

  it('resumes from an existing counter suffix', () => {
    const existing = ['notes', 'notes (2)', 'notes (5)'];
    expect(nextAvailableName(existing, 'notes (5)')).toBe('notes (6)');
  });

  it('keeps the extension on the stem, not the suffix', () => {
    expect(nextAvailableName(['a.txt'], 'a.txt')).toBe('a (2).txt');
    expect(nextAvailableName(['a.txt', 'a (2).txt'], 'a.txt')).toBe('a (3).txt');
  });

  it('treats dotfiles as all-stem', () => {
    expect(nextAvailableName(['.hidden'], '.hidden')).toBe('.hidden (2)');
  });

  it('compares case-insensitively', () => {
    expect(nextAvailableName(['README.TXT'], 'readme.txt')).toBe('readme (2).txt');
  });
});
