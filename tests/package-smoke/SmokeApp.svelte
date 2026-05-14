<script lang="ts">
  import MultiSelect, { fuzzy_match, MultiSelect as NamedSelect } from 'svelte-multiselect'
  import type { MultiSelectProps, Option } from 'svelte-multiselect'
  import DirectMultiSelect from 'svelte-multiselect/MultiSelect.svelte'
  import { click_outside } from 'svelte-multiselect/attachments'
  import { get_label } from 'svelte-multiselect/utils'

  const options = [`One`, { label: `Two`, value: 2 }] satisfies Option[]
  const props: MultiSelectProps<Option> = { options }
  const direct_export_matches = DirectMultiSelect === NamedSelect
  const utility_export_works = fuzzy_match(`tw`, String(get_label(options[1])))
  let selected = $state<Option[]>([])
</script>

<main {@attach click_outside({ callback: () => undefined })}>
  <MultiSelect bind:selected {options} name="choices" />
  <DirectMultiSelect {...props} />
  <p>{direct_export_matches && utility_export_works ? `package ok` : `package failed`}</p>
</main>
