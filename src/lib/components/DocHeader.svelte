<script>
  export let title = '';
  export let description = '';
  export let date = '';
  export let status = '';
  export let editing = false;
  export let saving = false;
  export let hasToken = false;
  export let onEdit = () => {};
  export let onSave = () => {};
  export let onCancel = () => {};

  function formatDate(dateStr) {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  }
</script>

<div class="border-b border-base-300/50 pb-5 mb-6">
  <!-- Title -->
  <h1 class="text-3xl font-bold" style="font-family: 'Plus Jakarta Sans', sans-serif;">{title}</h1>

  <!-- Description -->
  {#if description}
    <p class="text-base opacity-70 mt-2 leading-relaxed">{description}</p>
  {/if}

  <!-- Meta row: date, status, edit button -->
  <div class="flex items-center justify-between gap-3 mt-4">
    <div class="flex items-center gap-3 text-xs opacity-50">
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
