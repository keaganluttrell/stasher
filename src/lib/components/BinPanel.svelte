<script>
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { config } from '$lib/config.js';
  import { restoreFile } from '$lib/github.js';
  import { bin, removeFromBin, clearBin } from '$lib/stores/bin.js';
  import { showToast } from '$lib/stores/toast.js';

  export let open = false;

  let restoring = null; // slug currently being restored

  function close() {
    open = false;
  }

  function handleBackdropClick(e) {
    if (e.target === e.currentTarget) {
      close();
    }
  }

  function handleKeydown(e) {
    if (!open) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      close();
    }
  }

  async function restore(e, item) {
    e.stopPropagation();
    if (!$config.token || !$config.owner || !$config.repo) {
      showToast('Configure GitHub token in Settings');
      return;
    }
    restoring = item.slug;
    try {
      await restoreFile($config.owner, $config.repo, item.slug, $config.branch);
      removeFromBin(item.slug);
      showToast(`Restored: ${item.title}`);
    } catch (err) {
      showToast(`Restore failed: ${err.message}`);
    } finally {
      restoring = null;
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if open}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div class="panel-backdrop" on:click={handleBackdropClick} role="presentation">
    <div class="panel" role="dialog" aria-modal="true" aria-label="Bin — marked for deletion">
      <div class="panel-header">
        <h2 class="panel-title">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="opacity: 0.5;">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Bin
        </h2>
        <kbd class="panel-kbd">esc</kbd>
      </div>

      <div class="panel-list">
        {#if $bin.length === 0}
          <div class="panel-empty">
            Bin is empty.<br />
            <span class="panel-empty-hint">Press <kbd class="panel-kbd-inline">Cmd+D</kbd> on any doc to move it here.</span>
          </div>
        {:else}
          {#each $bin as item}
            <div class="panel-row">
              <svg xmlns="http://www.w3.org/2000/svg" class="bin-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span class="panel-row-title">{item.title}</span>
              <button
                class="restore-btn"
                on:click={(e) => restore(e, item)}
                title="Restore"
                aria-label="Restore {item.title}"
                disabled={restoring === item.slug}
              >
                {#if restoring === item.slug}
                  <span class="loading loading-spinner" style="width: 12px; height: 12px;"></span>
                {:else}
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3 10h10a5 5 0 010 10H9m4-10l-4-4m4 4l-4 4" />
                  </svg>
                {/if}
              </button>
            </div>
          {/each}
        {/if}
      </div>

      <div class="panel-footer">
        <span><kbd class="panel-kbd-sm">restore</kbd> undo delete</span>
        <span><kbd class="panel-kbd-sm">esc</kbd> close</span>
      </div>
    </div>
  </div>
{/if}

<style>
  .panel-backdrop {
    position: fixed;
    inset: 0;
    z-index: 9999;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding-top: 12vh;
    animation: panel-fade-in 0.1s ease;
  }
  @keyframes panel-fade-in { from { opacity: 0; } to { opacity: 1; } }
  .panel {
    width: 100%; max-width: 500px; margin: 0 1rem;
    background: var(--color-base-100, #1d232a);
    border: 1px solid var(--color-base-300, #374151);
    border-radius: 0.75rem;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4);
    display: flex; flex-direction: column; overflow: hidden; max-height: 60vh;
  }
  .panel-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid color-mix(in oklch, var(--color-base-300, #374151) 50%, transparent);
  }
  .panel-title {
    font-family: 'Plus Jakarta Sans', sans-serif; font-size: 0.85rem; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.06em;
    color: var(--color-error, #ef4444); opacity: 0.7; margin: 0;
    display: flex; align-items: center; gap: 0.4rem;
  }
  .panel-kbd {
    font-size: 0.6rem; font-family: 'Fira Code', monospace;
    padding: 0.15em 0.4em; border-radius: 0.25rem;
    background: var(--color-base-200, #2a303c); color: var(--color-base-content, #a6adbb);
    opacity: 0.4; border: 1px solid color-mix(in oklch, var(--color-base-300, #374151) 50%, transparent);
  }
  .panel-list { flex: 1; overflow-y: auto; padding: 0.35rem; min-height: 0; }
  .panel-empty {
    text-align: center; padding: 2rem 1rem; font-size: 0.85rem;
    font-family: 'Nunito', sans-serif; color: var(--color-base-content, #a6adbb); opacity: 0.4; line-height: 1.6;
  }
  .panel-empty-hint { font-size: 0.75rem; opacity: 0.7; margin-top: 0.25rem; display: inline-block; }
  .panel-kbd-inline {
    font-size: 0.65rem; font-family: 'Fira Code', monospace;
    padding: 0.1em 0.35em; border-radius: 0.2rem;
    background: var(--color-base-200, #2a303c);
    border: 1px solid color-mix(in oklch, var(--color-base-300, #374151) 50%, transparent);
  }
  .panel-row {
    display: flex; align-items: center; gap: 0.5rem;
    padding: 0.55rem 0.65rem; border-radius: 0.4rem; transition: background 0.08s ease;
  }
  .panel-row:hover { background: var(--color-base-200, #2a303c); }
  .bin-icon { flex-shrink: 0; opacity: 0.35; color: var(--color-error, #ef4444); }
  .panel-row-title {
    font-size: 0.875rem; font-weight: 600; font-family: 'Plus Jakarta Sans', sans-serif;
    color: var(--color-base-content, #a6adbb); white-space: nowrap; overflow: hidden;
    text-overflow: ellipsis; min-width: 0; flex: 1;
  }
  .restore-btn {
    flex-shrink: 0; display: flex; align-items: center; justify-content: center;
    width: 1.5rem; height: 1.5rem; border-radius: 0.25rem; border: none;
    background: transparent; color: var(--color-base-content, #a6adbb);
    opacity: 0.3; cursor: pointer; transition: all 0.1s ease;
  }
  .restore-btn:hover {
    opacity: 0.8; background: color-mix(in oklch, var(--color-success, #22c55e) 15%, transparent);
    color: var(--color-success, #22c55e);
  }
  .panel-footer {
    display: flex; justify-content: center; gap: 1.25rem;
    padding: 0.65rem 0.75rem;
    border-top: 1px solid color-mix(in oklch, var(--color-base-300, #374151) 50%, transparent);
    font-size: 0.78rem; font-weight: 600; font-family: 'Plus Jakarta Sans', sans-serif;
    color: var(--color-base-content, #a6adbb); opacity: 0.45;
  }
  .panel-footer span { display: flex; align-items: center; gap: 0.3rem; }
  .panel-kbd-sm {
    font-size: 0.72rem; font-family: 'Fira Code', monospace;
    padding: 0.12em 0.4em; border-radius: 0.2rem;
    background: var(--color-base-200, #2a303c);
    border: 1px solid color-mix(in oklch, var(--color-base-300, #374151) 50%, transparent);
  }
</style>
