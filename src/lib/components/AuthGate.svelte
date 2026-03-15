<script>
  import { config } from '$lib/config.js';
  import { user, authState, authError, getToken, validateToken } from '$lib/auth.js';
  import { browser } from '$app/environment';

  let token = '';
  let owner = $config.owner || 'keaganluttrell';
  let repo = $config.repo || 'stasher';
  let error = '';
  let loading = false;
  let showHelp = false;

  async function handleSubmit() {
    error = '';
    const trimmedToken = token.trim();
    const trimmedOwner = owner.trim();
    const trimmedRepo = repo.trim();

    if (!trimmedToken) {
      error = 'Please paste your GitHub Personal Access Token.';
      return;
    }
    if (!trimmedOwner || !trimmedRepo) {
      error = 'Please enter both repository owner and name.';
      return;
    }

    loading = true;

    try {
      // Step 1: Validate the token against GitHub API
      const userRes = await fetch('https://api.github.com/user', {
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${trimmedToken}`
        }
      });

      if (!userRes.ok) {
        if (userRes.status === 401) {
          error = 'Invalid token. Please check that you pasted the full token.';
        } else {
          error = `GitHub returned ${userRes.status}. Please try again.`;
        }
        loading = false;
        return;
      }

      const profile = await userRes.json();

      // Step 2: Verify repo access
      const repoRes = await fetch(`https://api.github.com/repos/${trimmedOwner}/${trimmedRepo}`, {
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${trimmedToken}`
        }
      });

      if (!repoRes.ok) {
        if (repoRes.status === 404) {
          error = `Repository "${trimmedOwner}/${trimmedRepo}" not found or not accessible with this token.`;
        } else {
          error = `Could not verify repo access (${repoRes.status}). Check your token permissions.`;
        }
        loading = false;
        return;
      }

      // Step 3: Store everything
      if (browser) {
        localStorage.setItem('gh_token', trimmedToken);
        localStorage.setItem('gh_user', JSON.stringify({
          login: profile.login,
          avatar_url: profile.avatar_url,
          name: profile.name || profile.login,
          token: trimmedToken
        }));
      }

      config.set({
        owner: trimmedOwner,
        repo: trimmedRepo,
        branch: $config.branch || 'main',
        token: trimmedToken,
        clientId: $config.clientId || ''
      });

      // Step 4: Update auth stores
      user.set({
        login: profile.login,
        avatar_url: profile.avatar_url,
        name: profile.name || profile.login,
        token: trimmedToken
      });
      authState.set('authenticated');

    } catch (e) {
      error = 'Network error. Please check your connection and try again.';
    }

    loading = false;
  }

  function handleKeydown(e) {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  }
</script>

<div class="gate-backdrop">
  <div class="gate-card">
    <!-- Logo -->
    <div class="gate-logo">
      <span class="gate-logo-text">stasher</span>
    </div>

    <p class="gate-subtitle">
      Paste your GitHub Personal Access Token to get started
    </p>

    <!-- Error message -->
    {#if error}
      <div class="gate-error" role="alert">
        <svg xmlns="http://www.w3.org/2000/svg" class="gate-error-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <span>{error}</span>
      </div>
    {/if}

    <!-- Token input -->
    <div class="gate-field">
      <label for="gate-token" class="gate-label">Personal Access Token</label>
      <input
        id="gate-token"
        type="password"
        class="gate-input"
        bind:value={token}
        on:keydown={handleKeydown}
        placeholder="github_pat_..."
        autocomplete="off"
        spellcheck="false"
        disabled={loading}
      />
    </div>

    <!-- Repo config -->
    <div class="gate-row">
      <div class="gate-field gate-field-half">
        <label for="gate-owner" class="gate-label">Repository owner</label>
        <input
          id="gate-owner"
          type="text"
          class="gate-input gate-input-sm"
          bind:value={owner}
          on:keydown={handleKeydown}
          placeholder="keaganluttrell"
          disabled={loading}
        />
      </div>
      <div class="gate-field gate-field-half">
        <label for="gate-repo" class="gate-label">Repository name</label>
        <input
          id="gate-repo"
          type="text"
          class="gate-input gate-input-sm"
          bind:value={repo}
          on:keydown={handleKeydown}
          placeholder="stasher"
          disabled={loading}
        />
      </div>
    </div>

    <!-- Submit -->
    <button
      class="gate-btn"
      on:click={handleSubmit}
      disabled={loading}
    >
      {#if loading}
        <span class="gate-spinner"></span>
        Verifying...
      {:else}
        Enter
      {/if}
    </button>

    <!-- Help section -->
    <button
      class="gate-help-toggle"
      on:click={() => (showHelp = !showHelp)}
    >
      {showHelp ? 'Hide' : 'How to create a token'}
      <svg xmlns="http://www.w3.org/2000/svg" class="gate-chevron" class:gate-chevron-open={showHelp} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    {#if showHelp}
      <div class="gate-help">
        <ol>
          <li>Go to <a href="https://github.com/settings/tokens?type=beta" target="_blank" rel="noopener noreferrer">GitHub Settings &rarr; Fine-grained tokens</a></li>
          <li>Click <strong>Generate new token</strong></li>
          <li>Name it something like <code>stasher</code></li>
          <li>Under <strong>Repository access</strong>, select the repo you want to use</li>
          <li>Under <strong>Permissions &rarr; Repository permissions</strong>, set <code>Contents</code> to <strong>Read-only</strong> (or <strong>Read and write</strong> if you want to edit docs)</li>
          <li>Click <strong>Generate token</strong> and paste it above</li>
        </ol>
      </div>
    {/if}
  </div>
</div>

<style>
  .gate-backdrop {
    position: fixed;
    inset: 0;
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-base-100, #1d232a);
    padding: 1.5rem;
  }

  .gate-card {
    width: 100%;
    max-width: 24rem;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    animation: gate-enter 0.3s ease;
  }

  @keyframes gate-enter {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .gate-logo {
    text-align: center;
    margin-bottom: 0.25rem;
  }

  .gate-logo-text {
    font-family: 'Unbounded', sans-serif;
    font-weight: 900;
    font-size: 2.5rem;
    letter-spacing: -0.02em;
    background: linear-gradient(135deg, var(--color-primary, #546e7a), var(--color-accent, #82b1ff));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    line-height: 1;
  }

  .gate-subtitle {
    text-align: center;
    font-family: 'Nunito', sans-serif;
    font-size: 0.9rem;
    color: var(--color-base-content, #a6adbb);
    opacity: 0.6;
    margin: 0;
    line-height: 1.4;
  }

  .gate-error {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    padding: 0.65rem 0.85rem;
    border-radius: 0.5rem;
    background: color-mix(in oklch, var(--color-error, #f87171) 12%, transparent);
    border: 1px solid color-mix(in oklch, var(--color-error, #f87171) 25%, transparent);
    color: var(--color-error, #f87171);
    font-size: 0.8rem;
    font-family: 'Nunito', sans-serif;
    line-height: 1.4;
  }

  .gate-error-icon {
    width: 1rem;
    height: 1rem;
    flex-shrink: 0;
    margin-top: 0.1rem;
  }

  .gate-field {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .gate-label {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--color-base-content, #a6adbb);
    opacity: 0.5;
  }

  .gate-input {
    width: 100%;
    padding: 0.65rem 0.85rem;
    border-radius: 0.5rem;
    border: 1px solid color-mix(in oklch, var(--color-base-300, #374151) 60%, transparent);
    background: var(--color-base-200, #2a303c);
    color: var(--color-base-content, #a6adbb);
    font-family: 'Fira Code', monospace;
    font-size: 0.85rem;
    outline: none;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
    box-sizing: border-box;
  }

  .gate-input:focus {
    border-color: var(--color-primary, #546e7a);
    box-shadow: 0 0 0 2px color-mix(in oklch, var(--color-primary, #546e7a) 20%, transparent);
  }

  .gate-input:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .gate-input-sm {
    font-size: 0.8rem;
    padding: 0.5rem 0.7rem;
    font-family: 'Nunito', sans-serif;
  }

  .gate-row {
    display: flex;
    gap: 0.75rem;
  }

  .gate-field-half {
    flex: 1;
    min-width: 0;
  }

  .gate-btn {
    width: 100%;
    padding: 0.7rem 1rem;
    border-radius: 0.5rem;
    border: none;
    background: var(--color-primary, #546e7a);
    color: var(--color-primary-content, #fff);
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 0.9rem;
    font-weight: 700;
    cursor: pointer;
    transition: opacity 0.15s ease, transform 0.1s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }

  .gate-btn:hover:not(:disabled) {
    opacity: 0.9;
  }

  .gate-btn:active:not(:disabled) {
    transform: scale(0.99);
  }

  .gate-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .gate-spinner {
    width: 1rem;
    height: 1rem;
    border: 2px solid transparent;
    border-top-color: currentColor;
    border-radius: 50%;
    animation: gate-spin 0.6s linear infinite;
  }

  @keyframes gate-spin {
    to { transform: rotate(360deg); }
  }

  .gate-help-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.35rem;
    background: none;
    border: none;
    color: var(--color-base-content, #a6adbb);
    opacity: 0.4;
    font-family: 'Nunito', sans-serif;
    font-size: 0.78rem;
    cursor: pointer;
    transition: opacity 0.15s ease;
    padding: 0.25rem;
  }

  .gate-help-toggle:hover {
    opacity: 0.7;
  }

  .gate-chevron {
    width: 0.75rem;
    height: 0.75rem;
    transition: transform 0.2s ease;
  }

  .gate-chevron-open {
    transform: rotate(180deg);
  }

  .gate-help {
    padding: 0.85rem 1rem;
    border-radius: 0.5rem;
    background: color-mix(in oklch, var(--color-base-200, #2a303c) 70%, transparent);
    border: 1px solid color-mix(in oklch, var(--color-base-300, #374151) 30%, transparent);
    animation: gate-enter 0.2s ease;
  }

  .gate-help ol {
    list-style: decimal;
    padding-left: 1.25rem;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    font-family: 'Nunito', sans-serif;
    font-size: 0.78rem;
    color: var(--color-base-content, #a6adbb);
    opacity: 0.75;
    line-height: 1.5;
  }

  .gate-help a {
    color: var(--color-primary, #546e7a);
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  .gate-help code {
    font-family: 'Fira Code', monospace;
    font-size: 0.75rem;
    background: var(--color-base-300, #374151);
    padding: 0.1em 0.3em;
    border-radius: 0.2rem;
  }

  @media (max-width: 639px) {
    .gate-card {
      max-width: 100%;
    }

    .gate-logo-text {
      font-size: 2rem;
    }

    .gate-row {
      flex-direction: column;
      gap: 1rem;
    }
  }
</style>
