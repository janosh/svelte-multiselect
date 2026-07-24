<script lang="ts">
  import { resolve } from '$app/paths'
  import { SubpageGrid } from '$lib'
</script>

<SubpageGrid
  title="Data Overview"
  subtitle="Examples focused on organizing and loading option data."
  subpages={[
    [
      `Grouping`,
      resolve(`/grouping`),
      `Grouped options, sticky headers, and group actions.`,
    ],
    [
      `Infinite Scroll`,
      resolve(`/infinite-scroll`),
      `Incremental loading with loadOptions.`,
    ],
  ]}
/>
