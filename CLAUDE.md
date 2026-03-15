# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

**stasher** — a minimal git-backed knowledge base. AI agents write markdown files to `docs/` via the GitHub API; humans read and edit them in a SvelteKit SPA hosted on GitHub Pages.

## Development Commands

```bash
npm install
node scripts/index.js   # rebuild search index (static/index.json) from docs/
npm run dev              # start SvelteKit dev server
npm run build            # production build (needs BASE_PATH env var for GitHub Pages)
```

The search index must be rebuilt after adding/changing docs. CI does this automatically before build.

## Architecture

- **SvelteKit SPA** with static adapter — deployed to GitHub Pages
- **No backend** — the GitHub Contents API is the CMS. All reads/writes go through `src/lib/github.js` using a PAT stored in localStorage
- **Search** — `scripts/index.js` walks `docs/`, extracts frontmatter, writes `static/index.json`. Client-side Fuse.js searches this index
- **Editor** — Milkdown (WYSIWYG markdown) lazy-loaded only when editing a doc
- **Styling** — Pico CSS (classless), no build-time CSS framework

## Key Paths

- `docs/` — all markdown content, organized by group subdirectories
- `scripts/index.js` — search index builder (run before build)
- `src/lib/github.js` — GitHub Contents API wrapper (getFile, putFile, createFile)
- `src/lib/config.js` — repo config store (owner, repo, branch, token in localStorage)
- `src/lib/search.js` — Fuse.js wrapper
- `src/routes/+layout.svelte` — sidebar nav + search
- `src/routes/doc/[...slug]/` — doc viewer + Milkdown editor
- `src/routes/settings/` — GitHub token + repo config

## Frontmatter Schema

All docs use this frontmatter:

```yaml
---
title: My Report Title
description: One-line summary
date: 2025-03-14
group: research          # drives sidebar grouping
type: doc                # doc | note | source | map (default: doc)
id: "research/my-report" # unique ID for linking (default: slug)
links: []                # outbound [[wikilink]] IDs
source: ""               # slug of source doc this was extracted from
created_by: agent        # agent | human
---
```

No `tags` field — use maps and links instead.

## Zettelkasten Conventions

- **note** — one atomic idea per file, in `docs/zk/`. Named `YYYYMMDD-short-slug.md`.
- **source** — summary of external content consumed. Links out to extracted notes.
- **map** — curated entry point into a topic (Map of Content). Prefixed `_map-`.
- **doc** — existing long-form project docs. Default type.
- **Linking** — use `[[id]]` wikilinks in body text. Backlinks computed at build time in `index.json`.
- Templates in `docs/_templates/` (note.md, source.md, map.md).

## Agent Write Path

Agents commit `.md` files to `docs/` (project docs) or `docs/zk/` (zettels) via the GitHub API or CLI. The GitHub Actions workflow (`deploy.yml`) re-indexes and redeploys on every push to `main`.

## Deployment

GitHub Actions on push to `main`: `npm ci` → `node scripts/index.js` → `npm run build` (with `BASE_PATH=/<repo-name>`) → deploy to GitHub Pages.
