/**
 * Taskbar clock formatting — pure data so eras stay unit-testable without a
 * canvas or locale-dependent Intl in the loop (spec 2026-08-24 §4 gap #10).
 */

export interface ClockReading {
  /** Primary line, e.g. `10:48`. */
  time: string;
  /** Secondary line (date) or null for single-line era variants. */
  date: string | null;
}

function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

/** Format the taskbar clock for an era. Unknown ids get the modern default. */
export function formatTaskbarClock(d: Date, presetId: string, dateLocale = 'en-US'): ClockReading {
  const h = d.getHours();
  const m = pad2(d.getMinutes());

  // aqua — menu-bar style single line: `Mon 24 10:48`
  if (presetId === 'aqua') {
    return {
      time: `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${pad2(h)}:${m}`,
      date: null,
    };
  }

  // y2k — Win98 tray: 12-hour with AM/PM, single line
  if (presetId === 'y2k') {
    const period = h < 12 ? 'AM' : 'PM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return { time: `${h12}:${m} ${period}`, date: null };
  }

  // Modern two-line: HH:MM over a short locale date.
  let date: string;
  try {
    date = new Intl.DateTimeFormat(dateLocale, {
      month: 'short',
      day: 'numeric',
    }).format(d);
  } catch {
    date = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }
  return { time: `${pad2(h)}:${m}`, date };
}
