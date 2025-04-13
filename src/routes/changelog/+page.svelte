<script lang="ts">
  import Toc from 'svelte-toc'

  let { data } = $props()
</script>

<main>
  {@html data.changelog?.code}
</main>

<Toc breakpoint={1250} />
