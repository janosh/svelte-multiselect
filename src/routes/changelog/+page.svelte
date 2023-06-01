<script lang="ts">
  import Toc from 'svelte-toc'

  export let data
</script>

<main>
  {@html data.changelog?.code}
</main>

<Toc breakpoint={1250} />
