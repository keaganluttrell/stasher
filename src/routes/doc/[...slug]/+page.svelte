<script>
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import { base } from '$app/paths';
  import { browser } from '$app/environment';
  import { getDoc } from '$lib/docs.js';
  import { getIndex, lookupById } from '$lib/search.js';
  import { marked } from 'marked';
  import DocHeader from '$lib/components/DocHeader.svelte';
  import TypeBadge from '$lib/components/TypeBadge.svelte';
  import { recordVisit } from '$lib/stores/history.js';
  import { pins, togglePin, isPinned } from '$lib/stores/pins.js';
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

  let frontmatter = {};
  let body = '';
  let error = '';
  let loaded = false;

  $: if (slug) loadDoc(slug);

  async function loadDoc(s) {
    loaded = false;
    error = '';
    try {
      const doc = await getDoc(s);
      frontmatter = doc.frontmatter;
      body = doc.body;
      loaded = true;
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

  // Listen for pin toggle events from keyboard shortcuts
  function onPinEvent(e) {
    if (e.detail?.slug === slug) {
      handleTogglePin();
    }
  }

  onMount(() => {
    if (browser) {
      window.addEventListener('stasher:toggle-pin', onPinEvent);
    }
  });

  onDestroy(() => {
    if (browser) {
      window.removeEventListener('stasher:toggle-pin', onPinEvent);
    }
  });

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

  // Backlinks: find the current doc's index entry and resolve its backlinks
  $: currentEntry = loaded && slug ? getIndex().find(d => d.slug === slug) : null;
  $: backlinks = (currentEntry?.backlinks || [])
    .map(id => lookupById(id))
    .filter(Boolean);
</script>

<svelte:head>
  <title>{frontmatter.title ?? slug} — stasher</title>
</svelte:head>

{#if !loaded}
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
  />

  {#if frontmatter.type === 'map' && tocItems.length > 0}
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
