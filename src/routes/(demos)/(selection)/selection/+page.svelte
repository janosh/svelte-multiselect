<script lang="ts">
  import { resolve } from '$app/paths'
  import { SubpageGrid } from '$lib'
</script>

<SubpageGrid
  title="Selection Overview"
  subtitle="Examples focused on how options are selected, limited, ordered, and managed."
  subpages={[
    [
      `Min/Max Select`,
      resolve(`/min-max-select`),
      `Use maxSelect and required constraints.`,
    ],
    [
      `Input Dropdown`,
      resolve(`/input-dropdown`),
      `Use a single-select editable input with dropdown suggestions.`,
    ],
    [`Duplicates`, resolve(`/duplicates`), `Handle duplicate labels and options.`],
    [`Sort Selected`, resolve(`/sort-selected`), `Keep selected options sorted.`],
    [
      `Keep Selected`,
      resolve(`/keep-selected`),
      `Keep selected items visible in dropdown.`,
    ],
    [`User Options`, resolve(`/allow-user-options`), `Create options from user input.`],
    [`History`, resolve(`/history`), `Undo/redo and selection history behavior.`],
  ]}
/>
