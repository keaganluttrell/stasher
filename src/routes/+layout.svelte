<script>
  import { onMount, tick, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { browser } from '$app/environment';
  import { loadIndex, search, getGroups } from '$lib/search.js';
  import { theme, THEMES } from '$lib/theme.js';
  import { config } from '$lib/config.js';
  import { user, authState, initAuth } from '$lib/auth.js';
  import { loadPreferences, savePreferences } from '$lib/preferences.js';
  import TreeNode from '$lib/components/TreeNode.svelte';
  import CommandPalette from '$lib/components/CommandPalette.svelte';


  let query = '';
  let groups = {};
  let results = [];
  let searching = false;
  let sidebarOpen = false;
  let searchInput;
  let docTreeEl;
  let canScrollMore = false;
  let commandPaletteOpen = false;

  // Collapsible groups state
  let openGroups = {};

  // Git-backed preferences
  let prefs = null;      // loaded preferences object (includes _sha)
  let prefsSaveTimer = null;

  // Deterministic color mapping (same hash as home page)
  const GROUP_COLORS = ['primary', 'secondary', 'accent', 'info', 'success', 'warning'];

  function getGroupColorName(groupName) {
    let hash = 0;
    for (let i = 0; i < groupName.length; i++) {
      hash = groupName.charCodeAt(i) + ((hash << 5) - hash);
    }
    return GROUP_COLORS[Math.abs(hash) % GROUP_COLORS.length];
  }

  // Load persisted open/closed state
  function loadOpenGroups() {
    if (!browser) return;
    try {
      const saved = localStorage.getItem('sidebar_groups');
      if (saved) {
        openGroups = JSON.parse(saved);
      }
    } catch {
      // ignore
    }
  }

  function saveOpenGroups() {
    if (!browser) return;
    try {
      localStorage.setItem('sidebar_groups', JSON.stringify(openGroups));
    } catch {
      // ignore
    }
    // Debounced save to git preferences
    schedulePrefsSave();
  }

  function toggleGroup(group) {
    openGroups[group] = !openGroups[group];
    openGroups = openGroups; // trigger reactivity
    saveOpenGroups();
  }

  // Build a nested tree from flat group paths like "projects/autoproxy"
  // Returns: [{ name, path, docs, children }]
  function buildTree(groups) {
    const root = [];
    for (const [groupPath, docs] of Object.entries(groups)) {
      const parts = groupPath.split('/');
      let level = root;
      let currentPath = '';
      for (let i = 0; i < parts.length; i++) {
        currentPath = currentPath ? currentPath + '/' + parts[i] : parts[i];
        let existing = level.find(n => n.name === parts[i]);
        if (!existing) {
          existing = { name: parts[i], path: currentPath, docs: [], children: [] };
          level.push(existing);
        }
        if (i === parts.length - 1) {
          existing.docs = docs;
        }
        level = existing.children;
      }
    }
    return root;
  }

  $: tree = buildTree(groups);

  // Default all groups to open when groups load
  function initOpenGroups(grps) {
    loadOpenGroups();
    for (const g of Object.keys(grps)) {
      if (!(g in openGroups)) {
        openGroups[g] = true;
      }
    }
    // Also open parent paths
    for (const g of Object.keys(grps)) {
      const parts = g.split('/');
      let path = '';
      for (const part of parts) {
        path = path ? path + '/' + part : part;
        if (!(path in openGroups)) {
          openGroups[path] = true;
        }
      }
    }
    openGroups = openGroups;
    saveOpenGroups();
  }

  // Auto-expand group containing current doc
  function expandGroupForSlug(slug) {
    if (!slug) return;
    for (const [group, docs] of Object.entries(groups)) {
      if (docs.some(d => d.slug === slug)) {
        if (!openGroups[group]) {
          openGroups[group] = true;
          openGroups = openGroups;
          saveOpenGroups();
        }
        break;
      }
    }
  }

  // Scroll overflow detection
  function checkScroll() {
    if (!docTreeEl) return;
    const { scrollTop, scrollHeight, clientHeight } = docTreeEl;
    canScrollMore = scrollHeight - scrollTop - clientHeight > 10;
  }

  // ── Git-backed preferences ─────────────────────────────────────────
  async function loadUserPreferences() {
    if (!$user || !$config.owner || !$config.repo) return;
    try {
      prefs = await loadPreferences($user.login, $config.owner, $config.repo, $config.branch);
      // Apply theme from git prefs (overrides localStorage)
      if (prefs.theme) {
        theme.set(prefs.theme);
      }
      // Apply sidebar groups from git prefs
      if (prefs.sidebarGroups && Object.keys(prefs.sidebarGroups).length > 0) {
        openGroups = { ...openGroups, ...prefs.sidebarGroups };
        openGroups = openGroups;
        localStorage.setItem('sidebar_groups', JSON.stringify(openGroups));
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
        theme: $theme,
        sidebarGroups: openGroups
      };
      const newSha = await savePreferences(
        $user.login, updatedPrefs, $config.owner, $config.repo, $config.branch
      );
      if (newSha) {
        prefs = { ...updatedPrefs, _sha: newSha };
      }
    }, 3000);
  }

  // Watch auth state — load prefs when user signs in
  $: if ($authState === 'authenticated' && $user && $config.owner && $config.repo) {
    loadUserPreferences();
  }

  onMount(async () => {
    // Initialise auth from localStorage
    initAuth();

    // Apply saved theme on mount
    document.documentElement.dataset.theme = $theme;

    await loadIndex();
    groups = getGroups();
    initOpenGroups(groups);

    // Auto-expand for current slug on load
    if ($page.params.slug) {
      expandGroupForSlug($page.params.slug);
    }

    await tick();
    checkScroll();
  });

  onDestroy(() => {
    if (prefsSaveTimer) clearTimeout(prefsSaveTimer);
  });

  // Keep the DOM in sync whenever the theme store changes
  $: if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = $theme;
  }

  $: {
    if (query.length > 1) {
      searching = true;
      results = search(query);
    } else {
      searching = false;
      results = [];
    }
  }

  // Auto-expand active group when slug changes
  $: if ($page.params.slug && Object.keys(groups).length > 0) {
    expandGroupForSlug($page.params.slug);
  }

  function handleResultClick(slug) {
    query = '';
    sidebarOpen = false;
    goto(`${base}/doc/${slug}`);
  }

  function closeSidebar() {
    sidebarOpen = false;
  }

  function selectTheme(t) {
    theme.set(t);
    document.activeElement?.blur();
    // Debounced save to git preferences
    schedulePrefsSave();
  }

  function handleKeydown(e) {
    // Cmd+K / Ctrl+K to open command palette
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      commandPaletteOpen = !commandPaletteOpen;
      return;
    }
    // "/" to focus sidebar search when no input is focused
    if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
      e.preventDefault();
      searchInput?.focus();
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<!-- Mobile hamburger button -->
<button
  class="fixed top-4 left-4 z-50 btn btn-ghost btn-sm lg:hidden bg-base-100/80 backdrop-blur-sm shadow-sm"
  aria-label="Toggle sidebar"
  on:click={() => (sidebarOpen = !sidebarOpen)}
