<script>
  import { onMount } from 'svelte';
  import { base } from '$app/paths';
  import { loadIndex, getIndex } from '$lib/search.js';
  import TypeBadge from '$lib/components/TypeBadge.svelte';

  let allDocs = [];
  let ready = false;

  // Computed stats
  let totalDocs = 0;
  let mapCount = 0;
  let totalLinks = 0;
  let recentActivity = 0;

  // Derived lists
  let maps = [];
  let recentDocs = [];
  let groupedRecent = [];

  function openCommandPalette() {
    window.dispatchEvent(new CustomEvent('stasher:open-command-palette'));
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    try {
      const str = String(dateStr);
      const d = str.includes('T') ? new Date(str) : new Date(str + 'T00:00:00');
      if (isNaN(d.getTime())) return str;
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return String(dateStr);
    }
  }

  function getDateGroup(dateStr) {
    if (!dateStr) return 'Earlier';
    try {
      const str = String(dateStr);
      const d = str.includes('T') ? new Date(str) : new Date(str + 'T00:00:00');
      if (isNaN(d.getTime())) return 'Earlier';

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);

      const docDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());

      if (docDate.getTime() >= today.getTime()) return 'Today';
      if (docDate.getTime() >= yesterday.getTime()) return 'Yesterday';
      if (docDate.getTime() >= weekAgo.getTime()) return 'This Week';
      return 'Earlier';
    } catch {
      return 'Earlier';
    }
  }

  function groupDocs(docs) {
    const order = ['Today', 'Yesterday', 'This Week', 'Earlier'];
    const groups = {};
    for (const doc of docs) {
      const group = getDateGroup(doc.date);
      if (!groups[group]) groups[group] = [];
      groups[group].push(doc);
    }
    return order.filter(g => groups[g]).map(g => ({ label: g, docs: groups[g] }));
  }

  onMount(async () => {
    await loadIndex();
    allDocs = getIndex();

    totalDocs = allDocs.length;
    maps = allDocs.filter(d => d.type === 'map');
    mapCount = maps.length;
    totalLinks = allDocs.reduce((sum, d) => sum + (d.links ? d.links.length : 0), 0);

    // Count docs with dates in last 7 days
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    recentActivity = allDocs.filter(d => {
      if (!d.date) return false;
      const str = String(d.date);
      const docDate = str.includes('T') ? new Date(str) : new Date(str + 'T00:00:00');
      return !isNaN(docDate.getTime()) && docDate >= weekAgo;
    }).length;

    // Recent: non-maps, sorted by date desc then title asc
    recentDocs = allDocs
      .filter(d => d.type !== 'map')
      .sort((a, b) => {
        const dateCompare = (b.date || '').localeCompare(a.date || '');
        if (dateCompare !== 0) return dateCompare;
        return (a.title || '').localeCompare(b.title || '');
      })
      .slice(0, 20);

    groupedRecent = groupDocs(recentDocs);

    ready = true;
  });

  // Track global index for separator logic across groups
  function getGlobalIndex(groupIdx, docIdx) {
    let count = 0;
    for (let i = 0; i < groupIdx; i++) {
      count += groupedRecent[i].docs.length;
    }
    return count + docIdx;
  }
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
  <div class="mc-stats-strip">
    <div class="mc-stat">
      <span class="mc-stat-number">{totalDocs}</span>
      <span class="mc-stat-label">notes</span>
    </div>
    <div class="mc-stat">
      <span class="mc-stat-number">{mapCount}</span>
      <span class="mc-stat-label">maps</span>
    </div>
    <div class="mc-stat">
      <span class="mc-stat-number">{totalLinks}</span>
      <span class="mc-stat-label">links</span>
    </div>
    <div class="mc-stat">
      <span class="mc-stat-number">{recentActivity}</span>
      <span class="mc-stat-label">this week</span>
    </div>
  </div>

  <!-- Maps section -->
  <section class="mc-section mc-section-maps">
    <h2 class="mc-heading">Maps</h2>
    <div class="mc-maps-grid">
      {#each maps as map}
        <a href="{base}/doc/{map.slug}" class="mc-map-card">
          <div class="mc-map-body">
            <h3 class="mc-map-title">{map.title}</h3>
            {#if map.description}
              <p class="mc-map-desc">{map.description}</p>
            {/if}
            <div class="mc-map-links">
              <span class="mc-map-links-number">{map.links ? map.links.length : 0}</span>
              <span class="mc-map-links-label">linked</span>
            </div>
          </div>
        </a>
      {/each}
    </div>
  </section>

  <!-- Recent section -->
  <section class="mc-section">
    <h2 class="mc-heading">Recent</h2>
    <div class="mc-recent-list">
      {#each groupedRecent as group, gi}
        <div class="mc-date-group-header">{group.label}</div>
        {#each group.docs as doc, di}
          {@const globalIdx = getGlobalIndex(gi, di)}
          <a href="{base}/doc/{doc.slug}" class="mc-recent-row" class:mc-recent-row-sep={(globalIdx + 1) % 5 === 0}>
            <div class="mc-recent-line1">
              <TypeBadge type={doc.type} size="sm" />
              <span class="mc-recent-title">{doc.title}</span>
              {#if doc.date}
                <span class="mc-recent-date">{formatDate(doc.date)}</span>
              {/if}
            </div>
            {#if doc.description}
              <div class="mc-recent-line2">
                <span class="mc-recent-desc">{doc.description}</span>
              </div>
            {/if}
          </a>
        {/each}
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

  /* Stats strip — dashboard style */
  .mc-stats-strip {
    display: flex;
    gap: 2rem;
    margin: 0 0 2rem 0;
    padding-bottom: 1.5rem;
    border-bottom: 1px solid color-mix(in oklch, var(--color-base-300, #374151) 25%, transparent);
  }

  .mc-stat {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.1rem;
  }

  .mc-stat-number {
    font-family: 'Fira Code', monospace;
    font-size: 1.5rem;
    font-weight: 700;
    opacity: 0.7;
    line-height: 1.2;
    color: var(--color-base-content, #a6adbb);
  }

  .mc-stat-label {
    font-family: 'Nunito', sans-serif;
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    opacity: 0.45;
    color: var(--color-base-content, #a6adbb);
  }

  /* Section headings */
  .mc-heading {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    opacity: 0.55;
    margin: 0 0 0.75rem 0;
  }

  .mc-section {
    margin-bottom: 2.5rem;
  }

  .mc-section-maps {
    margin-bottom: 3.5rem;
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
    border: 1px solid color-mix(in oklch, var(--color-base-300, #374151) 65%, transparent);
    border-left: 3px solid #d4883a;
    border-radius: 0.5rem;
    padding: 1.25rem 1.1rem;
    transition: background 0.12s ease, border-color 0.12s ease, transform 0.12s ease, box-shadow 0.12s ease;
    cursor: pointer;
    box-shadow: 0 1px 4px 0 rgba(0, 0, 0, 0.12);
  }

  .mc-map-card:hover {
    background: color-mix(in oklch, var(--color-base-200, #2a303c) 70%, var(--color-base-300, #374151));
    border-color: color-mix(in oklch, #d4883a 40%, transparent);
    border-left-color: #d4883a;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px 0 rgba(0, 0, 0, 0.2);
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
    opacity: 0.6;
    margin: 0;
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .mc-map-links {
    display: flex;
    align-items: baseline;
    gap: 0.3rem;
    margin-top: 0.25rem;
  }

  .mc-map-links-number {
    font-family: 'Fira Code', monospace;
    font-size: 1rem;
    font-weight: 700;
    opacity: 0.5;
    color: var(--color-base-content, #a6adbb);
  }

  .mc-map-links-label {
    font-family: 'Nunito', sans-serif;
    font-size: 0.65rem;
    opacity: 0.4;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: var(--color-base-content, #a6adbb);
  }

  /* Date group headers */
  .mc-date-group-header {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 0.65rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    opacity: 0.4;
    padding: 0.6rem 0.5rem 0.25rem;
    color: var(--color-base-content, #a6adbb);
  }

  /* Recent list */
  .mc-recent-list {
    display: flex;
    flex-direction: column;
  }

  .mc-recent-row {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    padding: 0.5rem 0.5rem;
    border-radius: 0.3rem;
    text-decoration: none;
    color: inherit;
    transition: background 0.08s ease;
    cursor: pointer;
  }

  .mc-recent-row:hover {
    background: color-mix(in oklch, var(--color-base-content, #a6adbb) 6%, transparent);
  }

  .mc-recent-row-sep {
    border-bottom: 1px solid color-mix(in oklch, var(--color-base-300, #374151) 15%, transparent);
  }

  .mc-recent-line1 {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    min-width: 0;
  }

  .mc-recent-line2 {
    padding-left: calc(0.68rem * 4 + 0.4em * 2 + 0.6rem);
  }

  .mc-recent-desc {
    font-family: 'Nunito', sans-serif;
    font-size: 0.75rem;
    opacity: 0.45;
    color: var(--color-base-content, #a6adbb);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: block;
    max-width: 100%;
  }

  .mc-recent-date {
    font-family: 'Nunito', sans-serif;
    font-size: 0.7rem;
    opacity: 0.35;
    color: var(--color-base-content, #a6adbb);
    white-space: nowrap;
    flex-shrink: 0;
    margin-left: auto;
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

    .mc-stats-strip {
      gap: 1.25rem;
    }

    .mc-stat-number {
      font-size: 1.25rem;
    }
  }
</style>
