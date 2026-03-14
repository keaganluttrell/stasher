<script>
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { config } from '$lib/config.js';
  import { getFile, putFile } from '$lib/github.js';
  import { marked } from 'marked';

  // Slug is everything after /doc/ — supports nested paths
  $: slug = $page.params.slug;

  let raw = '';
  let sha = '';
  let frontmatter = {};
  let body = '';
  let editing = false;
  let saving = false;
  let error = '';
  let loaded = false;

  // Milkdown editor instance
  let editorEl;
  let milkdownEditor = null;

  $: if (slug && slug !== 'new') loadDoc(slug);

  async function loadDoc(s) {
    loaded = false;
    error = '';
    try {
      const { content, sha: fileSha } = await getFile(
        $config.owner,
        $config.repo,
        s,
        $config.branch
      );
      raw = content;
      sha = fileSha;
      parseFrontmatter(content);
      loaded = true;
    } catch (e) {
      error = e.message;
      loaded = true;
    }
  }

  function parseFrontmatter(content) {
    // Simple frontmatter parser — strips --- blocks
    const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (match) {
      // Parse YAML-ish frontmatter (basic key: value)
      frontmatter = Object.fromEntries(
        match[1].split('\n').map((line) => {
          const [k, ...v] = line.split(':');
          return [k.trim(), v.join(':').trim()];
        })
      );
      body = match[2];
    } else {
      frontmatter = {};
      body = content;
    }
  }

  function buildFrontmatter(fm) {
    if (Object.keys(fm).length === 0) return '';
    const lines = Object.entries(fm)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');
    return `---\n${lines}\n---\n`;
  }

  async function startEdit() {
    editing = true;
    // Lazy-load Milkdown only when editing
    if (!milkdownEditor && editorEl) {
      await initMilkdown();
    }
  }

  async function initMilkdown() {
    const { Editor, rootCtx, defaultValueCtx } = await import('@milkdown/core');
    const { commonmark } = await import('@milkdown/kit/preset/commonmark');
    const { nord } = await import('@milkdown/theme-nord');

    milkdownEditor = await Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, editorEl);
        ctx.set(defaultValueCtx, body);
      })
      .use(nord)
      .use(commonmark)
      .create();
  }

  async function save() {
    if (!$config.token) {
      error = 'No GitHub token set. Go to Settings.';
      return;
    }
    saving = true;
    error = '';
    try {
      // Get updated markdown from Milkdown
      const { getMarkdown } = await import('@milkdown/kit/utils');
      const { commandsCtx } = await import('@milkdown/core');
      let updatedBody = body;
      if (milkdownEditor) {
        updatedBody = milkdownEditor.action(getMarkdown());
      }
      const updatedRaw = buildFrontmatter(frontmatter) + updatedBody;
      await putFile(
        $config.owner,
        $config.repo,
        slug,
        updatedRaw,
        sha,
        `docs: update ${frontmatter.title ?? slug}`
      );
      raw = updatedRaw;
      body = updatedBody;
      editing = false;
      // Refresh sha
      const { sha: newSha } = await getFile($config.owner, $config.repo, slug, $config.branch);
      sha = newSha;
    } catch (e) {
      error = e.message;
    } finally {
      saving = false;
    }
  }

  function cancelEdit() {
    editing = false;
    if (milkdownEditor) {
      milkdownEditor.destroy();
      milkdownEditor = null;
    }
  }

  onDestroy(() => {
    milkdownEditor?.destroy();
  });

  $: renderedHtml = body ? marked(body) : '';
  $: isNew = slug === 'new';
</script>

<svelte:head>
  <title>{frontmatter.title ?? slug} — braindump</title>
</svelte:head>

{#if isNew}
  <!-- New doc form -->
  <NewDoc />
{:else if !loaded}
  <p aria-busy="true">Loading…</p>
{:else if error}
  <article>
    <header>Error</header>
    <p>{error}</p>
    {#if !$config.token}
      <a href="/settings" role="button">Configure GitHub token</a>
    {/if}
  </article>
{:else}
  <div class="doc-header">
    <hgroup>
      <h1>{frontmatter.title ?? slug}</h1>
      {#if frontmatter.description}
        <p>{frontmatter.description}</p>
      {/if}
    </hgroup>

    <div class="doc-meta">
      {#if frontmatter.tags}
        <div class="tags">
          {#each frontmatter.tags.split(',') as tag}
            <span class="tag">{tag.trim()}</span>
          {/each}
        </div>
      {/if}
      {#if frontmatter.date}
        <small>{frontmatter.date}</small>
      {/if}
    </div>

    <div class="doc-actions">
      {#if editing}
        <button on:click={save} disabled={saving} aria-busy={saving}>
          {saving ? 'Saving…' : 'Save & Commit'}
        </button>
        <button class="secondary" on:click={cancelEdit}>Cancel</button>
      {:else}
        <button class="outline" on:click={startEdit}>Edit</button>
      {/if}
    </div>
  </div>

  {#if editing}
    <!-- Milkdown editor mounts here -->
    <div bind:this={editorEl} class="milkdown-wrap"></div>
  {:else}
    <!-- Rendered markdown -->
    <article class="doc-body">
      {@html renderedHtml}
    </article>
  {/if}
{/if}

<style>
  .doc-header {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 2rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--pico-muted-border-color);
  }

  .doc-meta {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .tags {
    display: flex;
    gap: 0.35rem;
    flex-wrap: wrap;
  }

  .tag {
    background: var(--pico-secondary-background);
    color: var(--pico-secondary);
    padding: 0.1rem 0.5rem;
    border-radius: 3px;
    font-size: 0.72rem;
    font-weight: 600;
    text-transform: lowercase;
  }

  .doc-actions {
    display: flex;
    gap: 0.5rem;
  }

  .doc-actions button {
    width: auto;
    padding: 0.4rem 1rem;
    font-size: 0.875rem;
  }

  .milkdown-wrap {
    border: 1px solid var(--pico-muted-border-color);
    border-radius: var(--pico-border-radius);
    min-height: 400px;
    padding: 1rem;
  }

  .doc-body :global(h1),
  .doc-body :global(h2),
  .doc-body :global(h3) {
    margin-top: 1.5rem;
  }

  .doc-body :global(code) {
    font-size: 0.875em;
  }

  .doc-body :global(pre) {
    overflow-x: auto;
  }
</style>
