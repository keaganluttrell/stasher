<script>
  import { page } from '$app/stores';
  import { base } from '$app/paths';
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';
  import { editorState } from '$lib/stores/editor.js';
  import { config } from '$lib/config.js';
  import { user, authState } from '$lib/auth.js';

  export let onSearch = () => {};

  // Platform detection
  $: isMac = browser && /Mac|iPhone|iPad|iPod/.test(navigator.platform);
  $: mod = isMac ? '\u2318' : 'Ctrl+';

  // Route detection
  $: isDocPage = $page.url.pathname.startsWith(base + '/doc/');

  // Editor state
  $: editing = $editorState.editing;
  $: canEdit = $editorState.canEdit;

  // Build visible shortcuts
  $: shortcuts = buildShortcuts(isDocPage, editing, canEdit);

  function buildShortcuts(isDoc, ed, can) {
    const items = [
      { key: 'K', mod: true, label: 'Search', action: () => onSearch(), icon: 'search' },
      { key: 'I', mod: true, label: 'Home', action: () => goto(base + '/'), icon: 'home' },
      { key: 'J', mod: true, label: 'Create', action: () => goto(base + '/doc/new'), icon: 'create' },
    ];

    if (isDoc && !ed && can) {
      items.push({ key: 'E', mod: true, shift: true, label: 'Edit', action: () => $editorState.startEdit(), icon: 'edit' });
    }

    if (isDoc && ed) {
      items.push({ key: 'S', mod: true, label: 'Save', action: () => $editorState.save(), icon: 'save' });
      items.push({ key: 'Esc', label: 'Cancel', action: () => $editorState.cancelEdit(), icon: 'cancel', noMod: true });
    }

    // Settings always last
    items.push({ key: '.', mod: true, label: 'Settings', action: () => goto(base + '/settings'), icon: 'settings' });

    return items;
  }

  function formatKey(s) {
    if (s.noMod) return s.key;
    let display = mod;
    if (s.shift) display += isMac ? '\u21E7' : 'Shift+';
    return display + s.key;
  }
</script>

<nav class="keybar" aria-label="Keyboard shortcuts and navigation">
  <!-- Logo -->
  <a href="{base}/" class="keybar-logo no-underline" aria-label="stasher home">
    <span class="keybar-logo-text">stasher</span>
  </a>

  <!-- User -->
  {#if $authState === 'authenticated' && $user}
    <div class="keybar-user">
      <img src={$user.avatar_url} alt={$user.login} class="keybar-avatar" />
      <span class="keybar-username">{$user.name?.split(' ')[0] || $user.login}</span>
    </div>
  {/if}

  <!-- Shortcut rows -->
  <div class="keybar-shortcuts">
    {#each shortcuts as s}
      <button class="keybar-row" on:click={s.action} title="{formatKey(s)} {s.label}">
        <span class="keybar-label">{s.label}</span>
        <kbd class="keybar-kbd">{formatKey(s)}</kbd>
      </button>
    {/each}
  </div>
</nav>

<style>
  .keybar {
    position: fixed;
    top: 1rem;
    left: 1rem;
    z-index: 90;
    display: flex;
    flex-direction: column;
    gap: 0;
    min-width: 11rem;
    border-radius: 0.65rem;
    background: color-mix(in oklch, var(--color-base-200, #2a303c) 80%, transparent);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    border: 1px solid color-mix(in oklch, var(--color-base-300, #374151) 30%, transparent);
    overflow: hidden;
  }

  /* Logo row */
  .keybar-logo {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.65rem 0.85rem;
    text-decoration: none;
    transition: background 0.12s ease;
    cursor: pointer;
  }

  .keybar-logo:hover {
    background: color-mix(in oklch, var(--color-base-content, #a6adbb) 6%, transparent);
  }

  .keybar-logo-text {
    font-family: 'Unbounded', sans-serif;
    font-weight: 900;
    font-size: 1.75rem;
    letter-spacing: -0.02em;
    background: linear-gradient(to right, var(--color-primary), var(--color-accent));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    line-height: 1;
  }

  /* User row */
  .keybar-user {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.4rem 0.85rem 0.5rem;
    border-bottom: 1px solid color-mix(in oklch, var(--color-base-300, #374151) 25%, transparent);
  }

  .keybar-avatar {
    width: 2.25rem;
    height: 2.25rem;
    border-radius: 50%;
    object-fit: cover;
    flex-shrink: 0;
    border: 2px solid var(--color-accent, #f59e0b);
  }

  .keybar-username {
    font-family: 'Nunito', sans-serif;
    font-size: 1.05rem;
    font-weight: 600;
    opacity: 0.7;
  }

  /* Shortcut rows */
  .keybar-shortcuts {
    display: flex;
    flex-direction: column;
    padding: 0.15rem 0.35rem;
    gap: 0.1rem;
  }

  .keybar-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.3rem 0.65rem;
    border-radius: 0.35rem;
    border: none;
    background: transparent;
    color: var(--color-base-content, #a6adbb);
    cursor: pointer;
    font-size: 0.95rem;
    font-family: 'Nunito', sans-serif;
    white-space: nowrap;
    transition: background 0.1s ease;
    line-height: 1;
    width: 100%;
    text-align: left;
  }

  .keybar-row:hover {
    background: color-mix(in oklch, var(--color-base-content, #a6adbb) 10%, transparent);
  }

  .keybar-label {
    opacity: 0.75;
    font-weight: 500;
  }

  .keybar-kbd {
    font-family: 'Fira Code', monospace;
    font-size: 0.75rem;
    padding: 0.25em 0.5em;
    border-radius: 0.25rem;
    background: color-mix(in oklch, var(--color-base-300, #374151) 60%, transparent);
    border: 1px solid color-mix(in oklch, var(--color-base-300, #374151) 40%, transparent);
    color: var(--color-base-content, #a6adbb);
    opacity: 0.6;
    line-height: 1.2;
  }

  /* Mobile: full-width bottom bar, horizontal layout */
  @media (max-width: 639px) {
    .keybar {
      top: 0;
      left: 0;
      right: 0;
      border-radius: 0;
      min-width: unset;
      flex-direction: column;
      opacity: 1;
    }

    .keybar-logo {
      padding: 0.5rem 0.85rem;
    }

    .keybar-logo-text {
      font-size: 1.25rem;
    }

    .keybar-shortcuts {
      display: flex;
      flex-direction: row;
      flex-wrap: wrap;
      padding: 0.35rem 0.5rem;
      gap: 0.15rem;
    }

    .keybar-row {
      flex: 0 0 auto;
      min-height: 44px;
      min-width: 44px;
      justify-content: center;
      padding: 0 0.65rem;
      font-size: 0.8rem;
    }

    .keybar-kbd {
      display: none;
    }

    .keybar-label {
      opacity: 0.85;
    }
  }
</style>
