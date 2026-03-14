import Fuse from 'fuse.js';
import { base } from '$app/paths';

let docs = [];
let fuse = null;

/**
 * Fetch the pre-built index and initialise Fuse.js.
 */
export async function loadIndex() {
  const res = await fetch(`${base}/index.json`);
  if (!res.ok) {
    console.warn('Could not load search index:', res.status);
    return;
  }
  docs = await res.json();
  fuse = new Fuse(docs, {
    keys: ['title', 'description', 'tags', 'excerpt'],
    threshold: 0.35,
    includeScore: true
  });
}

/**
 * Run a fuzzy search query. Returns flat array of doc objects.
 */
export function search(query) {
  if (!fuse) return [];
  return fuse.search(query).map((r) => r.item);
}

/**
 * Return all documents grouped by their `group` field.
 * @returns {Record<string, Array>}
 */
export function getGroups() {
  const grouped = {};
  for (const doc of docs) {
    const g = doc.group || 'uncategorised';
    if (!grouped[g]) grouped[g] = [];
    grouped[g].push(doc);
  }
  return grouped;
}
