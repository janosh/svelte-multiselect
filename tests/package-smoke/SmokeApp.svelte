<script lang="ts">
  import MultiSelect, {
    CommandMenu,
    fuzzy_match,
    MultiSelect as NamedSelect,
    PageSearch,
  } from 'svelte-widgets'
  import DirectCommandMenu from 'svelte-widgets/CommandMenu.svelte'
  import DirectMultiSelect from 'svelte-widgets/MultiSelect.svelte'
  import DirectPageSearch from 'svelte-widgets/PageSearch.svelte'
  import type { Option } from 'svelte-widgets'
  import { click_outside } from 'svelte-widgets/attachments'
  import type { KatexOptions } from 'svelte-widgets/katex'
  import { apply_theme_mode as apply_theme_from_subpath } from 'svelte-widgets/theme'
  import type { CmdAction } from 'svelte-widgets/types'
  import { get_label } from 'svelte-widgets/utils'

  const options: Option[] = [`One`, { label: `Two`, value: 2 }]
  const actions: CmdAction[] = [{ label: `Open`, action: () => undefined }]
  const katex_options: KatexOptions = { throwOnError: true }
  const package_api_works =
    DirectCommandMenu === CommandMenu &&
    DirectMultiSelect === NamedSelect &&
    DirectPageSearch === PageSearch &&
    typeof apply_theme_from_subpath === `function` &&
    katex_options.throwOnError === true &&
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
