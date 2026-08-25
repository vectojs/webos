/**
 * Era chrome model contracts (WEB-0034): taskbar clock formats, start-menu
 * filtering/recency, y2k program groups, and era icon treatments.
 */

import { describe, expect, it } from 'bun:test';
import { formatTaskbarClock } from '../../src/model/clock-format';
import { buildProgramGroups, filterApps, pushRecent } from '../../src/model/start-menu-model';
import { themedIconSvg, getIconPreset, setIconPreset } from '../../src/desktop/icons';

// 2026-08-25 is a Monday; 10:48 local.
const D = new Date(2026, 7, 24, 10, 48);

describe('formatTaskbarClock', () => {
  it('modern eras get a two-line HH:MM + short date', () => {
    const r = formatTaskbarClock(D, 'aero');
    expect(r.time).toBe('10:48');
    expect(r.date).toBeTruthy();
  });

  it('aqua uses the menu-bar single line: weekday day HH:MM', () => {
    const r = formatTaskbarClock(D, 'aqua');
    expect(r.time).toMatch(/^Mon 24 \d{2}:\d{2}$/);
    expect(r.date).toBeNull();
  });

  it('y2k uses the Win98 tray format with AM/PM', () => {
    expect(formatTaskbarClock(D, 'y2k').time).toBe('10:48 AM');
    const pm = new Date(2026, 7, 24, 22, 5);
    expect(formatTaskbarClock(pm, 'y2k').time).toBe('10:05 PM');
    const midnight = new Date(2026, 7, 24, 0, 30);
    expect(formatTaskbarClock(midnight, 'y2k').time).toBe('12:30 AM');
  });

  it('pads minutes and hours', () => {
    expect(formatTaskbarClock(new Date(2026, 0, 1, 3, 7), 'breeze').time).toBe('03:07');
  });
});

describe('start-menu model', () => {
  const apps = [
    { id: 'terminal', title: 'Terminal' },
    { id: 'notes', title: 'Notepad' },
    { id: 'browser', title: 'Browser' },
  ];

  it('filters case-insensitively over title and id', () => {
    expect(filterApps(apps, 'note')).toHaveLength(1);
    expect(filterApps(apps, 'BROWSER')).toHaveLength(1);
    expect(filterApps(apps, 'zzz')).toHaveLength(0);
    expect(filterApps(apps, '')).toHaveLength(3);
  });

  it('pushRecent dedupes, front-inserts and caps', () => {
    let recents = pushRecent(['files', 'notes'], 'terminal');
    expect(recents).toEqual(['terminal', 'files', 'notes']);
    recents = pushRecent(recents, 'files', 3);
    expect(recents).toEqual(['files', 'terminal', 'notes']);
    recents = pushRecent(recents, 'clock', 3);
    expect(recents).toEqual(['clock', 'files', 'terminal']);
    // Input never mutated.
    expect(pushRecent([], 'a', 0)).toEqual([]);
  });

  it('builds y2k program groups in canonical order, skipping empty ones', () => {
    const groups = buildProgramGroups(apps);
    expect(groups.map((g) => g.label)).toEqual(['Accessories', 'Productivity', 'Internet']);
    expect(groups[0]?.apps.map((a) => a.id)).toContain('terminal');
  });
});

describe('era icon treatments', () => {
  it('every era produces distinct svg for the same app', () => {
    const svgs = ['aero', 'cloud', 'breeze', 'aqua', 'y2k', 'vaporwave', 'dreamcore'].map((era) =>
      themedIconSvg('terminal', era),
    );
    expect(new Set(svgs).size).toBe(svgs.length);
  });

  // Regression (review F2): the Material-era feDropShadow used to hang off a
  // zero-size invisible rect, silently no-oping while the defs substring
  // still counted as distinctiveness.
  it('cloud drop-shadow rides a painted glyph group, not an inert carrier rect', () => {
    const svg = themedIconSvg('terminal', 'cloud');
    const group = /<g filter="url\(#cloudSh\)">([\s\S]*?)<\/g>/.exec(svg);
    expect(group).not.toBeNull();
    // The filter wraps the base glyph, so the treatment actually renders.
    expect(group![1]).toContain('M3 3h18');
    expect(svg).toContain('<feDropShadow');
    expect(svg).not.toContain('width="0"');
  });

  it('treatments keep valid svg structure and wrap the base glyph', () => {
    for (const era of ['aero', 'y2k']) {
      const svg = themedIconSvg('terminal', era);
      expect(svg.startsWith('<svg')).toBe(true);
      expect(svg.endsWith('</svg>')).toBe(true);
      expect(svg).toContain('M3 3h18'); // base terminal glyph path survives
    }
    expect(themedIconSvg('terminal', 'y2k')).toContain('#FFFFFF'); // bevel light
    expect(themedIconSvg('terminal', 'vaporwave')).toContain('#01CDFE'); // neon stroke
  });

  it('unknown era returns the untreated base', () => {
    const base = themedIconSvg('terminal', '');
    expect(base).toBe(themedIconSvg('terminal', 'not-an-era'));
  });

  it('module-level preset switch is observable', () => {
    setIconPreset('aqua');
    expect(getIconPreset()).toBe('aqua');
    setIconPreset('');
    expect(getIconPreset()).toBe('');
  });
});
