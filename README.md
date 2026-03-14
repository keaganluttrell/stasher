# braindump

A minimal git-backed knowledge base where AI agents write markdown and humans read and edit it in the browser. No backend -- git is the database, the GitHub API is the CMS.

## Why

AI agents produce useful research, specs, and notes as a side effect of doing work. Without a shared place to put them, that knowledge evaporates. braindump gives agents a dead-simple write path (commit markdown to `docs/`) and gives humans a clean reading and editing UI on GitHub Pages.

## Tech stack

| Layer | Tool |
|-------|------|
| App shell | SvelteKit (SPA, static adapter) |
| Editor | Milkdown (WYSIWYG markdown) |
| Search | Fuse.js over a pre-built JSON index |
| Styling | Pico CSS (classless) |
| Storage | GitHub Contents API (reads and writes via PAT) |
| Hosting | GitHub Pages, deployed on every push to `main` |

## Local dev

**Prerequisites:** Node.js 20+

```bash
npm install
node scripts/index.js   # build search index from docs/
npm run dev
```

The search index (`static/index.json`) is built by walking `docs/` and extracting frontmatter. Rebuild it after adding or changing docs locally. CI does this automatically before every deploy.

## Project structure

```
docs/                  <- all markdown content lives here
  research/
  projects/autoproxy/
  projects/stacker/
  _templates/          <- skipped by indexer
scripts/
  index.js             <- walks docs/, writes static/index.json
src/
  lib/
    github.js          <- GitHub Contents API wrapper
    config.js          <- repo config store (localStorage)
    search.js          <- Fuse.js wrapper
  routes/
    +layout.svelte     <- sidebar nav + search
    +page.svelte       <- home / recent docs
    doc/[...slug]/     <- doc viewer + Milkdown editor
    settings/          <- GitHub token + repo config
```

## Frontmatter schema

Every doc in `docs/` uses this frontmatter. All five fields are expected.

```yaml
---
title: My Report Title
description: One-line summary
date: 2025-03-14
tags: research, efh, pms
group: research
---
```

The `group` field drives sidebar grouping and must match the subdirectory path relative to `docs/`. For example, a file at `docs/projects/autoproxy/PRD.md` should have `group: projects/autoproxy`.

## How agents write docs

Agents commit `.md` files to `docs/<group>/` via the GitHub Contents API or the git CLI. The only contract is:

1. Put the file under `docs/` in the right group subdirectory.
2. Include all five frontmatter fields.
3. Push to `main`.

CI handles the rest -- it rebuilds the search index and deploys to GitHub Pages.

### The `/stash` skill

A Claude Code skill at `~/.claude/skills/stash/SKILL.md` lets you write docs from any repo. Run `/stash` in Claude Code, give it a topic or content, and it writes the markdown file, commits, and pushes. It works from any working directory because all paths are absolute.

```
/stash the autoproxy market research we just did
```

The skill infers the title, group, tags, and filename. It creates subdirectories as needed and skips local index rebuilds (CI handles it).

## GitHub Pages deployment

The site deploys automatically on every push to `main` via GitHub Actions.

**One-time setup:**

1. Go to your repo's **Settings > Pages**.
2. Set the source to **GitHub Actions** (not "Deploy from a branch").
3. Push to `main`. The workflow at `.github/workflows/deploy.yml` runs: `npm ci` -> `node scripts/index.js` -> `npm run build` (with `BASE_PATH=/<repo-name>`) -> deploy.

## Settings

Visit `/settings` in the browser to configure:

- GitHub owner/org
- Repository name
- Branch
- Personal Access Token (needs `contents: write` scope)

These are stored in localStorage and used by the GitHub Contents API wrapper for in-browser editing.
