<script lang="ts">
  import { resolve } from '$app/paths'
  import { SubpageGrid } from '$lib'
</script>

<SubpageGrid
  title="Basics Overview"
  subtitle="Core examples for standard form usage and event handling."
  subpages={[
    [`Form`, resolve(`/form`), `Form integration and native validation behavior.`],
    [`Events`, resolve(`/events`), `Event callbacks and payloads.`],
    [`Disabled`, resolve(`/disabled`), `Disabled options and disabled component states.`],
  ]}
/>
