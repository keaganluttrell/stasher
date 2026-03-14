<script>
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { loadIndex, search, getGroups } from '$lib/search.js';
  import '@picocss/pico/css/pico.min.css';

  let query = '';
  let groups = {};
  let results = [];
  let searching = false;
  let sidebarOpen = false;

  onMount(async () => {
    await loadIndex();
    groups = getGroups();
  });

  $: {
    if (query.length > 1) {
      searching = true;
      results = search(query);
    } else {
      searching = false;
      results = [];
    }
  }

  function handleResultClick(slug) {
    query = '';
    goto(`/doc/${slug}`);
  }
</script>

<div class="layout">
  <!-- Sidebar -->
  <nav class="sidebar" class:open={sidebarOpen}>
    <div class="sidebar-header">
      <a href="/" class="brand">braindump</a>
      <a href="/doc/new" class="new-btn" title="New document">+</a>
    </div>

    <!-- Search -->
    <div class="search-wrap">
      <input
        type="search"
        placeholder="Search..."
        bind:value={query}
        autocomplete="off"
      />
      {#if searching && results.length > 0}
        <ul class="search-results">
          {#each results.slice(0, 8) as doc}
            <li>
              <button on:click={() => handleResultClick(doc.slug)}>
                <span class="result-title">{doc.title}</span>
                {#if doc.group}
                  <small>{doc.group}</small>
                {/if}
              </button>
            </li>
          {/each}
        </ul>
      {:else if searching && results.length === 0}
        <div class="search-empty">No results</div>
      {/if}
    </div>

    <!-- Directory tree by group -->
    {#each Object.entries(groups) as [group, docs]}
      <details open>
        <summary>{group}</summary>
        <ul>
          {#each docs as doc}
            <li class:active={$page.params.slug === doc.slug}>
              <a href="/doc/{doc.slug}">{doc.title}</a>
            </li>
          {/each}
        </ul>
      </details>
    {/each}

    <div class="sidebar-footer">
      <a href="/settings">Settings</a>
    </div>
  </nav>

  <!-- Main -->
  <main class="content">
    <button
      class="menu-toggle"
      on:click={() => (sidebarOpen = !sidebarOpen)}
      aria-label="Toggle sidebar"
    >☰</button>
    <slot />
  </main>
</div>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
  }

  .layout {
    display: grid;
    grid-template-columns: 260px 1fr;
    min-height: 100vh;
  }

  .sidebar {
    background: var(--pico-card-background-color);
    border-right: 1px solid var(--pico-muted-border-color);
    display: flex;
    flex-direction: column;
    padding: 1rem;
    gap: 0.5rem;
    overflow-y: auto;
    position: sticky;
    top: 0;
    height: 100vh;
  }

  .sidebar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.5rem;
  }

  .brand {
    font-weight: 700;
    font-size: 1.1rem;
    text-decoration: none;
    letter-spacing: -0.03em;
  }

  .new-btn {
    font-size: 1.4rem;
    line-height: 1;
    text-decoration: none;
    padding: 0 0.4rem;
    border-radius: 4px;
    color: var(--pico-primary);
  }

  .search-wrap {
    position: relative;
  }

  .search-wrap input {
    margin-bottom: 0;
  }

  .search-results {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: var(--pico-card-background-color);
    border: 1px solid var(--pico-muted-border-color);
    border-radius: var(--pico-border-radius);
    list-style: none;
    padding: 0.25rem 0;
    margin: 0;
    z-index: 100;
    box-shadow: 0 4px 16px rgba(0,0,0,0.12);
  }

  .search-results li button {
    width: 100%;
    text-align: left;
    background: none;
    border: none;
    padding: 0.5rem 0.75rem;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
  }

  .search-results li button:hover {
    background: var(--pico-primary-background);
  }

  .result-title {
    font-size: 0.9rem;
  }

  .search-results small {
    opacity: 0.5;
    font-size: 0.75rem;
  }

  .search-empty {
    padding: 0.5rem 0.75rem;
    font-size: 0.85rem;
    opacity: 0.5;
  }

  details summary {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-weight: 600;
    opacity: 0.5;
    cursor: pointer;
    padding: 0.25rem 0;
    margin-top: 0.5rem;
  }

  details ul {
    list-style: none;
    padding: 0;
    margin: 0.25rem 0 0 0;
  }

  details ul li a {
    display: block;
    padding: 0.3rem 0.5rem;
    font-size: 0.875rem;
    text-decoration: none;
    border-radius: 4px;
    color: var(--pico-color);
  }

  details ul li a:hover,
  details ul li.active a {
    background: var(--pico-primary-background);
    color: var(--pico-primary);
  }

  .sidebar-footer {
    margin-top: auto;
    padding-top: 1rem;
    border-top: 1px solid var(--pico-muted-border-color);
    font-size: 0.85rem;
  }

  .content {
    padding: 2rem;
    max-width: 800px;
  }

  .menu-toggle {
    display: none;
    background: none;
    border: none;
    font-size: 1.25rem;
    cursor: pointer;
    padding: 0;
    margin-bottom: 1rem;
  }

  @media (max-width: 768px) {
    .layout {
      grid-template-columns: 1fr;
    }

    .sidebar {
      position: fixed;
      left: -280px;
      top: 0;
      width: 260px;
      z-index: 200;
      transition: left 0.2s ease;
      height: 100vh;
    }

    .sidebar.open {
      left: 0;
    }

    .menu-toggle {
      display: block;
    }
  }
</style>
