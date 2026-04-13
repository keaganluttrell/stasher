<script>
  import TypeBadge from '$lib/components/TypeBadge.svelte';

  export let title = '';
  export let description = '';
  export let date = '';
  export let status = '';
  export let type = 'doc';
  export let source = '';
  export let pinned = false;
  export let onTogglePin = () => {};

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
</script>

<div class="border-b border-base-300/50 pb-5 mb-6">
  <!-- Type badge + Title -->
  <div class="flex items-start gap-3">
    <h1 class="text-3xl font-bold" style="font-family: 'Plus Jakarta Sans', sans-serif;">{title}</h1>
  </div>

  <!-- Description -->
  {#if description}
    <p class="text-base opacity-70 mt-2 leading-relaxed">{description}</p>
  {/if}

  <!-- Source indicator for source notes -->
  {#if type === 'note' && source}
    <p class="text-xs opacity-40 mt-1.5 flex items-center gap-1.5">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
      Summarised from: <code style="font-size: 0.7rem; padding: 0.1em 0.4em;">{source}</code>
    </p>
  {/if}

  <!-- Meta row: type badge, date, status, pin button -->
  <div class="flex items-center justify-between gap-3 mt-4">
    <div class="flex items-center gap-3 text-xs opacity-50">
      <TypeBadge {type} size="md" />
      {#if date}
        <span class="flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {formatDate(date)}
        </span>
      {/if}
      {#if status}
        <span class="badge badge-xs badge-ghost uppercase tracking-wider">{status}</span>
      {/if}
    </div>

    <div class="flex gap-2 shrink-0 items-center">
      <!-- Pin toggle -->
      <button
        class="pin-toggle-btn"
        class:pinned
        on:click={onTogglePin}
        title={pinned ? 'Unpin document' : 'Pin document'}
        aria-label={pinned ? 'Unpin document' : 'Pin document'}
      >
        {#if pinned}
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M16 4a1 1 0 0 0-1.414 0L12 6.586 9.414 4A1 1 0 0 0 8 4v7.586l-3.293 3.293a1 1 0 1 0 1.414 1.414L9 13.414V20a1 1 0 0 0 1.707.707L12 19.414l1.293 1.293A1 1 0 0 0 15 20v-6.586l2.879-2.879a1 1 0 1 0-1.414-1.414L14 11.586V4z" />
          </svg>
        {:else}
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        {/if}
      </button>
    </div>
  </div>
</div>

<style>
  .pin-toggle-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border-radius: 0.375rem;
    border: 1px solid color-mix(in oklch, var(--color-base-300, #374151) 40%, transparent);
    background: transparent;
    color: var(--color-base-content, #a6adbb);
    opacity: 0.4;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .pin-toggle-btn:hover {
    opacity: 0.8;
    border-color: var(--color-primary, #546e7a);
    color: var(--color-primary, #546e7a);
  }

  .pin-toggle-btn.pinned {
    opacity: 0.9;
    color: var(--color-primary, #546e7a);
    border-color: var(--color-primary, #546e7a);
    background: color-mix(in oklch, var(--color-primary, #546e7a) 10%, transparent);
  }
</style>
