import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';

const STORAGE_KEY = 'stasher_bin';

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

// Store as array of { slug, title, timestamp }
// Clear any stale data from old localStorage-only implementation
if (browser) {
  try {
    const old = localStorage.getItem(STORAGE_KEY);
    if (old) {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {}
}
export const bin = writable([]);

export function toggleBin(slug, title) {
  let wasInBin = false;
  bin.update((items) => {
    const existing = items.find((item) => item.slug === slug);
    let updated;
    if (existing) {
      wasInBin = true;
      updated = items.filter((item) => item.slug !== slug);
    } else {
      updated = [...items, { slug, title: title || slug, timestamp: Date.now() }];
    }
    saveToStorage(updated);
    return updated;
  });
  return !wasInBin; // returns true if added to bin, false if removed
}

export function isInBin(slug) {
  const items = get(bin);
  return items.some((item) => item.slug === slug);
}

export function removeFromBin(slug) {
  bin.update((items) => {
    const updated = items.filter((item) => item.slug !== slug);
    saveToStorage(updated);
    return updated;
  });
}

export function getBinnedSlugs() {
  return new Set(get(bin).map(item => item.slug));
}

export function clearBin() {
  bin.set([]);
  saveToStorage([]);
}
