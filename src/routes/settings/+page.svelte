<script>
  import { config } from '$lib/config.js';
  import { user, authState, authError, deviceFlowData, startDeviceFlow, cancelDeviceFlow, logout, getToken } from '$lib/auth.js';
  import { theme, THEMES } from '$lib/theme.js';
  import { loadPreferences, savePreferences } from '$lib/preferences.js';

  let owner = $config.owner;
  let repo = $config.repo;
  let branch = $config.branch;
  let token = $config.token;
  let clientId = $config.clientId;
  let saved = false;
  let codeCopied = false;

  // Advanced: OAuth Device Flow section
  let showDeviceFlow = false;
  let newToken = '';
  let showChangeToken = false;
  let tokenSaving = false;
  let tokenError = '';

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

      // Valid token — store it
      token = trimmed;
      config.set({ owner, repo, branch, token: trimmed, clientId });
      localStorage.setItem('gh_token', trimmed);
      await import('$lib/auth.js').then(m => m.validateToken());
      showChangeToken = false;
      newToken = '';
    } catch {
      tokenError = 'Network error.';
    }
    tokenSaving = false;
  }

  function save() {
    config.set({ owner, repo, branch, token, clientId });
    saved = true;
    setTimeout(() => (saved = false), 2000);
  }

  function handleSignIn() {
    // Save client ID first
    config.set({ owner, repo, branch, token, clientId });
    startDeviceFlow(clientId);
  }

  function handleSignOut() {
    logout();
    token = '';
    config.set({ owner, repo, branch, token: '', clientId });
  }

  function copyCode() {
    if ($deviceFlowData?.user_code) {
      navigator.clipboard.writeText($deviceFlowData.user_code);
      codeCopied = true;
      setTimeout(() => (codeCopied = false), 2000);
    }
  }

  // Sync token from auth store into local state when auth completes
  $: if ($user?.token && $authState === 'authenticated') {
    token = $user.token;
  }

  // Theme selection
  let prefsSaveTimer = null;

  function selectTheme(t) {
    theme.set(t);
    schedulePrefsSave();
  }

  function schedulePrefsSave() {
    if (!$user || !owner || !repo) return;
    if (prefsSaveTimer) clearTimeout(prefsSaveTimer);
    prefsSaveTimer = setTimeout(async () => {
      const updatedPrefs = { theme: $theme };
      await savePreferences($user.login, updatedPrefs, owner, repo, branch);
    }, 3000);
  }
</script>

<svelte:head>
  <title>Settings — stasher</title>
</svelte:head>

<h1 class="text-3xl font-bold mb-6">Settings</h1>

<div class="alert alert-info mb-6">
  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
  <span>Manage your authentication, theme, and repository settings here. To edit docs, your token needs <code class="text-xs">contents: write</code> permission.</span>
</div>

