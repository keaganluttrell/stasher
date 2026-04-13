/**
 * src/lib/preferences.js
 * Store and load user preferences in localStorage.
 */

import { browser } from '$app/environment';

const STORAGE_KEY = 'stasher_preferences';

const DEFAULT_PREFERENCES = {
  theme: 'night'
};

export function loadPreferences() {
  if (!browser) return { ...DEFAULT_PREFERENCES };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PREFERENCES };
    return { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

export function savePreferences(prefs) {
  if (!browser) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Storage full or unavailable
  }
}

export { DEFAULT_PREFERENCES };
