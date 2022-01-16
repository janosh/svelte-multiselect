<script lang="ts">
  import { goto } from '$app/navigation'
  import { onMount } from 'svelte'

  onMount(() => goto(`/`)) // go back to index page on missing routes
</script>
