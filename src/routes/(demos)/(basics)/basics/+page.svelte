<script lang="ts">
  import { base } from '$app/paths'
  import { SubpageGrid } from '$lib'
</script>

<SubpageGrid
  title="Basics Overview"
  subtitle="Core examples for standard form usage and event handling."
  subpages={[
    [`Form`, `${base}/form`, `Form integration and native validation behavior.`],
    [`Events`, `${base}/events`, `Event callbacks and payloads.`],
    [`Disabled`, `${base}/disabled`, `Disabled options and disabled component states.`],
  ]}
/>
