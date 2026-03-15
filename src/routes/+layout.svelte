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

  let commandPaletteOpen = false;

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

  onMount(async () => {
    initAuth();
    document.documentElement.dataset.theme = $theme;
    await loadIndex();
  });

  onDestroy(() => {
    if (prefsSaveTimer) clearTimeout(prefsSaveTimer);
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
    if (metaOrCtrl && e.key === 's') {
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

    // Cmd+,: settings
    if (metaOrCtrl && e.key === ',') {
      e.preventDefault();
      goto(base + '/settings');
      return;
    }

    // Cmd+N: create new doc
    if (metaOrCtrl && e.key === 'n') {
      e.preventDefault();
      goto(base + '/doc/new');
      return;
    }

    // Cmd+E: edit doc
    if (metaOrCtrl && e.key === 'e') {
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

<!-- Top bar -->
<header class="topbar">
  <div class="topbar-inner">
    <!-- Left: logo -->
    <a href="{base}/" class="topbar-brand no-underline">stasher</a>

    <!-- Right: settings -->
    <div class="topbar-actions">
      <a href="{base}/settings" class="topbar-icon-btn" aria-label="Settings" title="Settings">
        {#if $authState === 'authenticated' && $user}
          <img src={$user.avatar_url} alt={$user.login} class="topbar-avatar" />
        {:else}
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        {/if}
      </a>
    </div>
  </div>
</header>

<!-- Content: full width, centered -->
<main class="main-content">
  <div class="content-container">
    <slot />
  </div>
</main>

<!-- KeyBar: fixed bottom-left shortcuts -->
<KeyBar onSearch={toggleSearch} />

<!-- Command palette (Cmd+K) -->
<CommandPalette bind:open={commandPaletteOpen} />

<style>
  /* ── Top bar ─────────────────────────────────────────────────────── */
  .topbar {
    position: sticky;
    top: 0;
    z-index: 100;
    background: color-mix(in oklch, var(--color-base-100, #1d232a) 85%, transparent);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-bottom: 1px solid color-mix(in oklch, var(--color-base-300, #374151) 30%, transparent);
  }

  .topbar-inner {
    max-width: 72rem;
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 1rem;
    gap: 0.75rem;
  }

  .topbar-brand {
    font-family: 'Unbounded', sans-serif;
    font-weight: 900;
    font-size: 1.15rem;
    letter-spacing: -0.02em;
    background: linear-gradient(to right, var(--color-primary), var(--color-accent));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    flex-shrink: 0;
    line-height: 1;
  }

  .topbar-actions {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  /* Icon button base */
  .topbar-icon-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border-radius: 0.375rem;
    border: none;
    background: transparent;
    color: var(--color-base-content, #a6adbb);
    opacity: 0.55;
    cursor: pointer;
    transition: all 0.15s ease;
    text-decoration: none;
    flex-shrink: 0;
  }

  .topbar-icon-btn:hover {
    opacity: 1;
    background: color-mix(in oklch, var(--color-base-content, #a6adbb) 8%, transparent);
  }

  /* User avatar in top bar */
  .topbar-avatar {
    width: 1.35rem;
    height: 1.35rem;
    border-radius: 50%;
    object-fit: cover;
  }

  /* ── Main content ───────────────────────────────────────────────── */
  .main-content {
    min-height: calc(100vh - 3rem);
    display: flex;
    justify-content: center;
    padding-bottom: 3.5rem;
  }

  .content-container {
    width: 100%;
    max-width: 48rem;
    padding: 2rem 1.5rem;
  }

  @media (max-width: 639px) {
    .content-container {
      padding: 1.25rem 1rem;
    }
    .topbar-inner {
      padding: 0.5rem 0.75rem;
    }
    .main-content {
      padding-bottom: 4rem;
    }
  }
</style>
