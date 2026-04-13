import { writable } from 'svelte/store';
import { browser } from '$app/environment';

const STORAGE_KEY = 'stasher_history';
const MAX_ITEMS = 10;

function loadFromStorage() {
  if (!browser) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveToStorage(items) {
  if (!browser) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Storage full or unavailable
  }
}

export const history = writable(loadFromStorage());

export function recordVisit(slug, title) {
  if (!slug || !title) return;
  history.update((items) => {
    const filtered = items.filter((item) => item.slug !== slug);
    const updated = [{ slug, title, timestamp: Date.now() }, ...filtered].slice(0, MAX_ITEMS);
    saveToStorage(updated);
    return updated;
  });
}

export function getHistory() {
  return loadFromStorage();
}

export function clearHistory() {
  history.set([]);
  saveToStorage([]);
}
