<script>
  import { onMount } from 'svelte';
  import { base } from '$app/paths';
  import { loadIndex, getIndex } from '$lib/search.js';

  let allDocs = [];
  let ready = false;

  // Computed stats
  let totalDocs = 0;
  let mapCount = 0;
  let totalLinks = 0;

  // Derived lists
  let maps = [];
  let recentDocs = [];

  const TYPE_COLORS = {
    note:   { color: 'var(--color-primary, #546e7a)', bg: 'color-mix(in oklch, var(--color-primary, #546e7a) 15%, transparent)' },
    source: { color: '#8e6bbf', bg: 'color-mix(in oklch, #8e6bbf 15%, transparent)' },
    doc:    { color: 'var(--color-base-content, #999)', bg: 'color-mix(in oklch, var(--color-base-content, #999) 10%, transparent)' },
    map:    { color: '#d4883a', bg: 'color-mix(in oklch, #d4883a 15%, transparent)' },
  };

  function getTypeStyle(type) {
    return TYPE_COLORS[type] || TYPE_COLORS.doc;
  }

  function openCommandPalette() {
    window.dispatchEvent(new CustomEvent('stasher:open-command-palette'));
  }

  onMount(async () => {
    await loadIndex();
    allDocs = getIndex();

    totalDocs = allDocs.length;
    maps = allDocs.filter(d => d.type === 'map');
    mapCount = maps.length;
    totalLinks = allDocs.reduce((sum, d) => sum + (d.links ? d.links.length : 0), 0);

    // Recent: non-maps, sorted by date desc then title asc
    recentDocs = allDocs
      .filter(d => d.type !== 'map')
      .sort((a, b) => {
        const dateCompare = (b.date || '').localeCompare(a.date || '');
        if (dateCompare !== 0) return dateCompare;
        return (a.title || '').localeCompare(b.title || '');
      })
      .slice(0, 20);

    ready = true;
  });
</script>

<svelte:head>
  <title>stasher</title>
</svelte:head>

{#if !ready}
  <div class="mc-loading">
    <span class="loading loading-dots loading-lg text-primary"></span>
    <p class="mc-loading-text">Loading knowledge base...</p>
  </div>
{:else}
  <!-- Stats strip -->
  <p class="mc-stats">
    {totalDocs} notes &middot; {mapCount} maps &middot; {totalLinks} links
  </p>

  <!-- Maps section -->
  <section class="mc-section">
    <h2 class="mc-heading">Maps</h2>
    <div class="mc-maps-grid">
      {#each maps as map}
        <a href="{base}/doc/{map.slug}" class="mc-map-card">
          <div class="mc-map-body">
            <h3 class="mc-map-title">{map.title}</h3>
            {#if map.description}
              <p class="mc-map-desc">{map.description}</p>
            {/if}
            <span class="mc-map-links">{map.links ? map.links.length : 0} linked notes</span>
          </div>
        </a>
      {/each}
    </div>
  </section>

  <!-- Recent section -->
  <section class="mc-section">
    <h2 class="mc-heading">Recent</h2>
    <div class="mc-recent-list">
      {#each recentDocs as doc}
        <a href="{base}/doc/{doc.slug}" class="mc-recent-row">
          <span
            class="mc-type-badge"
            style="color: {getTypeStyle(doc.type).color}; background: {getTypeStyle(doc.type).bg};"
          >
            {doc.type || 'doc'}
          </span>
          <span class="mc-recent-title">{doc.title}</span>
        </a>
      {/each}
    </div>
    <div class="mc-show-all">
      <button class="mc-show-all-btn" on:click={openCommandPalette}>Show all</button>
    </div>
  </section>
{/if}

<style>
  /* Loading */
  .mc-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 8rem 0;
    gap: 1rem;
  }
  .mc-loading-text {
    font-size: 0.85rem;
    opacity: 0.4;
    font-family: 'Nunito', sans-serif;
  }

  /* Stats strip */
  .mc-stats {
    font-family: 'Fira Code', monospace;
    font-size: 0.8rem;
    opacity: 0.4;
    margin: 0 0 2rem 0;
    letter-spacing: 0.01em;
  }

  /* Section headings */
  .mc-heading {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    opacity: 0.35;
    margin: 0 0 0.75rem 0;
  }

  .mc-section {
    margin-bottom: 2.5rem;
  }

  /* Maps grid */
  .mc-maps-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
  }

  .mc-map-card {
    display: block;
    text-decoration: none;
    color: inherit;
    background: var(--color-base-200, #2a303c);
    border: 1px solid color-mix(in oklch, var(--color-base-300, #374151) 50%, transparent);
    border-left: 3px solid #d4883a;
    border-radius: 0.5rem;
    padding: 1.25rem 1.1rem;
    transition: background 0.12s ease, border-color 0.12s ease, transform 0.12s ease;
    cursor: pointer;
  }

  .mc-map-card:hover {
    background: color-mix(in oklch, var(--color-base-200, #2a303c) 70%, var(--color-base-300, #374151));
    border-color: color-mix(in oklch, #d4883a 40%, transparent);
    border-left-color: #d4883a;
    transform: translateY(-1px);
  }

  .mc-map-body {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .mc-map-title {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 0.9rem;
    font-weight: 700;
    margin: 0;
    line-height: 1.35;
    color: var(--color-base-content, #a6adbb);
    word-wrap: break-word;
  }

  .mc-map-desc {
    font-family: 'Nunito', sans-serif;
    font-size: 0.78rem;
    opacity: 0.5;
    margin: 0;
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .mc-map-links {
    font-family: 'Fira Code', monospace;
    font-size: 0.7rem;
    opacity: 0.35;
    margin-top: 0.25rem;
  }

  /* Recent list */
  .mc-recent-list {
    display: flex;
    flex-direction: column;
  }

  .mc-recent-row {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.4rem 0.5rem;
    border-radius: 0.3rem;
    text-decoration: none;
    color: inherit;
    transition: background 0.08s ease;
    cursor: pointer;
  }

  .mc-recent-row:hover {
    background: color-mix(in oklch, var(--color-base-content, #a6adbb) 6%, transparent);
  }

  .mc-type-badge {
    display: inline-block;
    font-size: 0.58rem;
    font-weight: 700;
    font-family: 'Plus Jakarta Sans', sans-serif;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 0.1em 0.4em;
    border-radius: 3px;
    line-height: 1.4;
    flex-shrink: 0;
    white-space: nowrap;
  }

  .mc-recent-title {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--color-base-content, #a6adbb);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
  }

  /* Show all */
  .mc-show-all {
    margin-top: 0.75rem;
    padding-left: 0.5rem;
  }

  .mc-show-all-btn {
    font-family: 'Nunito', sans-serif;
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--color-primary, #546e7a);
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    opacity: 0.7;
    transition: opacity 0.1s ease;
  }

  .mc-show-all-btn:hover {
    opacity: 1;
    text-decoration: underline;
  }

  /* Responsive */
  @media (max-width: 639px) {
    .mc-maps-grid {
      grid-template-columns: 1fr;
    }

    .mc-map-card {
      padding: 1rem 0.9rem;
    }

    .mc-map-title {
      font-size: 0.85rem;
    }
  }
</style>
