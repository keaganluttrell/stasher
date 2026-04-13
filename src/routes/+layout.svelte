<script>
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { browser } from '$app/environment';
  import { loadIndex } from '$lib/search.js';
  import { theme } from '$lib/theme.js';
  import { config } from '$lib/config.js';
  import { user, authState, initAuth } from '$lib/auth.js';
  import { loadPreferences, savePreferences } from '$lib/preferences.js';
  import { editorState } from '$lib/stores/editor.js';
  import { pins, togglePin, isPinned } from '$lib/stores/pins.js';
  import { bin, toggleBin } from '$lib/stores/bin.js';
  import { showToast } from '$lib/stores/toast.js';
  import CommandPalette from '$lib/components/CommandPalette.svelte';
  import HistoryPanel from '$lib/components/HistoryPanel.svelte';
  import PinnedPanel from '$lib/components/PinnedPanel.svelte';
  import BinPanel from '$lib/components/BinPanel.svelte';
  import Toast from '$lib/components/Toast.svelte';
  import KeyBar from '$lib/components/KeyBar.svelte';
  import AuthGate from '$lib/components/AuthGate.svelte';

  let commandPaletteOpen = false;
  let historyPanelOpen = false;
  let pinsPanelOpen = false;
  let binPanelOpen = false;

  // Gate: show the app only when authenticated
  $: authenticated = $authState === 'authenticated';

  // Git-backed preferences
  let prefs = null;
  let prefsSaveTimer = null;

  // ── Git-backed preferences ─────────────────────────────────────────
  async function loadUserPreferences() {
    const username = $user?.login || $config.owner;
    if (!username || !$config.owner || !$config.repo) return;
    try {
      prefs = await loadPreferences(username, $config.owner, $config.repo, $config.branch);
      if (prefs.theme) {
        theme.set(prefs.theme);
      }
    } catch (e) {
      console.warn('Failed to load user preferences:', e.message);
    }
  }

  function schedulePrefsSave() {
    const username = $user?.login || $config.owner;
    if (!username || !$config.owner || !$config.repo || !$config.token) return;
    if (prefsSaveTimer) clearTimeout(prefsSaveTimer);
    prefsSaveTimer = setTimeout(async () => {
      if (!prefs) prefs = {};
      const updatedPrefs = {
        ...prefs,
        theme: $theme
      };
      const saveUsername = $user?.login || $config.owner;
      const newSha = await savePreferences(
        saveUsername, updatedPrefs, $config.owner, $config.repo, $config.branch
      );
      if (newSha) {
        prefs = { ...updatedPrefs, _sha: newSha };
      }
    }, 3000);
  }

  // Watch auth state
  $: if ($authState === 'authenticated' && $user && $config.owner && $config.repo) {
    loadUserPreferences();
  }

  function handleOpenCommandPalette() {
    commandPaletteOpen = true;
  }

  onMount(async () => {
    initAuth();
    document.documentElement.dataset.theme = $theme;
    await loadIndex();
    window.addEventListener('stasher:open-command-palette', handleOpenCommandPalette);
  });

  onDestroy(() => {
    if (prefsSaveTimer) clearTimeout(prefsSaveTimer);
    if (browser) {
      window.removeEventListener('stasher:open-command-palette', handleOpenCommandPalette);
    }
  });

  // Keep DOM in sync with theme + save prefs
  $: if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = $theme;
    schedulePrefsSave();
  }

  function handleKeydown(e) {
    const metaOrCtrl = e.metaKey || e.ctrlKey;
    const target = e.target;
    const inEditable = target?.closest?.('[contenteditable]') || target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA';

    // Escape: close command palette or cancel editing
    if (e.key === 'Escape') {
      if (commandPaletteOpen) {
        // CommandPalette handles its own Escape, but if it doesn't catch it:
        return;
      }
      if ($editorState.editing) {
        e.preventDefault();
        $editorState.cancelEdit();
        return;
      }
      return;
    }

    // Cmd+K: toggle search (always allowed)
    if (metaOrCtrl && e.key === 'k') {
      e.preventDefault();
      commandPaletteOpen = !commandPaletteOpen;
      return;
    }

    // Cmd+S: save (allowed in editable contexts when editing)
    if (metaOrCtrl && e.key === 's' && !e.shiftKey) {
      if ($editorState.editing) {
        e.preventDefault();
        $editorState.save();
        return;
      }
      // Prevent browser save even if not editing
      e.preventDefault();
      return;
    }

    // Cmd+B: toggle pin
    if (metaOrCtrl && e.key === 'b') {
      const isDocPage = $page.url.pathname.startsWith(base + '/doc/') && !$page.url.pathname.endsWith('/doc/new');
      if (isDocPage) {
        e.preventDefault();
        const slug = $page.url.pathname.replace(base + '/doc/', '');
        window.dispatchEvent(new CustomEvent('stasher:toggle-pin', { detail: { slug } }));
        return;
      }
    }

    // Cmd+D: mark for deletion (bin)
    if (metaOrCtrl && e.key === 'd') {
      const isDocPage = $page.url.pathname.startsWith(base + '/doc/') && !$page.url.pathname.endsWith('/doc/new');
      if (isDocPage) {
        e.preventDefault();
        const slug = $page.url.pathname.replace(base + '/doc/', '');
        window.dispatchEvent(new CustomEvent('stasher:toggle-bin', { detail: { slug } }));
        return;
      }
    }

    // Block remaining custom shortcuts if inside editable element
    if (inEditable) return;

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
      binPanelOpen = false;
      return;
    }

    // Cmd+;: bin panel
    if (metaOrCtrl && e.key === ';') {
      e.preventDefault();
      binPanelOpen = !binPanelOpen;
      historyPanelOpen = false;
      pinsPanelOpen = false;
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

    // Cmd+J: create new doc
    if (metaOrCtrl && e.key === 'j') {
      e.preventDefault();
      goto(base + '/doc/new');
      return;
    }

    // Cmd+/: edit doc
    if (metaOrCtrl && e.key === '/') {
      e.preventDefault();
      if ($editorState.canEdit && !$editorState.editing) {
        $editorState.startEdit();
      }
      return;
    }
  }

  function toggleSearch() {
    commandPaletteOpen = !commandPaletteOpen;
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if authenticated}
  <!-- Content: full width, centered -->
  <main class="main-content">
    <div class="content-container">
      <slot />
    </div>
  </main>

  <!-- KeyBar: fixed top-left shortcuts with logo -->
  <KeyBar onSearch={toggleSearch} onHistory={() => historyPanelOpen = !historyPanelOpen} onPins={() => pinsPanelOpen = !pinsPanelOpen} onBin={() => binPanelOpen = !binPanelOpen} />

  <!-- Command palette (Cmd+K) -->
  <CommandPalette bind:open={commandPaletteOpen} />

  <!-- History panel (Cmd+H) -->
  <HistoryPanel bind:open={historyPanelOpen} />

  <!-- Pinned panel (Cmd+') -->
  <PinnedPanel bind:open={pinsPanelOpen} />

  <!-- Bin panel (Cmd+;) -->
  <BinPanel bind:open={binPanelOpen} />

  <!-- Toast notifications -->
  <Toast />
{:else}
  <AuthGate />
{/if}

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
