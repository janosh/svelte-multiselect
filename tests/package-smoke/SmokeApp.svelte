<script lang="ts">
  import MultiSelect, {
    CommandMenu,
    fuzzy_match,
    MultiSelect as NamedSelect,
    PageSearch,
  } from 'svelte-multiselect'
  import DirectCommandMenu from 'svelte-multiselect/CommandMenu.svelte'
  import DirectMultiSelect from 'svelte-multiselect/MultiSelect.svelte'
  import DirectPageSearch from 'svelte-multiselect/PageSearch.svelte'
  import type { Option } from 'svelte-multiselect'
  import { click_outside } from 'svelte-multiselect/attachments'
  import type { CmdAction } from 'svelte-multiselect/types'
  import { get_label } from 'svelte-multiselect/utils'

  const options: Option[] = [`One`, { label: `Two`, value: 2 }]
  const actions: CmdAction[] = [{ label: `Open`, action: () => undefined }]
  const package_api_works =
    DirectCommandMenu === CommandMenu &&
    DirectMultiSelect === NamedSelect &&
    DirectPageSearch === PageSearch &&
    fuzzy_match(`tw`, String(get_label(options[1])))
  let selected = $state<Option[]>([])
</script>

<main {@attach click_outside({ callback: () => undefined })}>
  <MultiSelect bind:selected {options} name="choices" />
  <DirectMultiSelect {options} />
  <DirectCommandMenu {actions} />
  <DirectPageSearch fallback_actions={actions} />
  <p>{package_api_works ? `package ok` : `package failed`}</p>
</main>
