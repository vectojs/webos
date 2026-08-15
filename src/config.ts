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
import { presetIds } from './model/themes';

const THEME_IDS = presetIds();

export interface BootConfig {
  config: WebosConfig;
  /** Theme switcher wiring shared by Settings, Terminal and the API. */
  onTheme: (presetId: string) => void;
}

export const DEFAULT_PRESET = aeroPreset;

/**
 * Assemble the shell config. `onTheme` is injected by the boot layer so the
 * apps stay free of globals.
 */
export function buildConfig(onTheme: (presetId: string) => void): BootConfig {
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
        wallpaper: DEFAULT_PRESET.wallpaperBg,
        wallpaperImage: DEFAULT_PRESET.wallpaperSvg,
        taskbarHeight: 40,
        taskbarPosition: 'bottom',
      },
      theme: { ...DEFAULT_PRESET.tokens },
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
