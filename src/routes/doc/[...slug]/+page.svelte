<script>
  // Placeholder — the real doc viewer/editor will replace this file.
  import { page } from '$app/stores';
  $: slug = $page.params.slug;
</script>

<p>Document: <code>{slug}</code></p>
