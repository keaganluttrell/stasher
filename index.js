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
const OUT_FILE = path.join(__dirname, '..', 'static', 'index.json');

function walk(dir, base = '') {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const results = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.join(base, entry.name);

    if (entry.isDirectory()) {
      results.push(...walk(fullPath, relativePath));
    } else if (entry.name.endsWith('.md')) {
      const raw = fs.readFileSync(fullPath, 'utf-8');
      const { data: frontmatter, content } = matter(raw);

      // Slug: strip .md, normalise separators
      const slug = relativePath.replace(/\\/g, '/').replace(/\.md$/, '');

      results.push({
        slug,
        title: frontmatter.title ?? slug.split('/').pop(),
        description: frontmatter.description ?? '',
        tags: frontmatter.tags ?? [],
        group: frontmatter.group ?? slug.split('/')[0] ?? 'uncategorised',
        date: frontmatter.date ?? null,
        // Trim content for the index — first 500 chars is enough for search
        excerpt: content.replace(/#+\s/g, '').trim().slice(0, 500)
      });
    }
  }

  return results;
}

const index = walk(DOCS_DIR);
fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
fs.writeFileSync(OUT_FILE, JSON.stringify(index, null, 2));

console.log(`✓ Indexed ${index.length} documents → static/index.json`);
