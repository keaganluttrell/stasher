<script>
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { config } from '$lib/config.js';
  import { getDoc } from '$lib/docs.js';
  import { getFile, putFile } from '$lib/github.js';
  import { marked } from 'marked';
  import DocHeader from '$lib/components/DocHeader.svelte';

  const renderer = new marked.Renderer();
  renderer.heading = function ({ text, depth }) {
    const id = text.toLowerCase().replace(/[^\w]+/g, '-').replace(/(^-|-$)/g, '');
    return `<h${depth} id="${id}"><a href="#${id}" class="anchor-link" aria-hidden="true" onclick="event.preventDefault();navigator.clipboard.writeText(location.origin+location.pathname+'#${id}');this.dataset.copied='true';setTimeout(()=>this.dataset.copied='',1500)">#</a>${text}</h${depth}>`;
  };
  marked.use({ renderer });

  // Slug is everything after /doc/ — supports nested paths
  $: slug = $page.params.slug;

  let raw = '';
  let sha = '';
  let frontmatter = {};
  let body = '';
  let editing = false;
  let saving = false;
  let error = '';
  let loaded = false;

  // Milkdown editor instance
  let editorEl;
  let milkdownEditor = null;

  $: if (slug && slug !== 'new') loadDoc(slug);

  async function loadDoc(s) {
    loaded = false;
    error = '';
    try {
      const doc = await getDoc(s);
      raw = doc.content;
      frontmatter = doc.frontmatter;
      body = doc.body;
      sha = '';
      loaded = true;
    } catch (e) {
      error = e.message;
      loaded = true;
    }
  }

  function parseFrontmatter(content) {
    const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (match) {
      frontmatter = Object.fromEntries(
        match[1].split('\n').map((line) => {
          const [k, ...v] = line.split(':');
          return [k.trim(), v.join(':').trim()];
        })
      );
      body = match[2];
    } else {
      frontmatter = {};
      body = content;
    }
  }

  function buildFrontmatter(fm) {
    if (Object.keys(fm).length === 0) return '';
    const lines = Object.entries(fm)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');
    return `---\n${lines}\n---\n`;
  }

  async function startEdit() {
    editing = true;
    if (!milkdownEditor && editorEl) {
      await initMilkdown();
    }
  }

  async function initMilkdown() {
    const { Editor, rootCtx, defaultValueCtx } = await import('@milkdown/core');
    const { commonmark } = await import('@milkdown/kit/preset/commonmark');
    const { nord } = await import('@milkdown/theme-nord');

    milkdownEditor = await Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, editorEl);
        ctx.set(defaultValueCtx, body);
      })
      .use(nord)
      .use(commonmark)
      .create();
  }

  async function save() {
    if (!$config.token) {
      error = 'No GitHub token set. Go to Settings.';
      return;
    }
    saving = true;
    error = '';
    try {
      // Fetch current sha from GitHub for the commit
      if (!sha) {
        const remote = await getFile($config.owner, $config.repo, slug, $config.branch);
        sha = remote.sha;
      }
      const { getMarkdown } = await import('@milkdown/kit/utils');
      let updatedBody = body;
      if (milkdownEditor) {
        updatedBody = milkdownEditor.action(getMarkdown());
      }
      const updatedRaw = buildFrontmatter(frontmatter) + updatedBody;
      await putFile(
        $config.owner,
        $config.repo,
        slug,
        updatedRaw,
        sha,
        `docs: update ${frontmatter.title ?? slug}`
      );
      raw = updatedRaw;
      body = updatedBody;
      editing = false;
      const { sha: newSha } = await getFile($config.owner, $config.repo, slug, $config.branch);
      sha = newSha;
    } catch (e) {
      error = e.message;
    } finally {
      saving = false;
    }
  }

  function cancelEdit() {
    editing = false;
    if (milkdownEditor) {
      milkdownEditor.destroy();
      milkdownEditor = null;
    }
  }

  onDestroy(() => {
    milkdownEditor?.destroy();
  });

  $: renderedHtml = body ? marked(body).replace(/<table/g, '<div class="table-wrap"><table').replace(/<\/table>/g, '</table></div>') : '';
  $: isNew = slug === 'new';
</script>

<svelte:head>
  <title>{frontmatter.title ?? slug} — stasher</title>
</svelte:head>

{#if isNew}
  <p class="opacity-60">New document creation coming soon.</p>
{:else if !loaded}
  <div class="flex items-center gap-2">
    <span class="loading loading-spinner loading-sm text-primary"></span>
    <span>Loading...</span>
  </div>
{:else if error}
  <div role="alert" class="alert alert-error">
    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
    </svg>
    <div>
      <span class="font-semibold">Error</span>
      <span>{error}</span>
    </div>
  </div>
{:else}
  <!-- Breadcrumb -->
  <div class="text-sm mb-4">
    <a href="{base}/" class="opacity-50 hover:opacity-80 hover:text-primary transition-all duration-200 no-underline inline-flex items-center gap-1">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
      All documents
    </a>
  </div>

  <DocHeader
    title={frontmatter.title ?? slug}
    description={frontmatter.description ?? ''}
    tags={frontmatter.tags ?? ''}
    date={frontmatter.date ?? ''}
    status={frontmatter.status ?? ''}
    {editing}
    {saving}
    hasToken={!!$config.token}
    onEdit={startEdit}
    onSave={save}
    onCancel={cancelEdit}
  />

  {#if editing}
    <div bind:this={editorEl} class="border border-base-300 rounded-lg min-h-[400px] p-4"></div>
  {:else}
    <article class="prose max-w-none">
      {@html renderedHtml}
    </article>
  {/if}
{/if}
