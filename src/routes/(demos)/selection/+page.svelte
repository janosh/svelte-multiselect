<script lang="ts">
  import { SubpageGrid } from '$lib'
</script>

<SubpageGrid
  title="Selection Overview"
  subtitle="Examples focused on how options are selected, limited, ordered, and managed."
  subpages={[
    [`Min/Max Select`, `/min-max-select`, `Use maxSelect and required constraints.`],
    [`Input Dropdown`, `/input-dropdown`, `Use a single-select editable input with dropdown suggestions.`],
    [`Duplicates`, `/duplicates`, `Handle duplicate labels and options.`],
    [`Sort Selected`, `/sort-selected`, `Keep selected options sorted.`],
    [`Keep Selected`, `/keep-selected`, `Keep selected items visible in dropdown.`],
    [`User Options`, `/allow-user-options`, `Create options from user input.`],
    [`History`, `/history`, `Undo/redo and selection history behavior.`],
  ]}
/>
