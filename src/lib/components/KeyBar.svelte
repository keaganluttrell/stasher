<script>
  import { page } from '$app/stores';
  import { base } from '$app/paths';
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';
  import { editorState } from '$lib/stores/editor.js';
  import { config } from '$lib/config.js';

  export let onSearch = () => {};

  // Platform detection
  $: isMac = browser && /Mac|iPhone|iPad|iPod/.test(navigator.platform);
  $: mod = isMac ? '\u2318' : 'Ctrl';

  // Route detection
  $: isDocPage = $page.url.pathname.startsWith(base + '/doc/');

  // Editor state
  $: editing = $editorState.editing;
  $: canEdit = $editorState.canEdit;

  // Build visible shortcuts
  $: shortcuts = buildShortcuts(isDocPage, editing, canEdit);

  function buildShortcuts(isDoc, ed, can) {
    const items = [
      { key: 'K', label: 'Search', action: () => onSearch(), always: true, icon: 'search' },
      { key: ',', label: 'Settings', action: () => goto(base + '/settings'), always: true, icon: 'settings' },
      { key: 'N', label: 'Create', action: () => goto(base + '/doc/new'), always: true, icon: 'create' },
    ];

    if (isDoc && !ed && can) {
      items.push({ key: 'E', label: 'Edit', action: () => $editorState.startEdit(), always: false, icon: 'edit' });
    }

    if (isDoc && ed) {
      items.push({ key: 'S', label: 'Save', action: () => $editorState.save(), always: false, icon: 'save' });
      items.push({ key: 'Esc', label: 'Cancel', action: () => $editorState.cancelEdit(), always: false, icon: 'cancel', noMod: true });
    }

    return items;
  }
</script>

<nav class="keybar" aria-label="Keyboard shortcuts">
  {#each shortcuts as s}
    <button class="keybar-chip" on:click={s.action} title="{s.noMod ? '' : mod}{s.key} {s.label}">
      <kbd class="keybar-kbd">{s.noMod ? '' : mod}{s.key}</kbd>
      <span class="keybar-label">{s.label}</span>
    </button>
  {/each}
</nav>

<style>
  .keybar {
    position: fixed;
    bottom: 1rem;
    left: 1rem;
    z-index: 90;
    display: flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.3rem 0.4rem;
    border-radius: 0.5rem;
    background: color-mix(in oklch, var(--color-base-200, #2a303c) 80%, transparent);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid color-mix(in oklch, var(--color-base-300, #374151) 30%, transparent);
    opacity: 0.5;
    transition: opacity 0.2s ease;
  }

  .keybar:hover {
    opacity: 1;
  }

  .keybar-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    height: 2rem;
    padding: 0 0.5rem;
    border-radius: 0.35rem;
    border: none;
    background: transparent;
    color: var(--color-base-content, #a6adbb);
    cursor: pointer;
    font-size: 0.7rem;
    font-family: 'Nunito', sans-serif;
    white-space: nowrap;
    transition: background 0.1s ease;
    line-height: 1;
  }

  .keybar-chip:hover {
    background: color-mix(in oklch, var(--color-base-content, #a6adbb) 10%, transparent);
  }

  .keybar-kbd {
    font-family: 'Fira Code', monospace;
    font-size: 0.6rem;
    padding: 0.15em 0.35em;
    border-radius: 0.2rem;
    background: color-mix(in oklch, var(--color-base-300, #374151) 60%, transparent);
    border: 1px solid color-mix(in oklch, var(--color-base-300, #374151) 40%, transparent);
    color: var(--color-base-content, #a6adbb);
    opacity: 0.7;
    line-height: 1.2;
  }

  .keybar-label {
    opacity: 0.7;
  }

  /* Mobile: hide kbd, make touch-friendly */
  @media (max-width: 639px) {
    .keybar {
      left: 0;
      right: 0;
      bottom: 0;
      border-radius: 0;
      justify-content: center;
      padding: 0.35rem 0.5rem;
      gap: 0.15rem;
    }

    .keybar-kbd {
      display: none;
    }

    .keybar-chip {
      min-height: 44px;
      min-width: 44px;
      justify-content: center;
      padding: 0 0.6rem;
      font-size: 0.75rem;
    }

    .keybar-label {
      opacity: 0.8;
    }
  }
</style>
