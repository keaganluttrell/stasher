<script>
  import { onMount, onDestroy, tick } from 'svelte';
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { search, getIndex } from '$lib/search.js';
  import TypeBadge from '$lib/components/TypeBadge.svelte';

  export let open = false;

  let query = '';
  let activeFilter = 'all';
  let selectedIndex = 0;
  let inputEl;
  let resultsEl;

  const FILTERS = [
    { key: 'all',    label: 'All' },
    { key: 'atom',   label: 'Atoms' },
    { key: 'note',   label: 'Notes' },
    { key: 'map',    label: 'Maps' },
    { key: 'doc',    label: 'Docs' },
  ];

  // Compute filtered results
  $: indexLoaded = getIndex().length > 0;
  $: filteredResults = getFilteredResults(query, activeFilter);
  $: selectedIndex = Math.min(selectedIndex, Math.max(0, filteredResults.length - 1));

  function getFilteredResults(q, filter) {
    let items;
    if (q.length > 1) {
      items = search(q);
    } else {
      // No query: show all docs sorted by date descending
      items = [...getIndex()].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    }

    if (filter !== 'all') {
      items = items.filter(d => (d.type || 'doc') === filter);
    }

    return items.slice(0, 50);
  }

  function close() {
    open = false;
    query = '';
    activeFilter = 'all';
    selectedIndex = 0;
  }

  function selectResult(doc) {
    close();
    goto(`${base}/doc/${doc.slug}`);
  }

  function handleKeydown(e) {
    if (!open) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIndex = Math.min(selectedIndex + 1, filteredResults.length - 1);
      scrollToSelected();
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIndex = Math.max(selectedIndex - 1, 0);
      scrollToSelected();
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredResults[selectedIndex]) {
        selectResult(filteredResults[selectedIndex]);
      }
      return;
    }

    // Tab cycles through filters
    if (e.key === 'Tab') {
      e.preventDefault();
      const idx = FILTERS.findIndex(f => f.key === activeFilter);
      const next = e.shiftKey
        ? (idx - 1 + FILTERS.length) % FILTERS.length
        : (idx + 1) % FILTERS.length;
      activeFilter = FILTERS[next].key;
      selectedIndex = 0;
      return;
    }
  }

  function scrollToSelected() {
    tick().then(() => {
      if (!resultsEl) return;
      const item = resultsEl.querySelector(`[data-index="${selectedIndex}"]`);
      if (item) {
        item.scrollIntoView({ block: 'nearest' });
      }
    });
  }

  function handleBackdropClick(e) {
    if (e.target === e.currentTarget) {
      close();
    }
  }

  // Focus input when palette opens
  $: if (open) {
    tick().then(() => {
      inputEl?.focus();
    });
  }

  // Reset state on filter change
  $: if (activeFilter) {
    selectedIndex = 0;
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

</script>

<svelte:window on:keydown={handleKeydown} />

{#if open}
  <!-- Backdrop -->
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div
    class="cmd-backdrop"
    on:click={handleBackdropClick}
    role="presentation"
  >
    <!-- Palette -->
    <div class="cmd-palette" role="dialog" aria-modal="true" aria-label="Search documents">

      <!-- Filter pills -->
      <div class="cmd-filters">
        {#each FILTERS as filter}
          <button
            class="cmd-filter-pill"
            class:active={activeFilter === filter.key}
            on:click={() => { activeFilter = filter.key; selectedIndex = 0; inputEl?.focus(); }}
            tabindex="-1"
          >
            {filter.label}
          </button>
        {/each}
      </div>

      <!-- Search input -->
      <div class="cmd-input-wrap">
        <svg xmlns="http://www.w3.org/2000/svg" class="cmd-search-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          bind:this={inputEl}
          bind:value={query}
          type="text"
          placeholder="Search documents..."
          class="cmd-input"
          autocomplete="off"
          spellcheck="false"
        />
        <kbd class="cmd-kbd">esc</kbd>
      </div>

      <!-- Results -->
      <div class="cmd-results" bind:this={resultsEl}>
        {#if filteredResults.length === 0}
          <div class="cmd-empty">
            {#if !indexLoaded}
              Loading documents...
            {:else if query.length > 1}
              No matching documents
            {:else}
              No documents found
            {/if}
          </div>
        {:else}
          {#if !query || query.length <= 1}
            <div class="cmd-section-label">
              {activeFilter === 'all' ? 'Recent documents' : `${FILTERS.find(f => f.key === activeFilter)?.label || ''}`}
            </div>
          {/if}
          {#each filteredResults as doc, i}
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <div
              class="cmd-result"
              class:selected={i === selectedIndex}
              data-index={i}
              on:click={() => selectResult(doc)}
              on:mouseenter={() => (selectedIndex = i)}
              role="option"
              aria-selected={i === selectedIndex}
            >
              <div class="cmd-result-main">
                <TypeBadge type={doc.type} size="sm" />
                <span class="cmd-result-title">{doc.title}</span>
              </div>
              <div class="cmd-result-meta">
                {#if doc.description}
                  <span class="cmd-result-desc">{doc.description}</span>
                {/if}
                {#if doc.date}
                  <span class="cmd-result-date">{formatDate(doc.date)}</span>
                {/if}
              </div>
            </div>
          {/each}
        {/if}
      </div>

      <!-- Footer hint -->
      <div class="cmd-footer">
        <span><kbd class="cmd-kbd-sm">&uarr;</kbd><kbd class="cmd-kbd-sm">&darr;</kbd> navigate</span>
        <span><kbd class="cmd-kbd-sm">enter</kbd> open</span>
        <span><kbd class="cmd-kbd-sm">tab</kbd> filter</span>
        <span><kbd class="cmd-kbd-sm">esc</kbd> close</span>
      </div>
    </div>
  </div>
{/if}

<style>
  .cmd-backdrop {
    position: fixed;
    inset: 0;
    z-index: 9999;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding-top: 12vh;
    animation: cmd-fade-in 0.1s ease;
  }

  @keyframes cmd-fade-in {
    from { opacity: 0; }
    to   { opacity: 1; }
  }

  .cmd-palette {
    width: 100%;
    max-width: 600px;
    margin: 0 1rem;
    background: var(--color-base-100, #1d232a);
    border: 1px solid var(--color-base-300, #374151);
    border-radius: 0.75rem;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    max-height: 70vh;
  }

  /* Filter pills */
  .cmd-filters {
    display: flex;
    justify-content: space-evenly;
    gap: 0.35rem;
    padding: 0.75rem 0.75rem 0;
    flex-wrap: wrap;
  }

  .cmd-filter-pill {
    font-size: 0.7rem;
    font-weight: 600;
    font-family: 'Plus Jakarta Sans', sans-serif;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 0.3em 0.65em;
    border-radius: 0.35rem;
    border: 1px solid color-mix(in oklch, var(--color-base-300, #374151) 60%, transparent);
    background: transparent;
    color: var(--color-base-content, #a6adbb);
    opacity: 0.6;
    cursor: pointer;
    transition: all 0.1s ease;
  }

  .cmd-filter-pill:hover {
    opacity: 0.85;
    border-color: var(--color-base-300, #374151);
  }

  .cmd-filter-pill.active {
    opacity: 1;
    background: var(--color-primary, #546e7a);
    color: var(--color-primary-content, #fff);
    border-color: var(--color-primary, #546e7a);
  }

  /* Input */
  .cmd-input-wrap {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.75rem;
    border-bottom: 1px solid color-mix(in oklch, var(--color-base-300, #374151) 50%, transparent);
  }

  .cmd-search-icon {
    width: 1.1rem;
    height: 1.1rem;
    opacity: 0.35;
    flex-shrink: 0;
  }

  .cmd-input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: var(--color-base-content, #a6adbb);
    font-size: 0.95rem;
    font-family: 'Nunito', sans-serif;
  }

  .cmd-input::placeholder {
    color: var(--color-base-content, #a6adbb);
    opacity: 0.35;
  }

  .cmd-kbd {
    font-size: 0.6rem;
    font-family: 'Fira Code', monospace;
    padding: 0.15em 0.4em;
    border-radius: 0.25rem;
    background: var(--color-base-200, #2a303c);
    color: var(--color-base-content, #a6adbb);
    opacity: 0.4;
    border: 1px solid color-mix(in oklch, var(--color-base-300, #374151) 50%, transparent);
    flex-shrink: 0;
  }

  /* Results */
  .cmd-results {
    flex: 1;
    overflow-y: auto;
    padding: 0.35rem;
    min-height: 0;
  }

  .cmd-section-label {
    font-size: 0.65rem;
    font-weight: 600;
    font-family: 'Plus Jakarta Sans', sans-serif;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-base-content, #a6adbb);
    opacity: 0.35;
    padding: 0.5rem 0.6rem 0.25rem;
  }

  .cmd-empty {
    text-align: center;
    padding: 2rem 1rem;
    font-size: 0.85rem;
    font-family: 'Nunito', sans-serif;
    color: var(--color-base-content, #a6adbb);
    opacity: 0.4;
  }

  .cmd-result {
    padding: 0.55rem 0.65rem;
    border-radius: 0.4rem;
    cursor: pointer;
    transition: background 0.08s ease;
  }

  .cmd-result:hover,
  .cmd-result.selected {
    background: var(--color-base-200, #2a303c);
  }

  .cmd-result-main {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .cmd-result-title {
    font-size: 0.875rem;
    font-weight: 600;
    font-family: 'Plus Jakarta Sans', sans-serif;
    color: var(--color-base-content, #a6adbb);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
  }

  .cmd-result-meta {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
    margin-top: 0.15rem;
    padding-left: calc(0.58rem * 4 + 0.4em * 2 + 0.5rem); /* align under title, past badge */
  }

  .cmd-result-desc {
    font-size: 0.75rem;
    font-family: 'Nunito', sans-serif;
    color: var(--color-base-content, #a6adbb);
    opacity: 0.45;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
    flex: 1;
  }

  .cmd-result-date {
    font-size: 0.65rem;
    font-family: 'Nunito', sans-serif;
    color: var(--color-base-content, #a6adbb);
    opacity: 0.3;
    white-space: nowrap;
    flex-shrink: 0;
  }

  /* Footer */
  .cmd-footer {
    display: flex;
    justify-content: space-evenly;
    gap: 1.25rem;
    padding: 0.65rem 0.75rem;
    border-top: 1px solid color-mix(in oklch, var(--color-base-300, #374151) 50%, transparent);
    font-size: 0.78rem;
    font-weight: 600;
    font-family: 'Plus Jakarta Sans', sans-serif;
    color: var(--color-base-content, #a6adbb);
    opacity: 0.45;
  }

  .cmd-footer span {
    display: flex;
    align-items: center;
    gap: 0.3rem;
  }

  .cmd-kbd-sm {
    font-size: 0.72rem;
    font-family: 'Fira Code', monospace;
    padding: 0.12em 0.4em;
    border-radius: 0.2rem;
    background: var(--color-base-200, #2a303c);
    border: 1px solid color-mix(in oklch, var(--color-base-300, #374151) 50%, transparent);
  }
</style>
