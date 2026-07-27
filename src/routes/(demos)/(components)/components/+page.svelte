<script lang="ts">
  import { resolve } from '$app/paths'
  import { SubpageGrid } from '$lib'
</script>

<SubpageGrid
  title="Components Overview"
  subtitle="Examples for related components shipped with this project."
  subpages={[
    [`Nav`, resolve(`/nav`), `Configurable navigation component patterns.`],
    [`CommandMenu`, resolve(`/command-menu`), `Command menu built on MultiSelect.`],
    [
      `Popover & ContextMenu`,
      resolve(`/popover`),
      `Floating surfaces built from the dismissal, focus and positioning attachments.`,
    ],
  ]}
/>
