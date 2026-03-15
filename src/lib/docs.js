/**
 * src/lib/docs.js
 * Read doc content from pre-built static JSON files.
 * No GitHub token required — these are baked into the build.
 */

import { base } from '$app/paths';

/**
 * Parse simple YAML frontmatter from markdown content.
 * Returns { frontmatter, body }.
 */
function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (match) {
    const frontmatter = Object.fromEntries(
      match[1].split('\n').map((line) => {
        const [k, ...v] = line.split(':');
        const val = v.join(':').trim().replace(/^['"]|['"]$/g, '');
        return [k.trim(), val];
      })
    );
    return { frontmatter, body: match[2] };
  }
  return { frontmatter: {}, body: content };
}

/**
 * Fetch a single doc by slug from the static JSON files.
 * Returns { content, frontmatter, body }.
 */
export async function getDoc(slug) {
  const res = await fetch(`${base}/docs/${slug}.json`);
  if (!res.ok) {
    throw new Error(`Could not load doc "${slug}": ${res.status} ${res.statusText}`);
  }
  const data = await res.json();

  // Prefer pre-parsed frontmatter/body from the build step (handles YAML multiline, etc.)
  let frontmatter, body;
  if (data.frontmatter) {
    frontmatter = data.frontmatter;
    body = data.body ?? '';
  } else {
    // Fallback: simple line-by-line parser for older builds
    ({ frontmatter, body } = parseFrontmatter(data.content));
  }

  // Normalise date to string (gray-matter may serialise Date objects as ISO strings)
  if (frontmatter.date instanceof Date) {
    frontmatter.date = frontmatter.date.toISOString();
  }

  // Strip leading H1 if it duplicates the frontmatter title
  let cleanBody = body;
  if (frontmatter.title) {
    cleanBody = body.replace(/^\s*#\s+.+\n+/, '');
  }

  return { content: data.content, frontmatter, body: cleanBody };
}
