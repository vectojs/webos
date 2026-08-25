/**
 * Start-menu model — pure filtering, recency and y2k program-group logic.
 * No canvas imports; the view layer (src/desktop/start-menu.ts) consumes it.
 */

export interface StartMenuApp {
  id: string;
  title: string;
}

/** Case-insensitive substring filter over title + id. Empty query -> all. */
export function filterApps<T extends StartMenuApp>(apps: readonly T[], query: string): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...apps];
  return apps.filter((a) => a.title.toLowerCase().includes(q) || a.id.toLowerCase().includes(q));
}

/**
 * Most-recently-launched ids, newest first, deduplicated, capped.
 * Returns a new array; the input is never mutated.
 */
export function pushRecent(recents: readonly string[], id: string, cap = 5): string[] {
  const next = [id, ...recents.filter((r) => r !== id)];
  return next.slice(0, cap);
}

/** Era-correct Win98 program groups: label -> member app ids, in menu order. */
const Y2K_GROUPS: readonly { label: string; appIds: readonly string[] }[] = [
  { label: 'Accessories', appIds: ['terminal', 'calculator', 'clock'] },
  { label: 'Productivity', appIds: ['notes', 'files'] },
  { label: 'Graphics', appIds: ['paint'] },
  { label: 'Internet', appIds: ['browser'] },
  { label: 'System', appIds: ['sysmon', 'settings', 'about'] },
];

export interface ProgramGroup {
  label: string;
  apps: StartMenuApp[];
}

/**
 * Build cascading submenu groups for the y2k era: only groups with at least
 * one installed app appear, preserving the canonical group order.
 */
export function buildProgramGroups(apps: readonly StartMenuApp[]): ProgramGroup[] {
  const byId = new Map(apps.map((a) => [a.id, a]));
  const groups: ProgramGroup[] = [];
  for (const g of Y2K_GROUPS) {
    const member = g.appIds.filter((id) => byId.has(id)).map((id) => byId.get(id)!);
    if (member.length > 0) groups.push({ label: g.label, apps: member });
  }
  return groups;
}
