/**
 * Files inner list viewport binding (audit-3, issue #33): the list ScrollView
 * must grow/shrink with the window client area instead of staying a hardcoded
 * 150px strip; a floor keeps tiny windows usable.
 */

import { describe, expect, it } from 'bun:test';
import { DOCUMENT_SCROLL_PHYSICS, ScrollView, Stack } from '@vectojs/ui';
import { FILES_MIN_LIST_HEIGHT, FilesContent } from '../../src/apps/files';

function makeContent(): {
  content: FilesContent;
  list: ScrollView;
  navBar: Stack;
  rows: Stack;
} {
  const navBar = new Stack({ direction: 'horizontal', gap: 6 });
  const rows = new Stack({ direction: 'vertical', gap: 2 });
  const list = new ScrollView({
    width: 480,
    height: FILES_MIN_LIST_HEIGHT,
    scrollPhysics: DOCUMENT_SCROLL_PHYSICS,
  });
  list.content.add(rows);
  const content = new FilesContent(navBar, list, rows, []);
  content.add(navBar); // height 0 when empty — deterministic math
  content.add(list);
  return { content, list, navBar, rows };
}

describe('FilesContent list viewport', () => {
  it('gives the list the leftover client height on tall windows', () => {
    const { content, list } = makeContent();
    content.width = 520;
    content.height = 600;
    content.layout();
    // children = [navBar(0), list]; gaps = 1 × 12 → 600 − 0 − 12.
    expect(list.height).toBe(588);
  });

  it('shrinks the viewport as the window shrinks (monotonic in window height)', () => {
    const { content, list } = makeContent();
    content.width = 520;
    content.height = 600;
    content.layout();
    const tall = list.height;

    content.height = 400;
    content.layout();
    expect(list.height).toBeLessThan(tall);
    expect(list.height).toBe(388);
  });

  it('floors the viewport at FILES_MIN_LIST_HEIGHT on tiny windows', () => {
    const { content, list } = makeContent();
    content.width = 520;
    content.height = 80;
    content.layout();
    expect(list.height).toBe(FILES_MIN_LIST_HEIGHT);
  });

  it('keeps the scroll extent at least as tall as the viewport', () => {
    const { content, list, rows } = makeContent();
    rows.height = 40; // fewer rows than the viewport
    content.width = 520;
    content.height = 600;
    content.layout();
    expect(list.content.height).toBeGreaterThanOrEqual(list.height);
  });
});
