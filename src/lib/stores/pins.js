import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';

const STORAGE_KEY = 'stasher_pins';

function loadFromStorage() {
  if (!browser) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveToStorage(arr) {
  if (!browser) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  } catch {
    // Storage full or unavailable
  }
}

// Store as array of { slug, title } for display purposes
export const pins = writable(loadFromStorage());

export function togglePin(slug, title) {
  let wasPinned = false;
  pins.update((items) => {
    const existing = items.find((item) => item.slug === slug);
    let updated;
    if (existing) {
      wasPinned = true;
      updated = items.filter((item) => item.slug !== slug);
    } else {
      updated = [...items, { slug, title: title || slug }];
    }
    saveToStorage(updated);
    return updated;
  });
  return !wasPinned; // returns true if now pinned, false if unpinned
}

export function isPinned(slug) {
  const items = get(pins);
  return items.some((item) => item.slug === slug);
}

export function getPinnedSlugs() {
  return loadFromStorage().map((item) => item.slug);
}
