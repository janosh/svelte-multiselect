<script lang="ts">
  import { base } from '$app/paths'
  import { SubpageGrid } from '$lib'
</script>

<SubpageGrid
  title="Components Overview"
  subtitle="Examples for related components shipped with this project."
  subpages={[
    [`Nav`, `${base}/nav`, `Configurable navigation component patterns.`],
    [`CmdPalette`, `${base}/cmd-palette`, `Command palette built on MultiSelect.`],
  ]}
/>
