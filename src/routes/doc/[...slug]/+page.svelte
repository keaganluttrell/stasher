<script>
  import { onMount, onDestroy, tick } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { browser } from '$app/environment';
  import { config } from '$lib/config.js';
  import { getDoc } from '$lib/docs.js';
  import { getFile, putFile, createFile } from '$lib/github.js';
  import { getIndex, lookupById } from '$lib/search.js';
  import { marked } from 'marked';
  import DocHeader from '$lib/components/DocHeader.svelte';
  import TypeBadge from '$lib/components/TypeBadge.svelte';
  import { editorState, resetEditorState } from '$lib/stores/editor.js';
  import { user } from '$lib/auth.js';

  const renderer = new marked.Renderer();
  renderer.heading = function ({ text, depth }) {
    const id = text.toLowerCase().replace(/[^\w]+/g, '-').replace(/(^-|-$)/g, '');
    return `<h${depth} id="${id}"><a href="#${id}" class="anchor-link" aria-hidden="true" onclick="event.preventDefault();navigator.clipboard.writeText(location.origin+location.pathname+'#${id}');this.dataset.copied='true';setTimeout(()=>this.dataset.copied='',1500)">#</a>${text}</h${depth}>`;
  };

  // Wikilink extension: convert [[id]] to clickable links
  const wikilinkExtension = {
    extensions: [{
      name: 'wikilink',
      level: 'inline',
      start(src) { return src.indexOf('[['); },
      tokenizer(src) {
        const match = src.match(/^\[\[([^\]]+)\]\]/);
        if (match) {
          return { type: 'wikilink', raw: match[0], id: match[1].trim() };
        }
      },
      renderer(token) {
        const entry = lookupById(token.id);
        if (entry) {
          return `<a href="${base}/doc/${entry.slug}" class="wikilink">${entry.title}</a>`;
        }
        return `<span class="wikilink-broken" title="Unresolved link: ${token.id}">${token.id}</span>`;
      }
    }]
  };

  marked.use(wikilinkExtension);
  marked.use({ renderer });

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

  // ── Create flow state ──────────────────────────────────────────────
  let createStep = 1; // 1 = form, 2 = editor
  let newType = 'note';
  let newTitle = '';
  let newDescription = '';
  let newDate = new Date().toISOString().slice(0, 10);
  let creating = false;
  let createError = '';

  const TYPE_OPTIONS = [
    { value: 'note', label: 'Atom', dir: 'atoms' },
    { value: 'source', label: 'Note', dir: 'notes' },
    { value: 'map', label: 'Map', dir: 'maps' },
    { value: 'doc', label: 'Doc', dir: 'documents' },
  ];

  const TYPE_COLORS = {
    note:   '#38bdf8',
    source: '#a78bfa',
    map:    '#f59e0b',
    doc:    '#94a3b8',
  };

  function slugify(text) {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  $: newSlugBase = slugify(newTitle);
  $: needsDatePrefix = newType === 'note' || newType === 'source';
  $: newFilename = (() => {
    if (!newSlugBase) return '';
    let name = newSlugBase;
    if (needsDatePrefix) {
      name = newDate.replace(/-/g, '') + '-' + name;
    }
    if (newType === 'map') {
      name = '_map-' + name;
    }
    return name;
  })();
  $: newDirectory = TYPE_OPTIONS.find(t => t.value === newType)?.dir || 'documents';
  $: newFullSlug = newDirectory + '/' + newFilename;
  $: newId = newFilename;

  function buildCreateFrontmatter() {
    const createdBy = $user?.login || 'human';
    const fm = {
      title: newTitle,
      description: newDescription,
      date: newDate,
      group: 'zk',
      type: newType,
      id: newId,
      links: [],
      created_by: createdBy,
    };
    if (newType === 'doc' || newType === 'source') {
      fm.source = '';
    }
    return fm;
  }

  function buildCreateBody() {
    if (newType === 'source') {
      return '\n## Key Takeaways\n\n- \n\n## Extracted Notes\n\n- \n';
    }
    if (newType === 'map') {
      return '\n## Notes\n\n- \n';
    }
    return '\n';
  }

  async function startCreateEditor() {
    if (!newTitle.trim()) return;
    createStep = 2;
    await tick();
    if (editorEl) {
      await initMilkdown(buildCreateBody());
    }
  }

  async function saveNewDoc() {
    if (!$config.token) {
      createError = 'No GitHub token set. Go to Settings.';
      return;
    }
    creating = true;
    createError = '';
    try {
      const fm = buildCreateFrontmatter();
      const { getMarkdown } = await import('@milkdown/kit/utils');
      let editorBody = '';
      if (milkdownEditor) {
        editorBody = milkdownEditor.action(getMarkdown());
      }
      const fullContent = buildFrontmatter(fm) + editorBody;
      await createFile(
        $config.owner,
        $config.repo,
        newFullSlug,
        fullContent,
        `docs: create ${fm.title || newFullSlug}`,
        $config.branch
      );
      goto(base + '/doc/' + newFullSlug);
    } catch (e) {
      createError = e.message;
    } finally {
      creating = false;
    }
  }

  // ── Existing doc flow ──────────────────────────────────────────────

  $: if (slug && slug !== 'new') loadDoc(slug);

  async function loadDoc(s) {
    loaded = false;
    error = '';
    try {
      const doc = await getDoc(s);
      raw = doc.content;
      frontmatter = doc.frontmatter;
      body = doc.body;
      sha = '';
      loaded = true;
    } catch (e) {
      error = e.message;
      loaded = true;
    }
  }

  function parseFrontmatter(content) {
    const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (match) {
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
      .map(([k, v]) => {
        if (Array.isArray(v)) {
          if (v.length === 0) return `${k}: []`;
          return `${k}:\n${v.map(item => `  - ${item}`).join('\n')}`;
        }
        if (v === '' || v === null || v === undefined) return `${k}: ""`;
        // Dates: bare string (no quotes) — match YYYY-MM-DD pattern
        if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) return `${k}: ${v}`;
        return `${k}: ${v}`;
      })
      .join('\n');
    return `---\n${lines}\n---\n`;
  }

  async function startEdit() {
    editing = true;
    await tick(); // Wait for {#if editing} block to render the editorEl div
    if (!milkdownEditor && editorEl) {
      await initMilkdown(body);
    }
  }

  async function initMilkdown(content = '') {
    const { Editor, rootCtx, defaultValueCtx } = await import('@milkdown/core');
    const { commonmark } = await import('@milkdown/kit/preset/commonmark');
    const { nord } = await import('@milkdown/theme-nord');

    milkdownEditor = await Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, editorEl);
        ctx.set(defaultValueCtx, content);
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
      // Fetch current sha from GitHub for the commit
      if (!sha) {
        try {
          const remote = await getFile($config.owner, $config.repo, slug, $config.branch);
          sha = remote.sha;
        } catch (e) {
          throw new Error(`Failed to fetch file from GitHub. Check your token has repo access. (${e.message})`);
        }
      }
      const { getMarkdown } = await import('@milkdown/kit/utils');
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
      try {
        const { sha: newSha } = await getFile($config.owner, $config.repo, slug, $config.branch);
        sha = newSha;
      } catch {
        // Non-critical: sha will be re-fetched on next save
      }
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
    resetEditorState();
  });

  $: isNew = slug === 'new';
  $: renderedHtml = body ? marked(body).replace(/<table/g, '<div class="table-wrap"><table').replace(/<\/table>/g, '</table></div>') : '';

  // Build table of contents from rendered headings for map documents
  $: tocItems = (() => {
    if (frontmatter.type !== 'map' || !renderedHtml || !browser) return [];
    const div = document.createElement('div');
    div.innerHTML = renderedHtml;
    return [...div.querySelectorAll('h2, h3')].map(h => ({
      id: h.id,
      text: h.textContent,
      level: parseInt(h.tagName[1])
    }));
  })();

  // Sync editor state to the global store for keybindings
  $: editorState.set({
    editing,
    canEdit: !!$config.token && loaded && !isNew && !error,
    startEdit,
    save,
    cancelEdit
  });

  // Backlinks: find the current doc's index entry and resolve its backlinks
  $: currentEntry = loaded && slug ? getIndex().find(d => d.slug === slug) : null;
  $: backlinks = (currentEntry?.backlinks || [])
    .map(id => lookupById(id))
    .filter(Boolean);
