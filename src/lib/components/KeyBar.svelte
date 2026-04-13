<script>
  import { page } from '$app/stores';
  import { base } from '$app/paths';
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';

  import { pins } from '$lib/stores/pins.js';

  export let onSearch = () => {};
  export let onHistory = () => {};
  export let onPins = () => {};

  // Platform detection
  $: isMac = browser && /Mac|iPhone|iPad|iPod/.test(navigator.platform);
  $: mod = isMac ? '\u2318' : 'Ctrl+';

  // Route detection
  $: isDocPage = $page.url.pathname.startsWith(base + '/doc/');

  // Current pathname for active state detection
  $: pathname = $page.url.pathname;

  // Build visible shortcuts
  $: shortcuts = buildShortcuts(isDocPage, pathname, $pins);

  function buildShortcuts(isDoc, _pathname, _pins) {
    const items = [
      { key: 'K', mod: true, label: 'Search', action: () => onSearch(), icon: 'search', active: false },
      { key: 'I', mod: true, label: 'Home', action: () => goto(base + '/'), icon: 'home', active: pathname === base + '/' || pathname === base },
      { key: '.', mod: true, label: 'Settings', action: () => goto(base + '/settings'), icon: 'settings', active: pathname.startsWith(base + '/settings') },
    ];

    if (isDoc) {
      const slug = _pathname.replace(base + '/doc/', '');
      const pinned = $pins.some((p) => p.slug === slug);
      items.push({ key: 'B', mod: true, label: pinned ? 'Unpin' : 'Pin', action: () => window.dispatchEvent(new CustomEvent('stasher:toggle-pin', { detail: { slug } })), icon: 'pin', active: pinned });
    }

    items.push({ key: "'", mod: true, label: 'Pins', action: () => onPins(), icon: 'pins', active: false });
    items.push({ key: 'U', mod: true, label: 'History', action: () => onHistory(), icon: 'history', active: false });

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

  <!-- Shortcut rows -->
  <div class="keybar-shortcuts">
    {#each shortcuts as s}
      <button class="keybar-row" class:active={s.active} on:click={s.action} title="{formatKey(s)} {s.label}">
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

  .keybar-row.active {
    background: color-mix(in oklch, var(--color-primary) 12%, transparent);
  }
  .keybar-row.active .keybar-label {
    opacity: 1;
    color: var(--color-primary);
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

  /* Mobile: full-width top bar, horizontal layout */
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
