<script>
  import { user, authState, logout } from '$lib/auth.js';
  import { theme, THEMES } from '$lib/theme.js';
  import { config } from '$lib/config.js';
  import { loadPreferences, savePreferences } from '$lib/preferences.js';

  let newToken = '';
  let showChangeToken = false;
  let tokenSaving = false;
  let tokenError = '';

  // Theme selection
  let prefsSaveTimer = null;

  function selectTheme(t) {
    theme.set(t);
    schedulePrefsSave();
  }

  function schedulePrefsSave() {
    if (!$user || !$config.owner || !$config.repo) return;
    if (prefsSaveTimer) clearTimeout(prefsSaveTimer);
    prefsSaveTimer = setTimeout(async () => {
      const updatedPrefs = { theme: $theme };
      await savePreferences($user.login, updatedPrefs, $config.owner, $config.repo, $config.branch);
    }, 3000);
  }

  async function handleUpdateToken() {
    const trimmed = newToken.trim();
    if (!trimmed) return;
    tokenError = '';
    tokenSaving = true;

    try {
      const res = await fetch('https://api.github.com/user', {
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${trimmed}`
        }
      });

      if (!res.ok) {
        tokenError = res.status === 401 ? 'Invalid token.' : `GitHub returned ${res.status}.`;
        tokenSaving = false;
        return;
      }

      localStorage.setItem('gh_token', trimmed);
      await import('$lib/auth.js').then(m => m.validateToken());
      showChangeToken = false;
      newToken = '';
    } catch {
      tokenError = 'Network error.';
    }
    tokenSaving = false;
  }

  function handleSignOut() {
    logout();
  }
</script>

<svelte:head>
  <title>Settings — stasher</title>
</svelte:head>

<div class="settings-page">
  <h1 class="settings-title">Settings</h1>

  <!-- Account -->
  <section class="settings-section">
    <h2 class="settings-heading">Account</h2>
    {#if $authState === 'authenticated' && $user}
      <div class="account-card">
        <img src={$user.avatar_url} alt={$user.login} class="account-avatar" />
        <div class="account-info">
          <p class="account-name">{$user.name}</p>
          <p class="account-login">@{$user.login}</p>
        </div>
      </div>

      {#if showChangeToken}
        <div class="token-change">
          {#if tokenError}
            <p class="token-error">{tokenError}</p>
          {/if}
          <input
            type="password"
            class="input input-bordered input-sm w-full"
            bind:value={newToken}
            placeholder="github_pat_..."
            disabled={tokenSaving}
          />
          <div class="token-actions">
            <button class="btn btn-primary btn-sm flex-1" on:click={handleUpdateToken} disabled={tokenSaving || !newToken.trim()}>
              {tokenSaving ? 'Verifying...' : 'Update'}
            </button>
            <button class="btn btn-ghost btn-sm" on:click={() => { showChangeToken = false; newToken = ''; tokenError = ''; }}>
              Cancel
            </button>
          </div>
        </div>
      {:else}
        <div class="account-actions">
          <button class="btn btn-ghost btn-sm" on:click={() => (showChangeToken = true)}>Change token</button>
          <button class="btn btn-ghost btn-sm text-error" on:click={handleSignOut}>Sign out</button>
        </div>
      {/if}
    {:else}
      <p class="text-sm opacity-60">Not authenticated.</p>
    {/if}
  </section>

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

  /* Account */
  .account-card {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
  }

  .account-avatar {
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 50%;
    object-fit: cover;
  }

  .account-info {
    min-width: 0;
  }

  .account-name {
    font-weight: 600;
    font-size: 0.95rem;
    margin: 0;
    line-height: 1.3;
  }

  .account-login {
    font-size: 0.8rem;
    opacity: 0.5;
    margin: 0;
  }

  .account-actions {
    display: flex;
    gap: 0.5rem;
  }

  .token-change {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .token-actions {
    display: flex;
    gap: 0.35rem;
  }

  .token-error {
    font-size: 0.75rem;
    color: var(--color-error, #e53e3e);
    margin: 0;
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
