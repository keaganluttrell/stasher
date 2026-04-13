<script>
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { history, clearHistory } from '$lib/stores/history.js';

  export let open = false;

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

  function navigate(slug) {
    close();
    goto(`${base}/doc/${slug}`);
  }

  function formatRelativeTime(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return 'yesterday';
    if (days < 7) return `${days}d ago`;
    return `${Math.floor(days / 7)}w ago`;
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if open}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div class="panel-backdrop" on:click={handleBackdropClick} role="presentation">
    <div class="panel" role="dialog" aria-modal="true" aria-label="History">
      <!-- Header -->
      <div class="panel-header">
        <h2 class="panel-title">History</h2>
        <div class="panel-header-actions">
          {#if $history.length > 0}
            <button class="panel-clear-btn" on:click={clearHistory}>Clear</button>
          {/if}
          <kbd class="panel-kbd">esc</kbd>
        </div>
      </div>

      <!-- List -->
      <div class="panel-list">
        {#if $history.length === 0}
          <div class="panel-empty">No recently viewed documents.</div>
        {:else}
          {#each $history as item}
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <div
              class="panel-row"
              on:click={() => navigate(item.slug)}
              role="button"
              tabindex="0"
            >
              <span class="panel-row-title">{item.title}</span>
              <span class="panel-row-time">{formatRelativeTime(item.timestamp)}</span>
            </div>
          {/each}
        {/if}
      </div>

      <!-- Footer -->
      <div class="panel-footer">
        <span><kbd class="panel-kbd-sm">enter</kbd> open</span>
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

  @keyframes panel-fade-in {
    from { opacity: 0; }
    to   { opacity: 1; }
  }

  .panel {
    width: 100%;
    max-width: 500px;
    margin: 0 1rem;
    background: var(--color-base-100, #1d232a);
    border: 1px solid var(--color-base-300, #374151);
    border-radius: 0.75rem;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    max-height: 60vh;
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid color-mix(in oklch, var(--color-base-300, #374151) 50%, transparent);
  }

  .panel-title {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 0.85rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-base-content, #a6adbb);
    opacity: 0.6;
    margin: 0;
  }

  .panel-header-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .panel-clear-btn {
    font-family: 'Nunito', sans-serif;
    font-size: 0.72rem;
    font-weight: 600;
    padding: 0.2em 0.5em;
    border-radius: 0.25rem;
    border: 1px solid color-mix(in oklch, var(--color-base-300, #374151) 50%, transparent);
    background: transparent;
    color: var(--color-base-content, #a6adbb);
    opacity: 0.5;
    cursor: pointer;
    transition: all 0.1s ease;
  }

  .panel-clear-btn:hover {
    opacity: 0.8;
    border-color: var(--color-error, #ef4444);
    color: var(--color-error, #ef4444);
  }

  .panel-kbd {
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

  .panel-list {
    flex: 1;
    overflow-y: auto;
    padding: 0.35rem;
    min-height: 0;
  }

  .panel-empty {
    text-align: center;
    padding: 2rem 1rem;
    font-size: 0.85rem;
    font-family: 'Nunito', sans-serif;
    color: var(--color-base-content, #a6adbb);
    opacity: 0.4;
  }

  .panel-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.55rem 0.65rem;
    border-radius: 0.4rem;
    cursor: pointer;
    transition: background 0.08s ease;
  }

  .panel-row:hover {
    background: var(--color-base-200, #2a303c);
  }

  .panel-row-title {
    font-size: 0.875rem;
    font-weight: 600;
    font-family: 'Plus Jakarta Sans', sans-serif;
    color: var(--color-base-content, #a6adbb);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
    flex: 1;
  }

  .panel-row-time {
    font-size: 0.7rem;
    font-family: 'Nunito', sans-serif;
    color: var(--color-base-content, #a6adbb);
    opacity: 0.35;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .panel-footer {
    display: flex;
    justify-content: center;
    gap: 1.25rem;
    padding: 0.65rem 0.75rem;
    border-top: 1px solid color-mix(in oklch, var(--color-base-300, #374151) 50%, transparent);
    font-size: 0.78rem;
    font-weight: 600;
    font-family: 'Plus Jakarta Sans', sans-serif;
    color: var(--color-base-content, #a6adbb);
    opacity: 0.45;
  }

  .panel-footer span {
    display: flex;
    align-items: center;
    gap: 0.3rem;
  }

  .panel-kbd-sm {
    font-size: 0.72rem;
    font-family: 'Fira Code', monospace;
    padding: 0.12em 0.4em;
    border-radius: 0.2rem;
    background: var(--color-base-200, #2a303c);
    border: 1px solid color-mix(in oklch, var(--color-base-300, #374151) 50%, transparent);
  }
</style>
