<script>
  import { config } from '$lib/config.js';
  import { user, authState, authError, deviceFlowData, startDeviceFlow, cancelDeviceFlow, logout, getToken } from '$lib/auth.js';

  let owner = $config.owner;
  let repo = $config.repo;
  let branch = $config.branch;
  let token = $config.token;
  let clientId = $config.clientId;
  let saved = false;
  let codeCopied = false;

  // Manual token fallback (advanced)
  let showManualToken = false;

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
</script>

<svelte:head>
  <title>Settings — stasher</title>
</svelte:head>

<h1 class="text-3xl font-bold mb-6">Settings</h1>

<div class="alert alert-info mb-6">
  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
  <span>Browsing docs works without any configuration. The settings below are only needed if you want to edit docs in the browser and commit changes back to GitHub.</span>
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
        <!-- Signed in state -->
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
        <button class="btn btn-outline btn-error btn-sm w-full" on:click={handleSignOut}>
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign Out
        </button>

      {:else if $authState === 'polling' && $deviceFlowData}
        <!-- Device flow polling state -->
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
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Open github.com/login/device
          </a>
          <div class="flex items-center gap-2 text-sm opacity-60">
            <span class="loading loading-spinner loading-xs"></span>
            Waiting for authorization...
          </div>
          <button class="btn btn-ghost btn-xs" on:click={cancelDeviceFlow}>Cancel</button>
        </div>

      {:else if $authState === 'pending'}
        <!-- Starting device flow -->
        <div class="flex items-center justify-center gap-2 py-4">
          <span class="loading loading-spinner loading-sm"></span>
          <span class="text-sm opacity-60">Starting device flow...</span>
        </div>

      {:else}
        <!-- Signed out state -->
        {#if $authError}
          <div class="alert alert-error text-sm">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span>{$authError}</span>
          </div>
        {/if}

        <!-- OAuth Client ID -->
        <div class="form-control">
          <label class="label" for="clientId">
            <span class="label-text">GitHub OAuth Client ID</span>
          </label>
          <input id="clientId" type="text" class="input input-bordered" bind:value={clientId} placeholder="Ov23li..." />
          <label class="label">
            <span class="label-text-alt opacity-60">From your GitHub OAuth App (see setup instructions below)</span>
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

        <!-- Manual token fallback -->
        <div class="divider text-xs opacity-50">OR</div>

        <button
          class="btn btn-ghost btn-sm w-full"
          on:click={() => (showManualToken = !showManualToken)}
        >
          {showManualToken ? 'Hide' : 'Use'} Personal Access Token
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 transition-transform" class:rotate-180={showManualToken} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {#if showManualToken}
          <div class="form-control">
            <label class="label" for="token">
              <span class="label-text">Personal Access Token</span>
            </label>
            <input id="token" type="password" class="input input-bordered" bind:value={token} placeholder="ghp_..." />
            <label class="label">
              <span class="label-text-alt opacity-60">Requires <code class="text-xs">contents: write</code> scope.</span>
            </label>
          </div>
        {/if}

        <!-- OAuth App setup instructions -->
        <div class="collapse collapse-arrow bg-base-300/30 rounded-lg">
          <input type="checkbox" />
          <div class="collapse-title text-sm font-medium opacity-70">
            How to create a GitHub OAuth App
          </div>
          <div class="collapse-content">
            <ol class="text-sm opacity-80 space-y-2 list-decimal list-inside">
              <li>Go to <a href="https://github.com/settings/developers" target="_blank" rel="noopener noreferrer" class="link link-primary">GitHub &gt; Settings &gt; Developer settings &gt; OAuth Apps</a></li>
              <li>Click <strong>New OAuth App</strong></li>
              <li>Application name: <code class="text-xs bg-base-300 px-1 rounded">stasher</code></li>
              <li>Homepage URL: your GitHub Pages URL</li>
              <li>Authorization callback URL: same as Homepage URL (device flow does not use it)</li>
              <li>Click <strong>Register application</strong></li>
              <li>Copy the <strong>Client ID</strong> (you do NOT need the client secret)</li>
            </ol>
            <div class="alert alert-warning mt-3 text-xs">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span>The device flow requires a CORS proxy since GitHub's OAuth endpoints don't allow browser requests. You'll need a small Cloudflare Worker or similar proxy.</span>
            </div>
          </div>
        </div>
      {/if}
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