<div class="flex flex-col gap-6 max-w-md">

  <!-- Authentication section -->
  <div class="card bg-base-200/50 border border-base-300/40">
    <div class="card-body gap-5">
      <h2 class="text-sm font-semibold uppercase tracking-wider opacity-60 mb-1 flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        Authentication
      </h2>

      {#if $authState === 'authenticated' && $user}
        <!-- Signed in: PAT status -->
        <div class="flex items-center gap-4">
          <div class="avatar">
            <div class="w-12 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
              <img src={$user.avatar_url} alt="{$user.login}'s avatar" />
            </div>
          </div>
          <div class="flex-1 min-w-0">
            <p class="font-bold text-base truncate">{$user.name}</p>
            <p class="text-sm opacity-60 truncate">@{$user.login}</p>
          </div>
        </div>

        <!-- Change token -->
        <button
          class="btn btn-ghost btn-sm w-full"
          on:click={() => (showChangeToken = !showChangeToken)}
        >
          {showChangeToken ? 'Cancel' : 'Change token'}
        </button>

        {#if showChangeToken}
          <div class="flex flex-col gap-2">
            {#if tokenError}
              <p class="text-xs text-error">{tokenError}</p>
            {/if}
            <input
              type="password"
              class="input input-bordered input-sm"
              bind:value={newToken}
              placeholder="github_pat_..."
              disabled={tokenSaving}
            />
            <button
              class="btn btn-primary btn-sm"
              on:click={handleUpdateToken}
              disabled={tokenSaving || !newToken.trim()}
            >
              {tokenSaving ? 'Verifying...' : 'Update token'}
            </button>
          </div>
        {/if}

        <button class="btn btn-outline btn-error btn-sm w-full" on:click={handleSignOut}>
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign Out
        </button>

      {:else}
        <!-- Not authenticated — shouldn't normally reach here due to AuthGate, but just in case -->
        <p class="text-sm opacity-60">You are not signed in. Return to the home page to authenticate.</p>
      {/if}

      <!-- Advanced: OAuth Device Flow (collapsed) -->
      <div class="collapse collapse-arrow bg-base-300/30 rounded-lg mt-2">
        <input type="checkbox" bind:checked={showDeviceFlow} />
        <div class="collapse-title text-sm font-medium opacity-70">
          Advanced: OAuth Device Flow
        </div>
        <div class="collapse-content">
          {#if $authState === 'polling' && $deviceFlowData}
            <div class="flex flex-col items-center gap-4 py-2">
              <p class="text-sm text-center opacity-80">Enter this code at GitHub:</p>
              <div class="flex items-center gap-2">
                <code class="text-3xl font-mono font-bold tracking-widest px-4 py-2 bg-base-300 rounded-lg select-all">
                  {$deviceFlowData.user_code}
                </code>
                <button class="btn btn-ghost btn-sm" on:click={copyCode} title="Copy code">
                  {#if codeCopied}
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                  {:else}
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  {/if}
                </button>
              </div>
              <a
                href={$deviceFlowData.verification_uri}
                target="_blank"
                rel="noopener noreferrer"
                class="btn btn-primary btn-sm gap-2"
              >
                Open github.com/login/device
              </a>
              <div class="flex items-center gap-2 text-sm opacity-60">
                <span class="loading loading-spinner loading-xs"></span>
                Waiting for authorization...
              </div>
              <button class="btn btn-ghost btn-xs" on:click={cancelDeviceFlow}>Cancel</button>
            </div>
          {:else if $authState === 'pending'}
            <div class="flex items-center justify-center gap-2 py-4">
              <span class="loading loading-spinner loading-sm"></span>
              <span class="text-sm opacity-60">Starting device flow...</span>
            </div>
          {:else}
            {#if $authError}
              <div class="alert alert-error text-sm mb-3">
                <span>{$authError}</span>
              </div>
            {/if}
            <div class="form-control mb-3">
              <label class="label" for="clientId">
                <span class="label-text">GitHub OAuth Client ID</span>
              </label>
              <input id="clientId" type="text" class="input input-bordered" bind:value={clientId} placeholder="Ov23li..." />
              <label class="label">
                <span class="label-text-alt opacity-60">Requires a CORS proxy for device flow.</span>
              </label>
            </div>
            <button
              class="btn btn-primary w-full gap-2"
              on:click={handleSignIn}
              disabled={!clientId}
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              Sign in with GitHub
            </button>
          {/if}
        </div>
      </div>
    </div>
  </div>

  <!-- Theme section -->
  <div class="card bg-base-200/50 border border-base-300/40">
    <div class="card-body gap-4">
      <h2 class="text-sm font-semibold uppercase tracking-wider opacity-60 mb-1 flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
        </svg>
        Theme
      </h2>
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
              <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 text-success shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            {/if}
          </button>
        {/each}
      </div>
    </div>
  </div>

  <!-- Repository section -->
  <div class="card bg-base-200/50 border border-base-300/40">
    <form on:submit|preventDefault={save} class="card-body gap-6">
      <h2 class="text-sm font-semibold uppercase tracking-wider opacity-60 mb-1 flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
        Repository
      </h2>
      <div class="flex flex-col gap-4">
        <div class="form-control">
          <label class="label" for="owner">
            <span class="label-text">GitHub Owner / Org</span>
          </label>
          <input id="owner" type="text" class="input input-bordered" bind:value={owner} placeholder="my-org" />
        </div>

        <div class="form-control">
          <label class="label" for="repo">
            <span class="label-text">Repository</span>
          </label>
          <input id="repo" type="text" class="input input-bordered" bind:value={repo} placeholder="my-knowledge-base" />
        </div>

        <div class="form-control">
          <label class="label" for="branch">
            <span class="label-text">Branch</span>
          </label>
          <input id="branch" type="text" class="input input-bordered" bind:value={branch} placeholder="main" />
        </div>
      </div>

      <!-- Save -->
      <div class="flex items-center gap-3">
        <button type="submit" class="btn btn-primary flex-1 transition-all duration-200">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          Save Settings
        </button>
        {#if saved}
          <span class="text-sm text-success font-semibold animate-pulse">Saved</span>
        {/if}
      </div>
    </form>
  </div>

</div>

<style>
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
    padding: 0.4rem 0.55rem;
    border-radius: 0.35rem;
    border: 1px solid transparent;
    background: transparent;
    color: var(--color-base-content, #a6adbb);
    cursor: pointer;
    font-family: 'Nunito', sans-serif;
    font-size: 0.8rem;
    transition: all 0.1s ease;
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
</style>
