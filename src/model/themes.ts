/**
 * Theme preset table — pure token data, no canvas imports.
 * Register a new preset here (and drop the file in this directory) to make
 * it appear in the Settings app and the terminal `theme` command.
 */

import { aquaPreset } from './theme-aqua';
import { aeroPreset } from './theme-aero';
import { breezePreset } from './theme-breeze';
import { cloudPreset } from './theme-cloud';
import { dreamcorePreset } from './theme-dreamcore';
import type { ThemePreset } from './theme-types';
import { vaporwavePreset } from './theme-vaporwave';
import { y2kPreset } from './theme-y2k';

export type { ThemePreset } from './theme-types';

export const THEME_PRESETS: readonly ThemePreset[] = [
  aeroPreset,
  breezePreset,
  aquaPreset,
  cloudPreset,
  y2kPreset,
  vaporwavePreset,
  dreamcorePreset,
];

export function findPreset(id: string): ThemePreset | undefined {
  return THEME_PRESETS.find((p) => p.id === id);
}

export function presetIds(): string[] {
  return THEME_PRESETS.map((p) => p.id);
}
