<script lang="ts">
  import Toc from 'svelte-toc'
  import Contributing from '../../../contributing.md'
</script>

<main>
  <Contributing />
</main>

<Toc headingSelector="main > :where(h2)" breakpoint={1250} />
