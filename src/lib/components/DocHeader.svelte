<script>
  export let title = '';
  export let description = '';
  export let date = '';
  export let status = '';
  export let type = 'doc';
  export let source = '';
  export let editing = false;
  export let saving = false;
  export let hasToken = false;
  export let onEdit = () => {};
  export let onSave = () => {};
  export let onCancel = () => {};

  const TYPE_META = {
    note:   { label: 'Note',   icon: '&#x270E;' },
    source: { label: 'Source', icon: '&#x1F4D6;' },
    map:    { label: 'Map',    icon: '&#x1F5FA;' },
    doc:    { label: 'Doc',    icon: '&#x1F4C4;' },
  };

  $: typeMeta = TYPE_META[type] || TYPE_META.doc;

  function formatDate(dateStr) {
    if (!dateStr) return '';
    try {
      // Handle both ISO strings (2026-03-14T00:00:00.000Z) and plain dates (2026-03-14)
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
  {#if type === 'source' && source}
    <p class="text-xs opacity-40 mt-1.5 flex items-center gap-1.5">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
      Summarised from: <code style="font-size: 0.7rem; padding: 0.1em 0.4em;">{source}</code>
    </p>
  {/if}

  <!-- Meta row: type badge, date, status, edit button -->
  <div class="flex items-center justify-between gap-3 mt-4">
    <div class="flex items-center gap-3 text-xs opacity-50">
      <span class="doc-type-badge doc-type-{type}">{@html typeMeta.icon} {typeMeta.label}</span>
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

    <div class="flex gap-2 shrink-0">
      {#if editing}
        <button class="btn btn-primary btn-sm" on:click={onSave} disabled={saving}>
          {#if saving}
            <span class="loading loading-spinner loading-xs"></span>
          {/if}
          {saving ? 'Saving...' : 'Save & Commit'}
        </button>
        <button class="btn btn-ghost btn-sm" on:click={onCancel}>Cancel</button>
      {:else}
        {#if hasToken}
          <button class="btn btn-outline btn-primary btn-sm transition-all duration-200" on:click={onEdit}>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </button>
        {:else}
          <div class="tooltip" data-tip="Configure GitHub token in Settings to edit">
            <button class="btn btn-outline btn-sm btn-disabled" tabindex="-1">Edit</button>
          </div>
        {/if}
      {/if}
    </div>
  </div>
</div>

<style>
  .doc-type-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.15em 0.55em;
    border-radius: 999px;
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 0.03em;
    text-transform: uppercase;
    opacity: 1;
    line-height: 1;
    white-space: nowrap;
  }
  .doc-type-note {
    background: color-mix(in oklch, var(--pico-primary-background, #546e7a) 15%, transparent);
    color: var(--pico-primary, #546e7a);
    border: 1px solid color-mix(in oklch, var(--pico-primary, #546e7a) 25%, transparent);
  }
  .doc-type-source {
    background: color-mix(in oklch, #8e6bbf 15%, transparent);
    color: #8e6bbf;
    border: 1px solid color-mix(in oklch, #8e6bbf 25%, transparent);
  }
  .doc-type-map {
    background: color-mix(in oklch, #d4883a 15%, transparent);
    color: #d4883a;
    border: 1px solid color-mix(in oklch, #d4883a 25%, transparent);
  }
  .doc-type-doc {
    background: color-mix(in oklch, var(--pico-muted-color, #999) 12%, transparent);
    color: var(--pico-muted-color, #999);
    border: 1px solid color-mix(in oklch, var(--pico-muted-color, #999) 20%, transparent);
  }
</style>
