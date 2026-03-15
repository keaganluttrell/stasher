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
  import CommandPalette from '$lib/components/CommandPalette.svelte';
  import KeyBar from '$lib/components/KeyBar.svelte';
  import AuthGate from '$lib/components/AuthGate.svelte';

  let commandPaletteOpen = false;

  // Gate: show the app only when authenticated
  $: authenticated = $authState === 'authenticated';

  // Git-backed preferences
  let prefs = null;
  let prefsSaveTimer = null;

  // ── Git-backed preferences ─────────────────────────────────────────
  async function loadUserPreferences() {
    if (!$user || !$config.owner || !$config.repo) return;
    try {
      prefs = await loadPreferences($user.login, $config.owner, $config.repo, $config.branch);
      if (prefs.theme) {
        theme.set(prefs.theme);
      }
    } catch (e) {
      console.warn('Failed to load user preferences:', e.message);
    }
  }

  function schedulePrefsSave() {
    if (!$user || !$config.owner || !$config.repo) return;
    if (prefsSaveTimer) clearTimeout(prefsSaveTimer);
    prefsSaveTimer = setTimeout(async () => {
      if (!prefs) prefs = {};
      const updatedPrefs = {
        ...prefs,
        theme: $theme
      };
      const newSha = await savePreferences(
        $user.login, updatedPrefs, $config.owner, $config.repo, $config.branch
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

  // Keep DOM in sync with theme
  $: if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = $theme;
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

    // Block remaining custom shortcuts if inside editable element
    if (inEditable) return;

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
  <KeyBar onSearch={toggleSearch} />

  <!-- Command palette (Cmd+K) -->
  <CommandPalette bind:open={commandPaletteOpen} />
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
