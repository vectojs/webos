/**
 * Boot config — the single customization entry point (the create-webos
 * template contract). Add apps, change shortcuts, pick the default theme,
 * swap the VFS: all of it happens here.
 */

import type { WebosConfig } from '@vectojs/desktop';
import { MemoryVfs } from '@vectojs/desktop';
import { aboutApp } from './apps/about';
import { browserApp } from './apps/browser';
import { calculatorApp } from './apps/calculator';
import { clockApp } from './apps/clock';
import { filesApp } from './apps/files';
import { notesApp } from './apps/notes';
import { paintApp } from './apps/paint';
import { createSettingsApp } from './apps/settings';
import { sysmonApp } from './apps/sysmon';
import { createTerminalApp } from './apps/terminal';
import { aeroPreset } from './model/theme-aero';
import { setAppTheme } from './model/app-theme';

/** A raw SVG string is not a loadable Image URL — wrap as a data URL. */
export function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg.trim())}`;
}
import { findPreset, presetIds } from './model/themes';

const THEME_IDS = presetIds();
const THEME_STORAGE_KEY = 'webos:theme';

export interface BootConfig {
  config: WebosConfig;
  /** Theme switcher wiring shared by Settings, Terminal and the API. */
  onTheme: (presetId: string) => void;
}

export const DEFAULT_PRESET = aeroPreset;

/**
 * The user's last-selected theme, if it is still a known preset id. Guarded
 * for environments without localStorage (SSR, privacy mode). Falls back to
 * the scaffold default.
 */
export function loadPersistedTheme(): string {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored && THEME_IDS.includes(stored)) return stored;
  } catch {
    // localStorage unavailable — use the default.
  }
  return DEFAULT_PRESET.id;
}

/** Persist a runtime theme choice (guarded the same way). */
export function persistTheme(presetId: string): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, presetId);
  } catch {
    // localStorage unavailable — persistence is best-effort.
  }
}

/**
 * Assemble the shell config. `onTheme` is injected by the boot layer so the
 * apps stay free of globals.
 */
export function buildConfig(onTheme: (presetId: string) => void): BootConfig {
  const preset = findPreset(loadPersistedTheme()) ?? DEFAULT_PRESET;
  setAppTheme(preset);
  const apps = [
    createTerminalApp({
      onTheme,
      themeIds: THEME_IDS,
    }),
    filesApp,
    notesApp,
    paintApp,
    browserApp,
    calculatorApp,
    sysmonApp,
    createSettingsApp({ applyTheme: onTheme }),
    clockApp,
    aboutApp,
  ];

  return {
    onTheme,
    config: {
      apps,
      desktop: {
        wallpaper: preset.wallpaperBg,
        wallpaperImage: preset.wallpaperCdnUrl || svgDataUrl(preset.wallpaperSvg),
        taskbarHeight: 40,
        taskbarPosition: 'bottom',
      },
      theme: { ...preset.tokens },
      shortcuts: {
        'Control+n': { type: 'open-app', appId: 'notes' },
        'Control+p': { type: 'open-app', appId: 'paint' },
        'Control+e': { type: 'open-app', appId: 'files' },
        'Control+b': { type: 'open-app', appId: 'browser' },
        'Control+Alt+t': { type: 'open-app', appId: 'terminal' },
        'Control+Shift+C': { type: 'open-app', appId: 'calculator' },
        'Control+Shift+S': { type: 'open-app', appId: 'settings' },
        'Control+Shift+A': { type: 'open-app', appId: 'about' },
        'Meta+w': { type: 'close-focused' },
        'Control+w': { type: 'close-focused' },
        'Meta+Space': { type: 'toggle-start' },
        'Control+Space': { type: 'toggle-start' },
      },
      vfs: new MemoryVfs(),
    },
  };
}
