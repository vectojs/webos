/**
 * Boot config — the single customization entry point (the create-webos
 * template contract). Add apps, change shortcuts, pick the default theme,
 * swap the VFS: all of it happens here.
 */

import type { WebosConfig } from '@vectojs/desktop';
import { StorageVfs } from './model/storage-vfs';
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
import { appTheme, setAppTheme } from './model/app-theme';

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
 * The preset id the shell currently applies. Written by the boot assembly and
 * by the shell's single `applyTheme` path; read by the Settings indicator so
 * the active row stays truthful no matter which surface applied the theme.
 */
let activeThemeId = DEFAULT_PRESET.id;

/** Record the preset the shell actually applied (post-fallback resolution). */
export function setActiveThemeId(presetId: string): void {
  activeThemeId = presetId;
}

/** Live accessor for the currently applied preset id. */
export function getActiveThemeId(): string {
  return activeThemeId;
}

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
 * Best-effort localStorage handle for the durable VFS (audit #25 P1-B).
 * Null in environments without storage (SSR, privacy mode) — StorageVfs then
 * degrades to plain memory semantics.
 */
function persistentStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

/**
 * Assemble the shell config. `onTheme` is injected by the boot layer so the
 * apps stay free of globals.
 */
export function buildConfig(onTheme: (presetId: string) => void): BootConfig {
  const preset = findPreset(loadPersistedTheme()) ?? DEFAULT_PRESET;
  setAppTheme(preset);
  setActiveThemeId(preset.id);
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
    createSettingsApp({ applyTheme: onTheme, getActiveThemeId }),
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
        // Era bar height (WEB-0034): keeps the engine's placement math in
        // sync with the WebOS-owned bar from the very first mount.
        taskbarHeight: appTheme().taskbarHeight,
        taskbarPosition: 'bottom',
      },
      theme: { ...preset.tokens },
      shortcuts: {
        'Control+n': { type: 'open-app', appId: 'notes' },
        // Ctrl+P deliberately unbound (audit #25 P2-D): print reflex kept
        // launching Paint. Paint stays reachable via icon/menu; the shell's
        // guard preventDefaults browser Print everywhere — including inside
        // editable targets — so typing cannot reopen it either.
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
      // Durable across reloads (audit #25 P1-B): notes and docs survive via a
      // debounced localStorage snapshot; null storage degrades to memory.
      vfs: new StorageVfs(persistentStorage()),
    },
  };
}
