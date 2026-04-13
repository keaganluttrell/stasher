<script>
  import { onMount } from 'svelte';
  import { base } from '$app/paths';
  import { loadIndex, getIndex } from '$lib/search.js';
  import TypeBadge from '$lib/components/TypeBadge.svelte';

  let allDocs = [];
  let ready = false;

  // Stats
  let totalNotes = 0;
  let mapCount = 0;
  let totalLinks = 0;
  let orphanCount = 0;

  // Derived lists
  let gravityNotes = [];
  let maxConnections = 1;
  let densityData = [];
  let maxNoteCount = 1;
  let orphans = [];
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

    // Stats
    totalNotes = allDocs.length;
    const maps = allDocs.filter(d => d.type === 'map');
    mapCount = maps.length;
    totalLinks = allDocs.reduce((sum, d) => sum + (d.links ? d.links.length : 0), 0);

    // Gravity: top 8 notes by connection count
    const notes = allDocs.filter(d => d.type === 'atom');
    const withCounts = notes.map(d => ({
      ...d,
      connections: (d.links?.length || 0) + (d.backlinks?.length || 0),
      backlinkCount: d.backlinks?.length || 0,
      linkCount: d.links?.length || 0
    }));
    gravityNotes = withCounts.sort((a, b) => b.connections - a.connections).slice(0, 8);
    maxConnections = gravityNotes[0]?.connections || 1;

    // Density: per map
    densityData = maps.map(m => ({
      ...m,
      noteCount: m.links?.length || 0,
      displayName: m.title.replace(/^Map:\s*/i, '').split(/\s*[\u2014\-\u2013]\s*/)[0].replace(/\s+(Operations|Brand|PMS|Intelligence).*$/i, '').trim()
    }));
    maxNoteCount = Math.max(...densityData.map(d => d.noteCount), 1);

    // Orphans: notes with 0 backlinks (exclude maps)
    orphans = allDocs.filter(d => d.type !== 'map' && (!d.backlinks || d.backlinks.length === 0));
    orphanCount = orphans.length;

    // Recent: top 5 non-maps
    recentDocs = allDocs
      .filter(d => d.type !== 'map')
      .sort((a, b) => {
        const dateCompare = (b.date || '').localeCompare(a.date || '');
        if (dateCompare !== 0) return dateCompare;
        return (a.title || '').localeCompare(b.title || '');
      })
      .slice(0, 5);

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
  <!-- 1. Stats Strip -->
  <div class="mc-stats-strip">
    <div class="mc-stat">
      <span class="mc-stat-number">{totalNotes}</span>
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
      <span class="mc-stat-number">{orphanCount}</span>
      <span class="mc-stat-label">orphans</span>
    </div>
  </div>

  <!-- 2. Gravity Notes -->
  <section class="mc-section">
    <h2 class="mc-heading">Gravity <span class="mc-heading-sub">(most referenced)</span></h2>
    <div class="mc-gravity-list">
      {#each gravityNotes as note}
        <a href="{base}/doc/{note.slug}" class="mc-gravity-row">
          <div class="gravity-bg" style="width: {(note.connections / maxConnections) * 100}%"></div>
          <span class="mc-gravity-rank">#{gravityNotes.indexOf(note) + 1}</span>
          <span class="mc-gravity-title">{note.title}</span>
          <span class="mc-gravity-counts">
            <span class="mc-gravity-in">{note.backlinkCount} in</span>
            <span class="mc-gravity-out">{note.linkCount} out</span>
          </span>
        </a>
      {/each}
    </div>
  </section>

  <!-- 3. Connection Density -->
  <section class="mc-section">
    <h2 class="mc-heading">Density <span class="mc-heading-sub">(by map)</span></h2>
    <div class="mc-density-row">
      {#each densityData as col}
        <a href="{base}/doc/{col.slug}" class="mc-density-col">
          <span class="mc-density-label">{col.displayName}</span>
          <div class="mc-density-bar-container">
            <div class="mc-density-bar-fill" style="height: {(col.noteCount / maxNoteCount) * 100}%">
              <span class="mc-density-count">{col.noteCount}</span>
            </div>
          </div>
        </a>
      {/each}
    </div>
  </section>

  <!-- 4. Orphan Shelf -->
  {#if orphans.length > 0}
    <section class="mc-section">
      <h2 class="mc-heading">Orphans <span class="mc-heading-sub">(unlinked)</span> <span class="mc-orphan-badge">{orphans.length}</span></h2>
      <div class="mc-orphan-shelf">
        {#each orphans as orphan}
          <a href="{base}/doc/{orphan.slug}" class="mc-orphan-card">
            <span class="mc-orphan-title">{orphan.title}</span>
            <span class="mc-orphan-links">0 backlinks</span>
          </a>
        {/each}
      </div>
    </section>
  {/if}

  <!-- 5. Recent -->
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

  /* Stats strip */
  .mc-stats-strip {
    display: flex;
    justify-content: space-between;
    gap: 0.75rem;
    margin: 0 0 2.5rem 0;
  }

  .mc-stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.15rem;
    flex: 1;
    padding: 0.75rem 1rem;
    background: var(--color-base-200, #2a303c);
    border: 1px solid color-mix(in oklch, var(--color-base-300, #374151) 40%, transparent);
    border-radius: 0.4rem;
  }

  .mc-stat-number {
    font-family: 'Fira Code', monospace;
    font-size: 1.4rem;
    font-weight: 700;
    opacity: 0.8;
    line-height: 1;
    color: var(--color-base-content, #a6adbb);
  }

  .mc-stat-label {
    font-family: 'Nunito', sans-serif;
    font-size: 0.75rem;
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

  .mc-heading-sub {
    font-weight: 400;
    opacity: 0.65;
    text-transform: none;
    letter-spacing: normal;
  }

  .mc-section {
    margin-bottom: 2.5rem;
  }

  /* Gravity Notes */
  .mc-gravity-list {
    display: flex;
    flex-direction: column;
  }

  .mc-gravity-row {
    position: relative;
    overflow: hidden;
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.55rem 0.5rem;
    text-decoration: none;
    color: inherit;
    border-radius: 0.3rem;
    transition: background 0.08s ease;
    cursor: pointer;
  }

  .mc-gravity-row:hover {
    background: color-mix(in oklch, var(--color-base-content, #a6adbb) 6%, transparent);
  }

  .gravity-bg {
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    background: linear-gradient(to right, color-mix(in oklch, var(--color-accent) 12%, transparent), color-mix(in oklch, var(--color-accent) 4%, transparent));
    border-radius: 0.3rem;
    pointer-events: none;
  }

  .mc-gravity-rank {
    font-family: 'Fira Code', monospace;
    font-size: 0.65rem;
    opacity: 0.3;
    flex-shrink: 0;
    width: 1.5rem;
    text-align: right;
  }

  .mc-gravity-title {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--color-base-content, #a6adbb);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
    flex: 1;
  }

  .mc-gravity-counts {
    display: flex;
    gap: 0.6rem;
    flex-shrink: 0;
    margin-left: 0.5rem;
  }

  .mc-gravity-in {
    font-family: 'Fira Code', monospace;
    font-size: 0.7rem;
    color: var(--color-accent);
    opacity: 0.7;
    white-space: nowrap;
  }

  .mc-gravity-out {
    font-family: 'Fira Code', monospace;
    font-size: 0.7rem;
    opacity: 0.35;
    white-space: nowrap;
    color: var(--color-base-content, #a6adbb);
  }

  /* Connection Density */
  .mc-density-row {
    display: flex;
    justify-content: space-evenly;
    gap: 0.5rem;
  }

  .mc-density-col {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.35rem;
    text-decoration: none;
    color: inherit;
    cursor: pointer;
    flex: 1;
    min-width: 0;
    transition: opacity 0.1s ease;
  }

  .mc-density-col:hover {
    opacity: 0.8;
  }

  .mc-density-label {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 0.65rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: var(--color-base-content, #a6adbb);
    opacity: 0.6;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
  }

  .mc-density-bar-container {
    width: 100%;
    max-width: 5rem;
    height: 5rem;
    background: color-mix(in oklch, var(--color-base-300, #374151) 20%, transparent);
    border: 1px solid color-mix(in oklch, var(--color-base-300, #374151) 25%, transparent);
    border-radius: 0.35rem;
    position: relative;
    overflow: hidden;
  }

  .mc-density-bar-fill {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: linear-gradient(to top, color-mix(in oklch, var(--color-accent) 15%, transparent), color-mix(in oklch, var(--color-accent) 35%, transparent));
    border-radius: 0 0 0.3rem 0.3rem;
    transition: height 0.3s ease;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 0.3rem;
  }

  .mc-density-count {
    font-family: 'Fira Code', monospace;
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--color-accent);
    opacity: 0.9;
  }

  /* Orphan Shelf */
  .mc-orphan-badge {
    font-family: 'Fira Code', monospace;
    font-size: 0.6rem;
    font-weight: 600;
    background: color-mix(in oklch, var(--color-base-300, #374151) 40%, transparent);
    padding: 0.1em 0.45em;
    border-radius: 3px;
    opacity: 0.7;
    text-transform: none;
    letter-spacing: normal;
  }

  .mc-orphan-shelf {
    display: flex;
    gap: 0.65rem;
    overflow-x: auto;
    padding-bottom: 0.5rem;
    scrollbar-width: thin;
  }

  .mc-orphan-card {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    min-width: 11rem;
    max-width: 11rem;
    min-height: 6.5rem;
    padding: 0.75rem 0.7rem;
    border-left: 2px dashed color-mix(in oklch, var(--color-base-content, #a6adbb) 30%, transparent);
    border: 1px solid color-mix(in oklch, var(--color-base-300, #374151) 40%, transparent);
    border-left: 2px dashed color-mix(in oklch, var(--color-base-content, #a6adbb) 30%, transparent);
    background: color-mix(in oklch, var(--color-base-200, #2a303c) 90%, var(--color-base-300, #374151));
    border-radius: 0 0.35rem 0.35rem 0;
    text-decoration: none;
    color: inherit;
    cursor: pointer;
    transition: border-color 0.12s ease, box-shadow 0.12s ease, transform 0.12s ease;
    flex-shrink: 0;
  }

  .mc-orphan-card:hover {
    border-left: 2px solid var(--color-accent);
    box-shadow: 0 4px 12px 0 rgba(0, 0, 0, 0.2);
    transform: translateY(-2px);
  }

  .mc-orphan-title {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--color-base-content, #a6adbb);
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
    line-height: 1.4;
  }

  .mc-orphan-links {
    font-family: 'Fira Code', monospace;
    font-size: 0.6rem;
    opacity: 0.45;
    color: var(--color-base-content, #a6adbb);
    margin-top: auto;
    padding-top: 0.4rem;
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
    .mc-stats-strip {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.5rem;
    }

    .mc-stat-number {
      font-size: 1.15rem;
    }

    .mc-density-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .mc-density-col {
      flex: unset;
    }
  }
</style>
