<script>
  import { onMount, onDestroy, tick } from 'svelte';
  import { page } from '$app/stores';
  import { goto, beforeNavigate } from '$app/navigation';
  import { base } from '$app/paths';
  import { browser } from '$app/environment';
  import { config } from '$lib/config.js';
  import { getDoc } from '$lib/docs.js';
  import { getFile, putFile, createFile, trashFile } from '$lib/github.js';
  import { getIndex, lookupById } from '$lib/search.js';
  import { marked } from 'marked';
  import DocHeader from '$lib/components/DocHeader.svelte';
  import TypeBadge from '$lib/components/TypeBadge.svelte';
  import { editorState, resetEditorState } from '$lib/stores/editor.js';
  import { user } from '$lib/auth.js';
  import { recordVisit } from '$lib/stores/history.js';
  import { pins, togglePin, isPinned } from '$lib/stores/pins.js';
  import { bin, toggleBin, isInBin } from '$lib/stores/bin.js';
  import { showToast } from '$lib/stores/toast.js';

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
  let newType = '';
  let newTitle = '';
  let newDescription = '';
  let newDate = new Date().toISOString().slice(0, 10);
  let creating = false;
  let createError = '';

  const TYPE_OPTIONS = [
    { value: 'atom', label: 'Atom', dir: 'atoms', desc: 'A single, self-contained idea' },
    { value: 'note', label: 'Note', dir: 'notes', desc: 'Summarised from a source' },
    { value: 'map', label: 'Map', dir: 'maps', desc: 'Index linking related notes' },
    { value: 'doc', label: 'Doc', dir: 'documents', desc: 'Long-form document or guide' },
  ];

  const TYPE_COLORS = {
    atom:   '#38bdf8',
    note:   '#a78bfa',
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
  $: needsDatePrefix = newType === 'atom' || newType === 'note';
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
    if (newType === 'doc' || newType === 'note') {
      fm.source = '';
    }
    return fm;
  }

  function buildCreateBody() {
    if (newType === 'note') {
      return '\n## Key Takeaways\n\n- \n\n## Extracted Notes\n\n- \n';
    }
    if (newType === 'map') {
      return '\n## Notes\n\n- \n';
    }
    return '\n';
  }

  async function getEditorContent() {
    if (!milkdownEditor) return '';
    try {
      const { getMarkdown } = await import('@milkdown/kit/utils');
      return milkdownEditor.action(getMarkdown());
    } catch {
      return '';
    }
  }

  function isContentBeyondTemplate(content) {
    const template = buildCreateBody().trim();
    const current = (content || '').trim();
    if (!current) return false;
    return current !== template;
  }

  // Data loss prevention: beforeNavigate guard
  beforeNavigate(async ({ cancel }) => {
    if (isNew && milkdownEditor) {
      const content = await getEditorContent();
      if (isContentBeyondTemplate(content) || newTitle.trim()) {
        if (!confirm('You have unsaved content that will be lost. Leave this page?')) {
          cancel();
        }
      }
    }
  });

  // Data loss prevention: beforeunload guard
  function handleBeforeUnload(e) {
    if (isNew && (newTitle.trim() || milkdownEditor)) {
      e.preventDefault();
      e.returnValue = '';
    }
  }

  // Autofocus title and init editor when create page renders
  $: if (isNew && browser) {
    tick().then(async () => {
      document.getElementById('create-title')?.focus();
      if (editorEl && !milkdownEditor) {
        await initMilkdown(buildCreateBody());
      }
    });
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
      // Record this visit in history
      if (frontmatter.title) {
        recordVisit(s, frontmatter.title);
      }
    } catch (e) {
      error = e.message;
      loaded = true;
    }
  }

  // Pin state
  $: currentPinned = $pins.some((p) => p.slug === slug);

  function handleTogglePin() {
    const title = frontmatter.title || slug;
    const nowPinned = togglePin(slug, title);
    showToast(nowPinned ? `Pinned: ${title}` : `Unpinned: ${title}`);
  }

  // Bin state
  $: currentInBin = $bin.some((b) => b.slug === slug);

  let trashing = false;

  async function handleToggleBin() {
    if (!$config.token || !$config.owner || !$config.repo) {
      showToast('Configure GitHub token in Settings');
      return;
    }
    const title = frontmatter.title || slug;
    trashing = true;
    showToast(`Moving to trash: ${title}...`);
    try {
      await trashFile($config.owner, $config.repo, slug, $config.branch);
      toggleBin(slug, title); // track in localStorage for the bin panel
      showToast(`Trashed: ${title}`);
      goto(base + '/');
    } catch (err) {
      showToast(`Trash failed: ${err.message}`);
    } finally {
      trashing = false;
    }
  }

  // Listen for pin/bin toggle events from keyboard shortcuts
  function onPinEvent(e) {
    if (e.detail?.slug === slug) {
      handleTogglePin();
    }
  }

  function onBinEvent(e) {
    if (e.detail?.slug === slug) {
      handleToggleBin();
    }
  }

  onMount(() => {
    if (browser) {
      window.addEventListener('stasher:toggle-pin', onPinEvent);
      window.addEventListener('stasher:toggle-bin', onBinEvent);
      window.addEventListener('beforeunload', handleBeforeUnload);
    }
  });

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
    const { gfm } = await import('@milkdown/kit/preset/gfm');
    const { nord } = await import('@milkdown/theme-nord');

    milkdownEditor = await Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, editorEl);
        ctx.set(defaultValueCtx, content);
      })
      .use(nord)
      .use(commonmark)
      .use(gfm)
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

  function formatDate(dateStr) {
    if (!dateStr) return '';
    try {
      const str = String(dateStr);
      const d = str.includes('T') ? new Date(str) : new Date(str + 'T00:00:00');
      if (isNaN(d.getTime())) return str;
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return String(dateStr);
    }
  }

  onDestroy(() => {
    milkdownEditor?.destroy();
    resetEditorState();
    if (browser) {
      window.removeEventListener('stasher:toggle-pin', onPinEvent);
      window.removeEventListener('stasher:toggle-bin', onBinEvent);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    }
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
    <!-- Back -->
    <div class="text-sm mb-4">
      <a href="{base}/" class="opacity-50 hover:opacity-80 hover:text-primary transition-all duration-200 no-underline inline-flex items-center gap-1">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </a>
    </div>

    <!-- Meta line: date + author -->
    <div class="create-meta-line">
      <span>{formatDate(newDate)}</span>
      <span>{$user?.name || $user?.login || 'Unknown'}</span>
    </div>

    <!-- Title: inline editable heading -->
    <input
      id="create-title"
      type="text"
      class="create-title-input"
      placeholder="Untitled"
      bind:value={newTitle}
    />

    <!-- Type badges -->
    <div class="create-type-badges">
      {#each TYPE_OPTIONS as opt}
        <button
          type="button"
          class="create-type-badge"
          class:selected={newType === opt.value}
          style="--badge-color: {TYPE_COLORS[opt.value]}"
          on:click={() => newType = newType === opt.value ? '' : opt.value}
        >
          {opt.label}
        </button>
      {/each}
    </div>

    {#if createError}
      <div role="alert" class="alert alert-error mb-2 mt-2">
        <span>{createError}</span>
      </div>
    {/if}

    <!-- Writing area: fills remaining space -->
    <div class="create-editor-wrap">
      <div bind:this={editorEl} class="editor-surface create-editor-full"></div>
    </div>

    <!-- Save -->
    {#if !$config.token}
      <div class="alert alert-warning mt-2">
        <span>Connect GitHub to create documents.</span>
        <a href="{base}/settings" class="btn btn-sm btn-primary">Settings</a>
      </div>
    {:else}
      <button
        class="btn btn-primary w-full mt-2"
        disabled={!newTitle.trim() || !newType || creating}
        on:click={saveNewDoc}
      >
        {#if creating}
          <span class="loading loading-spinner loading-xs"></span>
          Saving...
        {:else}
          Save &amp; Commit
        {/if}
      </button>
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
    pinned={currentPinned}
    onTogglePin={handleTogglePin}
    binned={currentInBin}
    onToggleBin={handleToggleBin}
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
    <div bind:this={editorEl} class="editor-surface"></div>
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
    display: flex;
    flex-direction: column;
    min-height: calc(100vh - 6rem);
  }

  /* Title: inline heading input */
  .create-title-input {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 2rem;
    font-weight: 700;
    line-height: 1.2;
    background: none;
    border: none;
    outline: none;
    width: 100%;
    color: var(--color-base-content);
    padding: 0;
    margin: 0 0 0.25rem 0;
  }
  .create-title-input::placeholder {
    color: var(--color-base-content);
    opacity: 0.2;
  }

  /* Meta line: date + author */
  .create-meta-line {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-family: 'Nunito', sans-serif;
    font-size: 0.75rem;
    opacity: 0.35;
    margin-bottom: 0.75rem;
  }

  /* Type badges */
  .create-type-badges {
    display: flex;
    gap: 0.4rem;
    margin-bottom: 0.75rem;
  }
  .create-type-badge {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 0.3em 0.8em;
    border-radius: 999px;
    border: 1.5px solid color-mix(in oklch, var(--color-base-300) 60%, transparent);
    background: transparent;
    color: var(--color-base-content);
    opacity: 0.4;
    cursor: pointer;
    transition: all 0.12s ease;
  }
  .create-type-badge:hover {
    opacity: 0.7;
    border-color: color-mix(in oklch, var(--badge-color) 40%, transparent);
  }
  .create-type-badge.selected {
    opacity: 1;
    color: var(--badge-color);
    border-color: var(--badge-color);
    background: color-mix(in oklch, var(--badge-color) 12%, transparent);
  }

  /* Editor fills remaining space */
  .create-editor-wrap {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
  .create-editor-full {
    flex: 1;
    min-height: 300px;
  }

  /* ID preview */
  .id-preview {
    font-family: 'Fira Code', monospace;
    font-size: 0.78rem;
    padding: 0.4rem 0.6rem;
    border-radius: 0.25rem;
    background: color-mix(in oklch, var(--color-base-300) 30%, transparent);
    opacity: 0.8;
  }
  .id-dir {
    opacity: 0.5;
  }
  .id-file {
    font-weight: 600;
    color: var(--color-primary);
  }
  .id-ext {
    opacity: 0.4;
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
