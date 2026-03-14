/**
 * src/lib/github.js
 * Thin wrapper around the GitHub Contents API.
 * Token is stored in localStorage (set via Settings page).
 * All writes produce a commit — this IS the CMS layer.
 */

const BASE = 'https://api.github.com';

function getToken() {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem('gh_token');
}

function headers() {
  const token = getToken();
  return {
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

/**
 * Fetch raw markdown content + sha for a file.
 * slug: e.g. "research/ai-pms-landscape"
 */
export async function getFile(owner, repo, slug, branch = 'main') {
  const path = `docs/${slug}.md`;
  const res = await fetch(
    `${BASE}/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
    { headers: headers() }
  );
  if (!res.ok) throw new Error(`GitHub ${res.status}: ${res.statusText}`);
  const data = await res.json();
  const content = atob(data.content.replace(/\n/g, ''));
  return { content, sha: data.sha };
}

/**
 * Commit updated markdown content back to GitHub.
 */
export async function putFile(owner, repo, slug, content, sha, message, branch = 'main') {
  const path = `docs/${slug}.md`;
  const body = {
    message: message ?? `docs: update ${slug}`,
    content: btoa(unescape(encodeURIComponent(content))),
    sha,
    branch
  };
  const res = await fetch(
    `${BASE}/repos/${owner}/${repo}/contents/${path}`,
    { method: 'PUT', headers: headers(), body: JSON.stringify(body) }
  );
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message ?? `GitHub ${res.status}`);
  }
  return res.json();
}

/**
 * Create a new markdown file (no sha needed).
 */
export async function createFile(owner, repo, slug, content, message, branch = 'main') {
  const path = `docs/${slug}.md`;
  const body = {
    message: message ?? `docs: create ${slug}`,
    content: btoa(unescape(encodeURIComponent(content))),
    branch
  };
  const res = await fetch(
    `${BASE}/repos/${owner}/${repo}/contents/${path}`,
    { method: 'PUT', headers: headers(), body: JSON.stringify(body) }
  );
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message ?? `GitHub ${res.status}`);
  }
  return res.json();
}
