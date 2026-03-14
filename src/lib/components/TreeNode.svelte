<script>
  import { page } from '$app/stores';
  import { base } from '$app/paths';

  export let node;
  export let depth = 0;
  export let openGroups = {};
  export let onToggle = () => {};
  export let onNavigate = () => {};

  const GROUP_COLORS = ['primary', 'secondary', 'accent', 'info', 'success', 'warning'];

  function getGroupColorName(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return GROUP_COLORS[Math.abs(hash) % GROUP_COLORS.length];
  }

  $: isOpen = openGroups[node.path] !== false;
  $: hasContent = node.docs.length > 0 || node.children.length > 0;
  $: totalDocs = node.docs.length + node.children.reduce((sum, c) => sum + c.docs.length, 0);
</script>

{#if hasContent}
  <div style="padding-left: {depth * 0.75}rem;">
    <!-- Folder header -->
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div
      class="text-xs uppercase tracking-wider font-semibold opacity-70 px-1 py-1 flex items-center gap-1.5 cursor-pointer select-none hover:opacity-100 transition-opacity duration-150"
      style="border-left: 2px solid var(--color-{getGroupColorName(node.name)})"
      role="button"
      tabindex="0"
      on:click={() => onToggle(node.path)}
      on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(node.path); } }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="h-3 w-3 opacity-60 transition-transform duration-200 shrink-0"
        class:rotate-[-90deg]={!isOpen}
        fill="none" viewBox="0 0 24 24" stroke="currentColor"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
      {#if node.children.length > 0 && node.docs.length === 0}
        <!-- Folder with only subfolders -->
        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 opacity-70 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
      {:else}
        <!-- Folder with docs -->
        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 opacity-70 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
        </svg>
      {/if}
      <span class="flex-1 truncate">{node.name}</span>
      <span class="badge badge-xs opacity-50">{totalDocs}</span>
    </div>

    {#if isOpen}
      <!-- Child folders -->
      {#each node.children as child}
        <svelte:self
          node={child}
          depth={depth + 1}
          {openGroups}
          {onToggle}
          {onNavigate}
        />
      {/each}

      <!-- Doc files -->
      {#if node.docs.length > 0}
        <ul class="menu menu-sm p-0" style="padding-left: {(depth + 1) * 0.75}rem;">
          {#each node.docs as doc}
            <li>
              <a
                href="{base}/doc/{doc.slug}"
                class="transition-colors duration-150 flex items-center gap-1.5 {$page.params.slug === doc.slug ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-base-content/5'}"
                class:active={false}
                on:click={onNavigate}
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 opacity-40 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <span class="truncate">{doc.title}</span>
              </a>
            </li>
          {/each}
        </ul>
      {/if}
    {/if}
  </div>
{/if}
