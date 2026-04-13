<script>
  import { theme, THEMES } from '$lib/theme.js';

  function selectTheme(t) {
    theme.set(t);
  }
</script>

<svelte:head>
  <title>Settings — stasher</title>
</svelte:head>

<div class="settings-page">
  <h1 class="settings-title">Settings</h1>

  <!-- Theme -->
  <section class="settings-section">
    <h2 class="settings-heading">Theme</h2>
    <div class="theme-grid">
      {#each THEMES as t}
        <button
          class="theme-card"
          class:active={$theme === t}
          on:click={() => selectTheme(t)}
        >
          <div class="theme-swatches">
            <span data-theme={t} style="background: var(--color-primary)"></span>
            <span data-theme={t} style="background: var(--color-secondary)"></span>
            <span data-theme={t} style="background: var(--color-accent)"></span>
            <span data-theme={t} style="background: var(--color-neutral)"></span>
            <span data-theme={t} style="background: var(--color-base-100)"></span>
          </div>
          <span class="theme-card-name">{t}</span>
          {#if $theme === t}
            <svg xmlns="http://www.w3.org/2000/svg" class="check-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          {/if}
        </button>
      {/each}
    </div>
  </section>
</div>

<style>
  .settings-page {
    max-width: 36rem;
    margin: 0 auto;
  }

  .settings-title {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 1.75rem;
    font-weight: 800;
    margin-bottom: 2rem;
  }

  .settings-section {
    margin-bottom: 2.5rem;
  }

  .settings-heading {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    opacity: 0.45;
    margin-bottom: 0.75rem;
  }

  /* Theme */
  .theme-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr));
    gap: 0.35rem;
  }

  .theme-card {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.45rem 0.6rem;
    border-radius: 0.35rem;
    border: 1px solid transparent;
    background: transparent;
    color: var(--color-base-content, #a6adbb);
    cursor: pointer;
    font-family: 'Nunito', sans-serif;
    font-size: 0.8rem;
    transition: background 0.1s ease;
  }

  .theme-card:hover {
    background: color-mix(in oklch, var(--color-base-content, #a6adbb) 6%, transparent);
  }

  .theme-card.active {
    background: color-mix(in oklch, var(--color-base-content, #a6adbb) 8%, transparent);
    border-color: color-mix(in oklch, var(--color-primary, #546e7a) 40%, transparent);
  }

  .theme-swatches {
    display: flex;
    gap: 1px;
    flex-shrink: 0;
  }

  .theme-swatches span {
    width: 0.7rem;
    height: 0.9rem;
    display: block;
  }

  .theme-swatches span:first-child { border-radius: 2px 0 0 2px; }
  .theme-swatches span:last-child  { border-radius: 0 2px 2px 0; }

  .theme-card-name {
    flex: 1;
    text-align: left;
  }

  .check-icon {
    width: 0.875rem;
    height: 0.875rem;
    color: var(--color-success, #22c55e);
    flex-shrink: 0;
  }
</style>
