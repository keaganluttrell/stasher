<script>
  export let type = 'doc';
  export let size = 'sm'; // 'sm' for lists, 'md' for headers

  const TYPE_COLORS = {
    note:   '#38bdf8',
    source: '#a78bfa',
    map:    '#f59e0b',
    doc:    '#94a3b8',
  };

  const TYPE_LABELS = {
    note:   'note',
    source: 'source',
    map:    'map',
    doc:    'doc',
  };

  $: color = TYPE_COLORS[type] || TYPE_COLORS.doc;
  $: label = TYPE_LABELS[type] || TYPE_LABELS.doc;
  $: isMd = size === 'md';
</script>

<span
  class="type-badge"
  class:type-badge-md={isMd}
  style="color: {color}; background: color-mix(in oklch, {color} 15%, transparent);{isMd ? ` border: 1px solid color-mix(in oklch, ${color} 25%, transparent);` : ''}"
>
  {label}
</span>

<style>
  .type-badge {
    display: inline-block;
    font-size: 0.68rem;
    font-weight: 700;
    font-family: 'Plus Jakarta Sans', sans-serif;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 0.15em 0.45em;
    border-radius: 3px;
    line-height: 1.4;
    flex-shrink: 0;
    white-space: nowrap;
  }

  .type-badge-md {
    font-size: 0.75rem;
    padding: 0.2em 0.55em;
    border-radius: 999px;
  }
</style>
