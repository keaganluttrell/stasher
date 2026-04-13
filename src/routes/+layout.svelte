<script>
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { browser } from '$app/environment';
  import { loadIndex } from '$lib/search.js';
  import { theme } from '$lib/theme.js';
  import { loadPreferences, savePreferences } from '$lib/preferences.js';
  import { pins, togglePin, isPinned } from '$lib/stores/pins.js';
  import { showToast } from '$lib/stores/toast.js';
  import CommandPalette from '$lib/components/CommandPalette.svelte';
  import HistoryPanel from '$lib/components/HistoryPanel.svelte';
  import PinnedPanel from '$lib/components/PinnedPanel.svelte';
  import Toast from '$lib/components/Toast.svelte';
  import KeyBar from '$lib/components/KeyBar.svelte';

  let commandPaletteOpen = false;
  let historyPanelOpen = false;
  let pinsPanelOpen = false;

  // Load preferences from localStorage
  function loadUserPreferences() {
    const prefs = loadPreferences();
    if (prefs.theme) {
      theme.set(prefs.theme);
    }
  }

  function handleOpenCommandPalette() {
    commandPaletteOpen = true;
  }

  onMount(async () => {
    loadUserPreferences();
    document.documentElement.dataset.theme = $theme;
    await loadIndex();
    window.addEventListener('stasher:open-command-palette', handleOpenCommandPalette);
  });

  onDestroy(() => {
    if (browser) {
      window.removeEventListener('stasher:open-command-palette', handleOpenCommandPalette);
    }
  });

  // Keep DOM in sync with theme + save prefs
  $: if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = $theme;
    savePreferences({ theme: $theme });
  }

  function handleKeydown(e) {
    const metaOrCtrl = e.metaKey || e.ctrlKey;
    const target = e.target;
    const inEditable = target?.closest?.('[contenteditable]') || target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA';

    // Block remaining custom shortcuts if inside editable element
    if (inEditable) return;

    // Cmd+K: toggle search
    if (metaOrCtrl && e.key === 'k') {
      e.preventDefault();
      commandPaletteOpen = !commandPaletteOpen;
      return;
    }

    // Cmd+B: toggle pin
    if (metaOrCtrl && e.key === 'b') {
      const isDocPage = $page.url.pathname.startsWith(base + '/doc/');
      if (isDocPage) {
        e.preventDefault();
        const slug = $page.url.pathname.replace(base + '/doc/', '');
        window.dispatchEvent(new CustomEvent('stasher:toggle-pin', { detail: { slug } }));
        return;
      }
    }

    // Cmd+U: history panel
    if (metaOrCtrl && e.key === 'u') {
      e.preventDefault();
      historyPanelOpen = !historyPanelOpen;
      pinsPanelOpen = false;
      return;
    }

    // Cmd+': pinned panel
    if (metaOrCtrl && e.key === "'") {
      e.preventDefault();
      pinsPanelOpen = !pinsPanelOpen;
      historyPanelOpen = false;
      return;
    }

    // Cmd+I: home
    if (metaOrCtrl && e.key === 'i') {
      e.preventDefault();
      goto(base + '/');
      return;
    }

    // Cmd+.: settings
    if (metaOrCtrl && e.key === '.') {
      e.preventDefault();
      goto(base + '/settings');
      return;
    }
  }

  function toggleSearch() {
    commandPaletteOpen = !commandPaletteOpen;
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<!-- Content: full width, centered -->
<main class="main-content">
  <div class="content-container">
    <slot />
  </div>
</main>

<!-- KeyBar: fixed top-left shortcuts with logo -->
<KeyBar onSearch={toggleSearch} onHistory={() => historyPanelOpen = !historyPanelOpen} onPins={() => pinsPanelOpen = !pinsPanelOpen} />

<!-- Command palette (Cmd+K) -->
<CommandPalette bind:open={commandPaletteOpen} />

<!-- History panel (Cmd+U) -->
<HistoryPanel bind:open={historyPanelOpen} />

<!-- Pinned panel (Cmd+') -->
<PinnedPanel bind:open={pinsPanelOpen} />

<!-- Toast notifications -->
<Toast />

<style>
  /* ── Main content ───────────────────────────────────────────────── */
  .main-content {
    min-height: 100vh;
    display: flex;
    justify-content: center;
  }

  .content-container {
    width: 100%;
    max-width: 48rem;
    padding: 2rem 1.5rem;
  }

  @media (max-width: 639px) {
    .main-content {
      padding-top: 12rem;
    }
    .content-container {
      padding: 1.25rem 1rem;
    }
  }
</style>
