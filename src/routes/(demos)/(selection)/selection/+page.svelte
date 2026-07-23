<script lang="ts">
  import { base } from '$app/paths'
  import { SubpageGrid } from '$lib'
</script>

<SubpageGrid
  title="Selection Overview"
  subtitle="Examples focused on how options are selected, limited, ordered, and managed."
  subpages={[
    [
      `Min/Max Select`,
      `${base}/min-max-select`,
      `Use maxSelect and required constraints.`,
    ],
    [
      `Input Dropdown`,
      `${base}/input-dropdown`,
      `Use a single-select editable input with dropdown suggestions.`,
    ],
    [`Duplicates`, `${base}/duplicates`, `Handle duplicate labels and options.`],
    [`Sort Selected`, `${base}/sort-selected`, `Keep selected options sorted.`],
    [
      `Keep Selected`,
      `${base}/keep-selected`,
      `Keep selected items visible in dropdown.`,
    ],
    [`User Options`, `${base}/allow-user-options`, `Create options from user input.`],
    [`History`, `${base}/history`, `Undo/redo and selection history behavior.`],
  ]}
/>