</script>

<svelte:head>
  <title>{isNew ? 'New Document' : (frontmatter.title ?? slug)} — stasher</title>
</svelte:head>

{#if isNew}
  <div class="create-flow">
    <!-- Breadcrumb -->
    <div class="text-sm mb-4">
      <a href="{base}/" class="opacity-50 hover:opacity-80 hover:text-primary transition-all duration-200 no-underline inline-flex items-center gap-1">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        All documents
      </a>
    </div>

    <h2 class="create-heading">Create New Document</h2>

    {#if createError}
      <div role="alert" class="alert alert-error mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <div>
          <span class="font-semibold">Error</span>
          <span>{createError}</span>
        </div>
      </div>
    {/if}

    {#if createStep === 1}
      <div class="create-form">
        <!-- Type selector -->
        <div class="form-control">
          <label class="label" for="create-type">
            <span class="label-text font-semibold">Type</span>
          </label>
          <div class="type-pills" id="create-type" role="radiogroup" aria-label="Document type">
            {#each TYPE_OPTIONS as opt}
              <button
                type="button"
                class="type-pill"
                class:type-pill-active={newType === opt.value}
                style="--pill-color: {TYPE_COLORS[opt.value]}"
                on:click={() => newType = opt.value}
                role="radio"
                aria-checked={newType === opt.value}
              >
                {opt.label}
              </button>
            {/each}
          </div>
        </div>

        <!-- Title -->
        <div class="form-control">
          <label class="label" for="create-title">
            <span class="label-text font-semibold">Title <span class="text-error">*</span></span>
          </label>
          <input
            id="create-title"
            type="text"
            class="input input-bordered w-full"
            placeholder="e.g. Shoulder Tapping Tax"
            bind:value={newTitle}
            on:keydown={(e) => { if (e.key === 'Enter' && newTitle.trim()) startCreateEditor(); }}
          />
        </div>

        <!-- Description -->
        <div class="form-control">
          <label class="label" for="create-desc">
            <span class="label-text font-semibold">Description</span>
          </label>
          <input
            id="create-desc"
            type="text"
            class="input input-bordered w-full"
            placeholder="One-line summary (optional)"
            bind:value={newDescription}
          />
        </div>

        <!-- Date (read-only, auto-filled) -->
        <div class="form-control">
          <label class="label" for="create-date">
            <span class="label-text font-semibold">Date</span>
          </label>
          <input
            id="create-date"
            type="date"
            class="input input-bordered w-full"
            bind:value={newDate}
          />
        </div>

        <!-- Created by (read-only) -->
        <div class="form-control">
          <label class="label" for="create-author">
            <span class="label-text font-semibold">Created by</span>
          </label>
          <input
            id="create-author"
            type="text"
            class="input input-bordered w-full"
            value={$user?.login || 'human'}
            readonly
          />
        </div>

        <!-- ID / filename preview -->
        {#if newFilename}
          <div class="form-control">
            <label class="label">
              <span class="label-text font-semibold">File path</span>
            </label>
            <div class="id-preview">
              <span class="id-dir">docs/{newDirectory}/</span><span class="id-file">{newFilename}</span><span class="id-ext">.md</span>
            </div>
          </div>
        {/if}

        <!-- Start Writing button -->
        <button
          class="btn btn-primary mt-4 w-full"
          disabled={!newTitle.trim() || !$config.token}
          on:click={startCreateEditor}
        >
          Start Writing
        </button>
        {#if !$config.token}
          <p class="text-sm opacity-50 mt-2 text-center">You need a GitHub token to create documents. Go to <a href="{base}/settings">Settings</a>.</p>
        {/if}
      </div>

    {:else if createStep === 2}
      <!-- Step 2: Editor -->
      <div class="create-editor-header">
        <div class="create-editor-meta">
          <TypeBadge type={newType} size="md" />
          <span class="create-editor-title">{newTitle}</span>
        </div>
        <div class="create-editor-actions">
          <button class="btn btn-ghost btn-sm" on:click={() => { createStep = 1; if (milkdownEditor) { milkdownEditor.destroy(); milkdownEditor = null; } }}>
            Back
          </button>
          <button class="btn btn-primary btn-sm" disabled={creating} on:click={saveNewDoc}>
            {#if creating}
              <span class="loading loading-spinner loading-xs"></span>
              Saving...
            {:else}
              Save
            {/if}
          </button>
        </div>
      </div>
      <div bind:this={editorEl} class="border border-base-300 rounded-lg min-h-[400px] p-4"></div>
    {/if}
  </div>

{:else if !loaded}
  <div class="flex items-center gap-2">
    <span class="loading loading-spinner loading-sm text-primary"></span>
    <span>Loading...</span>
  </div>
{:else if error}
  <div role="alert" class="alert alert-error">
    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
    </svg>
    <div>
      <span class="font-semibold">Error</span>
      <span>{error}</span>
    </div>
  </div>
{:else}
  <!-- Breadcrumb -->
  <div class="text-sm mb-4">
    <a href="{base}/" class="opacity-50 hover:opacity-80 hover:text-primary transition-all duration-200 no-underline inline-flex items-center gap-1">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
      All documents
    </a>
  </div>

  <DocHeader
    title={frontmatter.title ?? slug}
    description={frontmatter.description ?? ''}
    date={frontmatter.date ?? ''}
    status={frontmatter.status ?? ''}
    type={frontmatter.type ?? 'doc'}
    source={frontmatter.source ?? ''}
    {editing}
    {saving}
    hasToken={!!$config.token}
    onEdit={startEdit}
    onSave={save}
    onCancel={cancelEdit}
  />

  {#if frontmatter.type === 'map' && tocItems.length > 0 && !editing}
    <nav class="map-toc" aria-label="Table of contents">
      <h3 class="map-toc-title">Contents</h3>
      <ol class="map-toc-list">
        {#each tocItems as item}
          <li class:indent={item.level === 3}>
            <a href="#{item.id}">{item.text}</a>
          </li>
        {/each}
      </ol>
    </nav>
  {/if}

  {#if editing}
    <div bind:this={editorEl} class="border border-base-300 rounded-lg min-h-[400px] p-4"></div>
  {:else}
    <article class="prose max-w-none">
      {@html renderedHtml}
    </article>

    {#if backlinks.length > 0}
      <nav class="backlinks-section" aria-label="Backlinks">
        <div class="backlinks-header">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          <strong>{backlinks.length} {backlinks.length === 1 ? 'note links' : 'notes link'} here</strong>
        </div>
        <div class="backlinks-list">
          {#each backlinks as bl}
            <a href="{base}/doc/{bl.slug}" class="backlink-card">
              {#if bl.type && bl.type !== 'doc'}
                <TypeBadge type={bl.type} size="sm" />
              {/if}
              <span class="backlink-title">{bl.title}</span>
              {#if bl.description}
                <span class="backlink-desc">{bl.description}</span>
              {/if}
            </a>
          {/each}
        </div>
      </nav>
    {/if}
  {/if}
{/if}

<style>
  :global(.wikilink) {
    text-decoration-style: dotted;
    text-decoration-color: color-mix(in oklch, var(--pico-primary, #546e7a) 50%, transparent);
    text-underline-offset: 3px;
  }
  :global(.wikilink::before) {
    content: '\u29C9 ';
    font-size: 0.75em;
    opacity: 0.5;
  }
  :global(.wikilink-broken) {
    color: var(--pico-del-color, #e53e3e);
    text-decoration: line-through;
    opacity: 0.6;
    cursor: help;
  }

  /* Create flow */
  .create-flow {
    max-width: 540px;
  }
  .create-heading {
    font-size: 1.4rem;
    font-weight: 700;
    margin: 0 0 1.5rem 0;
  }
  .create-form {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  .form-control {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  .label {
    padding: 0;
  }
  .label-text {
    font-size: 0.8rem;
    opacity: 0.7;
  }

  /* Type pills */
  .type-pills {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  .type-pill {
    font-size: 0.78rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    padding: 0.4em 1em;
    border-radius: 999px;
    border: 1.5px solid color-mix(in oklch, var(--pill-color) 35%, transparent);
    background: color-mix(in oklch, var(--pill-color) 8%, transparent);
    color: var(--pill-color);
    cursor: pointer;
    transition: all 0.15s;
  }
  .type-pill:hover {
    background: color-mix(in oklch, var(--pill-color) 15%, transparent);
  }
  .type-pill-active {
    background: color-mix(in oklch, var(--pill-color) 20%, transparent);
    border-color: var(--pill-color);
    box-shadow: 0 0 0 1px color-mix(in oklch, var(--pill-color) 25%, transparent);
  }

  /* ID preview */
  .id-preview {
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
    font-size: 0.8rem;
    padding: 0.5rem 0.75rem;
    border-radius: 0.375rem;
    background: color-mix(in oklch, var(--pico-card-background-color, var(--pico-background-color)) 80%, transparent);
    border: 1px solid color-mix(in oklch, var(--pico-muted-border-color, #ddd) 50%, transparent);
    opacity: 0.7;
  }
  .id-dir {
    opacity: 0.5;
  }
  .id-file {
    font-weight: 600;
  }
  .id-ext {
    opacity: 0.4;
  }

  /* Create editor header */
  .create-editor-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }
  .create-editor-meta {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .create-editor-title {
    font-weight: 600;
    font-size: 1.1rem;
  }
  .create-editor-actions {
    display: flex;
    gap: 0.5rem;
  }

  /* Map table of contents */
  .map-toc {
    margin-bottom: 2rem;
    padding: 1.25rem;
    border-radius: 0.5rem;
    background: color-mix(in oklch, var(--pico-card-background-color, var(--pico-background-color)) 80%, transparent);
    border: 1px solid color-mix(in oklch, var(--pico-muted-border-color, #ddd) 50%, transparent);
  }
  .map-toc-title {
    font-size: 0.8rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    opacity: 0.6;
    margin: 0 0 0.75rem 0;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid color-mix(in oklch, var(--pico-muted-border-color, #ddd) 30%, transparent);
  }
  .map-toc-list {
    margin: 0;
    padding-left: 1.25rem;
    list-style-type: decimal;
  }
  .map-toc-list li {
    font-size: 0.8rem;
    line-height: 1.8;
    padding: 0;
    margin: 0;
  }
  .map-toc-list li.indent {
    padding-left: 1rem;
    list-style-type: lower-alpha;
  }
  .map-toc-list li a {
    color: var(--pico-color, inherit);
    text-decoration: none;
    transition: color 0.15s;
  }
  .map-toc-list li a:hover {
    color: var(--pico-primary, #546e7a);
  }

  /* Backlinks section */
  .backlinks-section {
    margin-top: 3rem;
    padding: 1.25rem;
    border-radius: 0.5rem;
    background: color-mix(in oklch, var(--pico-card-background-color, var(--pico-background-color)) 80%, transparent);
    border: 1px solid color-mix(in oklch, var(--pico-muted-border-color, #ddd) 50%, transparent);
  }
  .backlinks-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.8rem;
    opacity: 0.6;
    margin-bottom: 0.75rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid color-mix(in oklch, var(--pico-muted-border-color, #ddd) 30%, transparent);
  }
  .backlinks-list {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }
  .backlink-card {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0.4rem;
    padding: 0.4rem 0.6rem;
    border-radius: 0.35rem;
    text-decoration: none;
    transition: background 0.15s;
    font-size: 0.85rem;
  }
  .backlink-card:hover {
    background: color-mix(in oklch, var(--pico-primary, #546e7a) 8%, transparent);
  }
  .backlink-title {
    font-weight: 500;
  }
  .backlink-desc {
    flex-basis: 100%;
    font-size: 0.75rem;
    opacity: 0.45;
    line-height: 1.4;
  }
</style>
