<script>
  import { onMount } from 'svelte';
  import { base } from '$app/paths';
  import { loadIndex, getGroups } from '$lib/search.js';

  let groups = {};
  let allDocs = [];
  let ready = false;
  let activeFilter = 'all';

  const GROUP_COLORS = ['primary', 'secondary', 'accent', 'info', 'success', 'warning'];

  function getGroupColorName(groupName) {
    let hash = 0;
    for (let i = 0; i < groupName.length; i++) {
      hash = groupName.charCodeAt(i) + ((hash << 5) - hash);
    }
    return GROUP_COLORS[Math.abs(hash) % GROUP_COLORS.length];
  }

  // Pre-built style maps so Tailwind can see every class statically
  const COLOR_STYLES = {
    primary: {
      dot: 'background: var(--color-primary)',
      bar: 'background: var(--color-primary)',
      chipActive: 'background: var(--color-primary); color: var(--color-primary-content); border-color: var(--color-primary)',
      hoverTitle: 'color: var(--color-primary)',
      hoverBorder: 'border-color: color-mix(in oklch, var(--color-primary), transparent 70%)',
      hoverShadow: 'box-shadow: 0 10px 15px -3px color-mix(in oklch, var(--color-primary), transparent 92%)',
    },
    secondary: {
      dot: 'background: var(--color-secondary)',
      bar: 'background: var(--color-secondary)',
      chipActive: 'background: var(--color-secondary); color: var(--color-secondary-content); border-color: var(--color-secondary)',
      hoverTitle: 'color: var(--color-secondary)',
      hoverBorder: 'border-color: color-mix(in oklch, var(--color-secondary), transparent 70%)',
      hoverShadow: 'box-shadow: 0 10px 15px -3px color-mix(in oklch, var(--color-secondary), transparent 92%)',
    },
    accent: {
      dot: 'background: var(--color-accent)',
      bar: 'background: var(--color-accent)',
      chipActive: 'background: var(--color-accent); color: var(--color-accent-content); border-color: var(--color-accent)',
      hoverTitle: 'color: var(--color-accent)',
      hoverBorder: 'border-color: color-mix(in oklch, var(--color-accent), transparent 70%)',
      hoverShadow: 'box-shadow: 0 10px 15px -3px color-mix(in oklch, var(--color-accent), transparent 92%)',
    },
    info: {
      dot: 'background: var(--color-info)',
      bar: 'background: var(--color-info)',
      chipActive: 'background: var(--color-info); color: var(--color-info-content); border-color: var(--color-info)',
      hoverTitle: 'color: var(--color-info)',
      hoverBorder: 'border-color: color-mix(in oklch, var(--color-info), transparent 70%)',
      hoverShadow: 'box-shadow: 0 10px 15px -3px color-mix(in oklch, var(--color-info), transparent 92%)',
    },
    success: {
      dot: 'background: var(--color-success)',
      bar: 'background: var(--color-success)',
      chipActive: 'background: var(--color-success); color: var(--color-success-content); border-color: var(--color-success)',
      hoverTitle: 'color: var(--color-success)',
      hoverBorder: 'border-color: color-mix(in oklch, var(--color-success), transparent 70%)',
      hoverShadow: 'box-shadow: 0 10px 15px -3px color-mix(in oklch, var(--color-success), transparent 92%)',
    },
    warning: {
      dot: 'background: var(--color-warning)',
      bar: 'background: var(--color-warning)',
      chipActive: 'background: var(--color-warning); color: var(--color-warning-content); border-color: var(--color-warning)',
      hoverTitle: 'color: var(--color-warning)',
      hoverBorder: 'border-color: color-mix(in oklch, var(--color-warning), transparent 70%)',
      hoverShadow: 'box-shadow: 0 10px 15px -3px color-mix(in oklch, var(--color-warning), transparent 92%)',
    },
  };

  function getStyles(groupName) {
    return COLOR_STYLES[getGroupColorName(groupName)] || COLOR_STYLES.primary;
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

  function formatGroupLabel(group) {
    const parts = group.split('/');
    return parts[parts.length - 1];
  }

  function formatGroupPrefix(group) {
    const parts = group.split('/');
    if (parts.length > 1) return parts.slice(0, -1).join('/') + '/';
    return '';
  }

  $: groupNames = Object.keys(groups).sort();

  $: filteredDocs = activeFilter === 'all'
    ? allDocs
    : allDocs.filter(d => d.group === activeFilter);

  $: docsGrouped = (() => {
    const result = {};
    for (const doc of filteredDocs) {
      const g = doc.group || 'uncategorised';
      if (!result[g]) result[g] = [];
      result[g].push(doc);
    }
    const sorted = {};
    for (const key of Object.keys(result).sort()) {
      sorted[key] = result[key].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    }
    return sorted;
  })();

  function truncateExcerpt(excerpt, maxLen = 140) {
    if (!excerpt) return '';
    const lines = excerpt.split('\n').filter(l => l.trim());
    const text = lines.slice(1).join(' ').replace(/\*\*/g, '').replace(/[#|>\-]/g, '').replace(/\s+/g, ' ').trim();
    if (!text) return '';
    if (text.length <= maxLen) return text;
    return text.slice(0, maxLen).replace(/\s\S*$/, '') + '...';
  }

  // Card hover state tracking
  let hoveredSlug = null;

  onMount(async () => {
    await loadIndex();
    groups = getGroups();
    allDocs = Object.values(groups)
      .flat()
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    ready = true;
  });
</script>

<svelte:head>
  <title>stasher</title>
</svelte:head>

{#if !ready}
  <div class="flex flex-col items-center justify-center py-32 gap-4">
    <span class="loading loading-dots loading-lg text-primary"></span>
    <p class="text-sm opacity-40" style="font-family: 'Nunito', sans-serif;">Loading knowledge base...</p>
  </div>
{:else if allDocs.length === 0}
  <div class="flex flex-col items-center justify-center py-32 gap-5 text-center">
    <div class="w-20 h-20 rounded-2xl bg-base-200 flex items-center justify-center">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    </div>
    <div>
      <h2 class="text-xl font-bold opacity-60" style="font-family: 'Plus Jakarta Sans', sans-serif;">No documents yet</h2>
      <p class="text-sm opacity-35 mt-1.5" style="font-family: 'Nunito', sans-serif;">Create your first document to get started.</p>
    </div>
    <a href="{base}/doc/new" class="btn btn-primary btn-sm mt-2 gap-2">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
      </svg>
      New Document
    </a>
  </div>
{:else}
  <!-- Header -->
  <div class="mb-10">
    <h1 class="text-4xl font-black tracking-tight" style="font-family: 'Unbounded', sans-serif; background: linear-gradient(135deg, var(--color-primary), var(--color-accent)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
      stasher
    </h1>
    <p class="text-sm opacity-40 mt-2.5" style="font-family: 'Nunito', sans-serif;">
      {allDocs.length} documents across {groupNames.length} {groupNames.length === 1 ? 'collection' : 'collections'}
    </p>
  </div>

  <!-- Filter chips -->
  <div class="flex flex-wrap gap-2 mb-10">
    <button
      class="btn btn-sm transition-all duration-150"
      class:btn-primary={activeFilter === 'all'}
      class:btn-ghost={activeFilter !== 'all'}
      style="{activeFilter !== 'all' ? 'border: 1px solid color-mix(in oklch, var(--color-base-300), transparent 50%)' : ''}"
      on:click={() => (activeFilter = 'all')}
    >
      All
      <span class="badge badge-xs" class:opacity-50={activeFilter !== 'all'}>{allDocs.length}</span>
    </button>
    {#each groupNames as group}
      {@const styles = getStyles(group)}
      {@const isActive = activeFilter === group}
      <button
        class="btn btn-sm transition-all duration-150"
        class:btn-ghost={!isActive}
        style="{isActive ? styles.chipActive : 'border: 1px solid color-mix(in oklch, var(--color-base-300), transparent 50%)'}"
        on:click={() => (activeFilter = activeFilter === group ? 'all' : group)}
      >
        <span class="w-2 h-2 rounded-full shrink-0" style="{isActive ? 'background: currentColor; opacity: 0.6' : styles.dot}"></span>
        {formatGroupLabel(group)}
        <span class="badge badge-xs opacity-50">{allDocs.filter(d => d.group === group).length}</span>
      </button>
    {/each}
  </div>

  <!-- Grouped document sections -->
  {#each Object.entries(docsGrouped) as [group, docs], gi}
    {@const styles = getStyles(group)}
    <section class="{gi > 0 ? 'mt-12' : ''}">
      <!-- Group header -->
      <div class="flex items-center gap-3 mb-5">
        <div class="w-1 h-6 rounded-full shrink-0" style="{styles.bar}"></div>
        <div class="flex items-baseline gap-1.5 min-w-0">
          {#if formatGroupPrefix(group)}
            <span class="text-xs uppercase tracking-wider opacity-25 font-medium shrink-0" style="font-family: 'Plus Jakarta Sans', sans-serif;">{formatGroupPrefix(group)}</span>
          {/if}
          <h2 class="text-lg font-bold truncate" style="font-family: 'Plus Jakarta Sans', sans-serif;">{formatGroupLabel(group)}</h2>
        </div>
        <span class="text-xs opacity-25 whitespace-nowrap shrink-0">{docs.length} {docs.length === 1 ? 'doc' : 'docs'}</span>
        <div class="flex-1 border-t border-base-300/20"></div>
      </div>

      <!-- Cards grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        {#each docs as doc}
          {@const docStyles = getStyles(doc.group)}
          {@const isHovered = hoveredSlug === doc.slug}
          <a
            href="{base}/doc/{doc.slug}"
            class="card bg-base-200 border border-base-300
                   transition-all duration-200 cursor-pointer no-underline"
            style="{isHovered ? `${docStyles.hoverBorder}; ${docStyles.hoverShadow}; transform: translateY(-2px); background: color-mix(in oklch, var(--color-base-200), transparent 20%)` : ''}"
            on:mouseenter={() => (hoveredSlug = doc.slug)}
            on:mouseleave={() => (hoveredSlug = null)}
          >
            <div class="card-body p-5 gap-2.5">
              <!-- Title -->
              <div class="flex items-start justify-between gap-3">
                <h3
                  class="text-[0.95rem] font-bold leading-snug transition-colors duration-200"
                  style="font-family: 'Plus Jakarta Sans', sans-serif; {isHovered ? docStyles.hoverTitle : ''}"
                >
                  {doc.title}
                </h3>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-4 w-4 shrink-0 mt-0.5 transition-all duration-200"
                  style="opacity: {isHovered ? '0.4' : '0'}; transform: translateX({isHovered ? '0' : '-4px'})"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>

              <!-- Description -->
              {#if doc.description}
                <p class="text-sm opacity-55 leading-relaxed line-clamp-2" style="font-family: 'Nunito', sans-serif;">
                  {doc.description}
                </p>
              {/if}

              <!-- Excerpt preview -->
              {#if truncateExcerpt(doc.excerpt)}
                <p class="text-xs opacity-30 leading-relaxed line-clamp-2" style="font-family: 'Nunito', sans-serif; font-style: italic;">
                  {truncateExcerpt(doc.excerpt)}
                </p>
              {/if}

              <!-- Footer: type badge + date -->
              <div class="flex items-center justify-between gap-2 mt-auto pt-2.5 border-t border-base-300/15">
                <div class="flex items-center gap-1.5">
                  {#if doc.type && doc.type !== 'doc'}
                    <span class="doc-type-chip doc-type-chip-{doc.type}">{doc.type}</span>
                  {/if}
                  {#if doc.source}
                    <span class="text-[0.6rem] opacity-25" title="Source: {doc.source}">&#x1F517;</span>
                  {/if}
                </div>
                {#if doc.date}
                  <span class="text-[0.65rem] opacity-30 whitespace-nowrap shrink-0">{formatDate(doc.date)}</span>
                {/if}
              </div>
            </div>
          </a>
        {/each}
      </div>
    </section>
  {/each}

  <!-- Footer -->
  {#if activeFilter !== 'all'}
    <div class="mt-10 text-center">
      <button
        class="btn btn-ghost btn-sm opacity-40 hover:opacity-70"
        on:click={() => (activeFilter = 'all')}
      >
        Show all {allDocs.length} documents
      </button>
    </div>
  {/if}
  <div class="mt-8 mb-4 text-center">
    <p class="text-xs opacity-20">
      {filteredDocs.length} of {allDocs.length} documents
    </p>
  </div>
{/if}

<style>
  .doc-type-chip {
    display: inline-block;
    font-size: 0.6rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 0.1em 0.45em;
    border-radius: 3px;
    line-height: 1.4;
    opacity: 0.85;
  }
  .doc-type-chip-note {
    background: color-mix(in oklch, var(--color-primary, #546e7a) 15%, transparent);
    color: var(--color-primary, #546e7a);
  }
  .doc-type-chip-source {
    background: color-mix(in oklch, #8e6bbf 15%, transparent);
    color: #8e6bbf;
  }
  .doc-type-chip-map {
    background: color-mix(in oklch, #d4883a 15%, transparent);
    color: #d4883a;
  }
</style>
