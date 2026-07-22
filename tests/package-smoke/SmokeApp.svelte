<script lang="ts">
  import MultiSelect, {
    fuzzy_match,
    MultiSelect as NamedSelect,
    PagefindPalette,
  } from 'svelte-multiselect'
  import DirectCmdPalette from 'svelte-multiselect/CmdPalette.svelte'
  import DirectMultiSelect from 'svelte-multiselect/MultiSelect.svelte'
  import DirectPagefindPalette from 'svelte-multiselect/PagefindPalette.svelte'
  import type { Option } from 'svelte-multiselect'
  import { click_outside } from 'svelte-multiselect/attachments'
  import type { CmdAction } from 'svelte-multiselect/types'
  import { get_label } from 'svelte-multiselect/utils'

  const options: Option[] = [`One`, { label: `Two`, value: 2 }]
  const actions: CmdAction[] = [{ label: `Open`, action: () => undefined }]
  const direct_export_matches = DirectMultiSelect === NamedSelect
  const pagefind_export_matches = DirectPagefindPalette === PagefindPalette
  const utility_export_works = fuzzy_match(`tw`, String(get_label(options[1])))
  let selected = $state<Option[]>([])
</script>

<main {@attach click_outside({ callback: () => undefined })}>
  <MultiSelect bind:selected {options} name="choices" />
  <DirectMultiSelect {options} />
  <DirectCmdPalette {actions} />
  <DirectPagefindPalette fallback_actions={actions} />
  <p>
    {direct_export_matches && pagefind_export_matches && utility_export_works
      ? `package ok`
      : `package failed`}
  </p>
</main>
