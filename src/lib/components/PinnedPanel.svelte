<script>
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { pins, togglePin } from '$lib/stores/pins.js';

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

  function unpin(e, slug, title) {
    e.stopPropagation();
    togglePin(slug, title);
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if open}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div class="panel-backdrop" on:click={handleBackdropClick} role="presentation">
    <div class="panel" role="dialog" aria-modal="true" aria-label="Pinned documents">
      <!-- Header -->
      <div class="panel-header">
        <h2 class="panel-title">Pinned</h2>
        <kbd class="panel-kbd">esc</kbd>
      </div>

      <!-- List -->
      <div class="panel-list">
        {#if $pins.length === 0}
          <div class="panel-empty">
            No pinned documents.<br />
            <span class="panel-empty-hint">Press <kbd class="panel-kbd-inline">Cmd+B</kbd> on any doc to pin it.</span>
          </div>
        {:else}
          {#each $pins as item}
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <div
              class="panel-row"
              on:click={() => navigate(item.slug)}
              role="button"
              tabindex="0"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="pin-icon" viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                <path d="M16 4a1 1 0 0 0-1.414 0L12 6.586 9.414 4A1 1 0 0 0 8 4v7.586l-3.293 3.293a1 1 0 1 0 1.414 1.414L9 13.414V20a1 1 0 0 0 1.707.707L12 19.414l1.293 1.293A1 1 0 0 0 15 20v-6.586l2.879-2.879a1 1 0 1 0-1.414-1.414L14 11.586V4z" />
              </svg>
              <span class="panel-row-title">{item.title}</span>
              <button
                class="unpin-btn"
                on:click={(e) => unpin(e, item.slug, item.title)}
                title="Unpin"
                aria-label="Unpin {item.title}"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
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
    line-height: 1.6;
  }

  .panel-empty-hint {
    font-size: 0.75rem;
    opacity: 0.7;
    margin-top: 0.25rem;
    display: inline-block;
  }

  .panel-kbd-inline {
    font-size: 0.65rem;
    font-family: 'Fira Code', monospace;
    padding: 0.1em 0.35em;
    border-radius: 0.2rem;
    background: var(--color-base-200, #2a303c);
    border: 1px solid color-mix(in oklch, var(--color-base-300, #374151) 50%, transparent);
  }

  .panel-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.55rem 0.65rem;
    border-radius: 0.4rem;
    cursor: pointer;
    transition: background 0.08s ease;
  }

  .panel-row:hover {
    background: var(--color-base-200, #2a303c);
  }

  .pin-icon {
    flex-shrink: 0;
    opacity: 0.4;
    color: var(--color-primary, #546e7a);
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

  .unpin-btn {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.5rem;
    height: 1.5rem;
    border-radius: 0.25rem;
    border: none;
    background: transparent;
    color: var(--color-base-content, #a6adbb);
    opacity: 0.3;
    cursor: pointer;
    transition: all 0.1s ease;
  }

  .unpin-btn:hover {
    opacity: 0.8;
    background: color-mix(in oklch, var(--color-error, #ef4444) 15%, transparent);
    color: var(--color-error, #ef4444);
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
