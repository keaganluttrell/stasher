<script>
  import { config } from '$lib/config.js';

  let owner = $config.owner;
  let repo = $config.repo;
  let branch = $config.branch;
  let token = $config.token;
  let saved = false;

  function save() {
    config.set({ owner, repo, branch, token });
    saved = true;
    setTimeout(() => (saved = false), 2000);
  }
</script>

<svelte:head>
  <title>Settings — braindump</title>
</svelte:head>

<h1>Settings</h1>

<form on:submit|preventDefault={save}>
  <label>
    GitHub Owner / Org
    <input type="text" bind:value={owner} placeholder="my-org" />
  </label>

  <label>
    Repository
    <input type="text" bind:value={repo} placeholder="my-knowledge-base" />
  </label>

  <label>
    Branch
    <input type="text" bind:value={branch} placeholder="main" />
  </label>

  <label>
    Personal Access Token
    <input type="password" bind:value={token} placeholder="ghp_..." />
    <small>Requires <code>contents: write</code> scope.</small>
  </label>

  <button type="submit">Save</button>
  {#if saved}
    <small><strong>Saved.</strong></small>
  {/if}
</form>
