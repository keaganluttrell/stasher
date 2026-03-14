# braindump

A minimal git-backed knowledge base. AI agents write markdown. Humans read and edit in the browser.

## Stack

- **SvelteKit** — SPA shell, static adapter
- **Milkdown** — Notion-style WYSIWYG markdown editor
- **Fuse.js** — client-side fuzzy search over a pre-built index
- **Pico CSS** — classless styling
- **GitHub Contents API** — browser edits commit directly to the repo
- **GitHub Pages** — static hosting, deployed on every push to `main`

## Structure

```
docs/                  ← all markdown files live here
  research/
    ai-pms-landscape.md
  efh/
    ring-2-spaces.md
scripts/
  index.js             ← walks /docs, writes static/index.json
src/
  lib/
    github.js          ← GitHub Contents API wrapper
    config.js          ← repo config store (localStorage)
    search.js          ← Fuse.js wrapper
  routes/
    +layout.svelte     ← sidebar nav + search
    +page.svelte       ← home / recent docs
    doc/[...slug]/     ← viewer + Milkdown editor
    settings/          ← GitHub token + repo config
```

## Frontmatter schema

```yaml
---
title: My Report Title
description: One-line summary
date: 2025-03-14
tags: research, efh, pms
group: research          # drives sidebar grouping
---
```

## Local dev

```bash
npm install
node scripts/index.js   # build search index
npm run dev
```

## Agent write path

Agents commit `.md` files to `docs/` via the GitHub API or CLI.
The GitHub Actions workflow re-indexes and redeploys on every push to `main`.

## Settings

Visit `/settings` in the browser to configure:
- GitHub owner / org
- Repository name  
- Branch
- Personal Access Token (needs `contents: write`)
