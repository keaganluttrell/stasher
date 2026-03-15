#!/usr/bin/env node
/**
 * scripts/index.js
 * Walks /docs, parses frontmatter from every .md file,
 * writes static/index.json for Fuse.js search.
 *
 * Run manually:     node scripts/index.js
 * Run on CI:        called by GitHub Actions before build
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOCS_DIR = path.join(__dirname, '..', 'docs');
const STATIC_DIR = path.join(__dirname, '..', 'static');
const OUT_FILE = path.join(STATIC_DIR, 'index.json');
const DOCS_OUT_DIR = path.join(STATIC_DIR, 'docs');

function walk(dir, base = '') {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const results = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.join(base, entry.name);

    if (entry.isDirectory()) {
      if (entry.name.startsWith('_') || entry.name === 'preferences') continue; // skip _templates, preferences, etc.
      results.push(...walk(fullPath, relativePath));
    } else if (entry.name.endsWith('.md')) {
      const raw = fs.readFileSync(fullPath, 'utf-8');
      const { data: frontmatter, content } = matter(raw);

      // Slug: strip .md, normalise separators
      const slug = relativePath.replace(/\\/g, '/').replace(/\.md$/, '');

      // Parse [[wikilinks]] from body content
      const wikilinkMatches = content.match(/\[\[([^\]]+)\]\]/g) ?? [];
      const bodyLinks = wikilinkMatches.map(m => m.slice(2, -2));

      // Merge frontmatter links with body wikilinks, deduplicated
      const fmLinks = frontmatter.links ?? [];
      const links = [...new Set([...fmLinks, ...bodyLinks])];

      results.push({
        slug,
        title: frontmatter.title ?? slug.split('/').pop(),
        description: frontmatter.description ?? '',
        group: frontmatter.group ?? slug.split('/')[0] ?? 'uncategorised',
        date: frontmatter.date ?? null,
        type: frontmatter.type ?? 'doc',
        id: frontmatter.id ?? slug,
        links,
        backlinks: [], // computed after full index is built
        source: frontmatter.source ?? null,
        created_by: frontmatter.created_by ?? null,
        // Trim content for the index — first 500 chars is enough for search
        excerpt: content.replace(/#+\s/g, '').trim().slice(0, 500),
        // Keep full raw content for individual doc files (not included in index.json)
        _raw: raw
      });
    }
  }

  return results;
}

const index = walk(DOCS_DIR);

// Compute backlinks: for each entry, find all others that link to it
for (const entry of index) {
  entry.backlinks = index
    .filter(other => other !== entry && other.links.includes(entry.id))
    .map(other => other.id);
}

// Write individual doc JSON files to static/docs/<slug>.json
for (const doc of index) {
  const docFile = path.join(DOCS_OUT_DIR, `${doc.slug}.json`);
  fs.mkdirSync(path.dirname(docFile), { recursive: true });
  fs.writeFileSync(docFile, JSON.stringify({ content: doc._raw }));
}

console.log(`✓ Wrote ${index.length} doc files → static/docs/`);

// Strip _raw from index entries before writing the search index
const cleanIndex = index.map(({ _raw, ...rest }) => rest);
fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
fs.writeFileSync(OUT_FILE, JSON.stringify(cleanIndex, null, 2));

console.log(`✓ Indexed ${cleanIndex.length} documents → static/index.json`);