>
  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
  </svg>
</button>

<!-- Mobile backdrop -->
{#if sidebarOpen}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div
    class="fixed inset-0 z-40 bg-black/50 lg:hidden"
    on:click={closeSidebar}
    role="presentation"
  ></div>
{/if}

<!-- Sidebar: fixed, transparent on desktop; overlay panel on mobile -->
<nav
  class="fixed left-0 top-0 h-screen w-72 z-50 flex flex-col p-4 gap-2 overflow-hidden
         transition-transform duration-200 ease-in-out
         lg:translate-x-0 bg-base-100
         {sidebarOpen ? 'translate-x-0' : '-translate-x-full'}"
>
  <!-- Brand header -->
  <div class="flex items-center justify-between mb-1">
    <a href="{base}/" class="no-underline">
      <span class="font-black text-3xl tracking-tight" style="font-family: 'Unbounded', sans-serif; background: linear-gradient(to right, var(--color-primary), var(--color-accent)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">stasher</span>
    </a>
    <!-- Close button on mobile -->
    <button
      class="btn btn-ghost btn-sm lg:hidden"
      aria-label="Close sidebar"
      on:click={closeSidebar}
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  </div>

  <!-- Search -->
  <div class="relative">
    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-40 pointer-events-none z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
    {#if !query}
      <div class="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none z-10 flex items-center gap-0.5">
        <kbd class="kbd kbd-xs opacity-50">⌘</kbd><kbd class="kbd kbd-xs opacity-50">K</kbd>
      </div>
    {/if}
    <input
      type="text"
      placeholder="Search"
      class="input input-sm input-bordered w-full pl-9 pr-14"
      bind:this={searchInput}
      bind:value={query}
      autocomplete="off"
    />
    {#if searching && results.length > 0}
      <ul class="menu menu-sm bg-base-100 rounded-box absolute top-full left-0 right-0 z-50 shadow-lg mt-1 max-h-64 overflow-y-auto border border-base-300/50">
        {#each results.slice(0, 8) as doc}
          <li>
            <button on:click={() => handleResultClick(doc.slug)} class="flex flex-col items-start gap-0">
              <span class="text-sm">{doc.title}</span>
              {#if doc.group}
                <span class="text-xs opacity-50">{doc.group}</span>
              {/if}
            </button>
          </li>
        {/each}
      </ul>
    {:else if searching && results.length === 0}
      <div class="text-xs opacity-50 px-3 py-2">No results</div>
    {/if}
  </div>

  <!-- New Document button -->
  <a href="{base}/doc/new" class="btn btn-outline btn-primary btn-sm w-full gap-2" title="New document">
    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
    </svg>
    New Document
  </a>

  <!-- Directory tree by group (scrollable area) -->
  <div
    class="flex-1 overflow-y-auto overflow-x-hidden min-h-0 min-w-0 relative"
    bind:this={docTreeEl}
    on:scroll={checkScroll}
    style={canScrollMore ? '-webkit-mask-image: linear-gradient(to bottom, black calc(100% - 2rem), transparent); mask-image: linear-gradient(to bottom, black calc(100% - 2rem), transparent);' : ''}
  >
    {#each tree as node}
      <div class="mt-2">
        <TreeNode
          {node}
          {openGroups}
          onToggle={toggleGroup}
          onNavigate={closeSidebar}
        />
      </div>
    {/each}

  </div>

  <!-- Footer -->
  <div class="mt-auto pt-4 border-t border-base-300/30 flex flex-col gap-3">
    <!-- Theme picker -->
    <div class="dropdown dropdown-top">
      <div tabindex="0" role="button" class="btn btn-sm btn-ghost gap-2 w-full justify-start">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
        </svg>
        <span class="text-xs font-medium flex-1 text-left">{$theme}</span>
        <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
        </svg>
      </div>
      <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
      <ul tabindex="0" class="dropdown-content menu bg-base-200 rounded-box z-[100] w-full p-2 shadow-lg max-h-64 overflow-y-auto flex-nowrap">
        {#each THEMES as t}
          <li>
            <button class:active={$theme === t} on:click={() => selectTheme(t)}>
              <div class="flex gap-0.5">
                <span class="w-3 h-4 rounded-l-sm" data-theme={t} style="background: var(--color-primary)"></span>
                <span class="w-3 h-4" data-theme={t} style="background: var(--color-secondary)"></span>
                <span class="w-3 h-4" data-theme={t} style="background: var(--color-accent)"></span>
                <span class="w-3 h-4" data-theme={t} style="background: var(--color-neutral)"></span>
                <span class="w-3 h-4 rounded-r-sm" data-theme={t} style="background: var(--color-base-100)"></span>
              </div>
              <span class="flex-1">{t}</span>
              {#if $theme === t}
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-success shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              {/if}
            </button>
          </li>
        {/each}
      </ul>
    </div>
    <div class="divider my-0 h-px opacity-30"></div>
    <!-- User avatar or Settings link -->
    <div class="flex items-center gap-2">
      {#if $authState === 'authenticated' && $user}
        <a
          href="{base}/settings"
          class="flex items-center gap-2 flex-1 py-1.5 px-2 rounded-lg hover:bg-base-content/5 transition-all duration-200"
          on:click={closeSidebar}
        >
          <div class="avatar">
            <div class="w-6 rounded-full">
              <img src={$user.avatar_url} alt="{$user.login}" />
            </div>
          </div>
          <span class="text-sm opacity-70 hover:opacity-100 truncate flex-1">{$user.login}</span>
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </a>
      {:else}
        <a
          href="{base}/settings"
          class="text-sm opacity-70 hover:opacity-100 hover:text-primary transition-all duration-200 flex items-center gap-1.5 py-1.5 px-2 rounded-lg hover:bg-base-content/5 flex-1"
          on:click={closeSidebar}
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Settings
        </a>
      {/if}
    </div>
  </div>
</nav>

<!-- Content: centered in the full viewport, ignoring sidebar -->
<main class="min-h-screen flex justify-center">
  <div class="w-full max-w-3xl px-6 py-8 pt-16 lg:pt-8">
    <slot />
  </div>
</main>

<!-- Command palette (Cmd+K) -->
<CommandPalette bind:open={commandPaletteOpen} />
