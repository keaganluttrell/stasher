/**
 * src/lib/preferences.js
 * Store and load user preferences as a JSON file in the git repo
 * at preferences/<github-username>.json via the GitHub Contents API.
 */

import { getToken } from './auth.js';

const BASE = 'https://api.github.com';

const DEFAULT_PREFERENCES = {
  theme: 'night'
};

function headers() {
  const token = getToken();
  return {
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

/**
 * Load preferences for a user from the repo.
 * Returns defaults if the file does not exist (404).
 */
export async function loadPreferences(username, owner, repo, branch) {
  if (!username || !owner || !repo) return { ...DEFAULT_PREFERENCES };

  try {
    const path = `preferences/${username}.json`;
    const res = await fetch(
      `${BASE}/repos/${owner}/${repo}/contents/${path}?ref=${branch || 'main'}`,
      { headers: headers() }
    );

    if (res.status === 404) {
      return { ...DEFAULT_PREFERENCES };
    }

    if (!res.ok) {
      console.warn(`Failed to load preferences: ${res.status}`);
      return { ...DEFAULT_PREFERENCES };
    }

    const data = await res.json();
    const content = atob(data.content.replace(/\n/g, ''));
    const prefs = JSON.parse(content);

    // Merge with defaults in case new keys are added later
    return { ...DEFAULT_PREFERENCES, ...prefs, _sha: data.sha };
  } catch (e) {
    console.warn('Failed to load preferences:', e.message);
    return { ...DEFAULT_PREFERENCES };
  }
}

/**
 * Save preferences for a user to the repo.
 * Creates or updates preferences/<username>.json.
 */
export async function savePreferences(username, prefs, owner, repo, branch) {
  if (!username || !owner || !repo) return;

  const token = getToken();
  if (!token) return;

  const path = `preferences/${username}.json`;

  // Strip internal _sha before saving
  const { _sha, ...cleanPrefs } = prefs;
  const content = btoa(unescape(encodeURIComponent(JSON.stringify(cleanPrefs, null, 2))));

  const body = {
    message: `prefs: update ${username}`,
    content,
    branch: branch || 'main'
  };

  // Include sha if updating an existing file
  if (_sha) {
    body.sha = _sha;
  }

  try {
    const res = await fetch(
      `${BASE}/repos/${owner}/${repo}/contents/${path}`,
      { method: 'PUT', headers: headers(), body: JSON.stringify(body) }
    );

    if (!res.ok) {
      const err = await res.json();
      console.warn('Failed to save preferences:', err.message);
      return null;
    }

    const result = await res.json();
    // Return the new sha so subsequent saves don't conflict
    return result.content?.sha || null;
  } catch (e) {
    console.warn('Failed to save preferences:', e.message);
    return null;
  }
}

export { DEFAULT_PREFERENCES };
