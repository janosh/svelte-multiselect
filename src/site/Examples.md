## 🚀 &thinsp; Getting Started

<label for="fruits">Pick your favorite fruits <span>basic multi-select</span></label>

```svelte example
<script>
  import MultiSelect from '$lib'

  const fruits = ['Apple', 'Banana', 'Cherry', 'Date', 'Elderberry']
  let selected = $state([])
</script>

<MultiSelect id="fruits" bind:selected options={fruits} placeholder="Choose fruits..." />

<p>You selected: {JSON.stringify(selected)}</p>
```

<label for="color">Pick one color <span>single-select with <code>maxSelect={1}</code></span></label>

```svelte example
<script>
  import MultiSelect from '$lib'

  const colors = ['Red', 'Green', 'Blue', 'Yellow', 'Purple']
  let value = $state(null)
</script>

<MultiSelect id="color" bind:value options={colors} maxSelect={1} placeholder="Choose a color..." />

<p>You selected: {JSON.stringify(value)}</p>
```

<label for="countries">Where have you lived? <span>options prop as array of objects</span></label>

```svelte example
<script>
  import MultiSelect from '$lib'

  const countries = [
    { label: 'United States', value: 'US', continent: 'North America' },
    { label: 'Canada', value: 'CA', continent: 'North America' },
    { label: 'United Kingdom', value: 'UK', continent: 'Europe' },
    { label: 'Germany', value: 'DE', continent: 'Europe' },
    { label: 'Japan', value: 'JP', continent: 'Asia' }
  ]
  let selected = $state([])
</script>

<MultiSelect id="countries" bind:selected options={countries} placeholder="Select countries..." />

<p>Selected countries: {selected.map(c => c.label).join(', ')}</p>
<p>Country codes: {selected.map(c => c.value).join(', ')}</p>
```

<label for="skills">Add your skills (you can define new ones) <span>user-created options</span></label>

```svelte example
<script>
  import MultiSelect from '$lib'

  const initial_tags = ['JavaScript', 'Svelte', 'TypeScript']
  let selected = $state([])
</script>

<MultiSelect
  bind:selected
  options={initial_tags}
  allowUserOptions="append"
  placeholder="Type to add skills..."
/>

<p>Your skills: {JSON.stringify(selected)}</p>
```

## 🔍 &thinsp; Advanced Examples

<label for="fav-languages">Favorite programming languages? <span>multi-select with custom snippet</span></label>

```svelte example collapsible repl="https://svelte.dev/repl/e3b88f59f62b498d943ecf7756ab75d7" stackblitz="src/site/Examples.md"
<script lang="ts">
  import MultiSelect from '$lib'
  import { languages } from '$site/options'
  import LanguageSnippet from './LanguageSnippet.svelte'

  let selected: string[] = $state([])
</script>

<MultiSelect
  id="fav-languages"
  options={languages}
  placeholder="Take your pick..."
  bind:selected
>
  {#snippet children({ idx, option })}
    <LanguageSnippet {idx} {option} gap="1ex" />
  {/snippet}
</MultiSelect>

selected = {JSON.stringify(selected) || `[]`}
```

<label for="fav-ml-tool">Favorite machine learning framework? <span>single-select with loading indicator on text input</span></label>

```svelte example collapsible repl="https://svelte.dev/repl/79e22e1905c94456aa21564b4d5f8759" stackblitz="src/site/Examples.md"
<script lang="ts">
  import MultiSelect from '$lib'
  import { ml_libs } from '$site/options'

  let value = $state(null)
  let searchText = $state('')
  let loading = $state(false)
  $effect(() => {
    loading = Boolean(searchText)
    // perform some fetch/database request here to get list of options matching searchText
    // options = await fetch(`https://example.com?search=${searchText}`)
    setTimeout(async () => { loading = false }, 1000)
  })
</script>

<MultiSelect
  id="fav-ml-tool"
  maxSelect={1}
  maxSelectMsg={(current, max) => `${current} of ${max} selected`}
  options={ml_libs}
  bind:searchText
  bind:value
  {loading}
  placeholder="Favorite machine learning tool?"
/>

value = {JSON.stringify(value) || `null`}
```

<label for="confetti-select">Chance of Confetti <span>max select with custom filter function and callback on item selection</span></label>

```svelte example collapsible repl="https://svelte.dev/repl/516279bd62ec424986115263c2cdc169" stackblitz="src/site/Examples.md"
<script lang="ts">
  import MultiSelect from '$lib'
  import { frontend_libs } from '$site/options'
  import RepoSnippet from './RepoSnippet.svelte'
  import { Confetti } from 'svelte-zoo'
  import type { ObjectOption } from '$lib'

  const frontend_libs_filter_func = (op: ObjectOption, searchText: string) => {
    if (!searchText) return true
    const [label, lang, searchStr] = [op.label, op.lang, searchText].map((s) =>
      s.toLowerCase()
    )
    return label.includes(searchStr) || lang.includes(searchStr)
  }

  let show_confetti = $state(false)
</script>

<MultiSelect
  id="confetti-select"
  options={frontend_libs}
  maxSelect={4}
  placeholder="Favorite web framework?"
  filterFunc={frontend_libs_filter_func}
  on:add={(e) => {
    if (e.detail.option.label === `Svelte`) {
      show_confetti = true
      setTimeout(() => (show_confetti = false), 3000)
    }
  }}
>
 {#snippet option({ idx, option })}
    <RepoSnippet {idx} {option} />
  {/snippet}
</MultiSelect>
{#if show_confetti}
  <Confetti />
{/if}
```

<label for="color-select">Color select <span>with form submission</span></label>

```svelte example collapsible repl="https://svelte.dev/repl/3a217c39932047a09f61d6425b04a7c3" stackblitz="src/site/Examples.md"
<script lang="ts">
  import MultiSelect from '$lib'
  import { colors } from '$site/options'
  import ColorSnippet from './ColorSnippet.svelte'

  let selected: string[] = $state([])
</script>

<form
  onsubmit={(event) => {
    event.preventDefault()
    alert(`You selected '${selected.join(`, `)}'`)
  }}
>
  <MultiSelect
    id="color-select"
    options={colors}
    bind:selected
    placeholder="Pick some colors..."
    allowUserOptions="append"
    required
  >
    {#snippet children({ idx, option })}
      <ColorSnippet {idx} {option} />
    {/snippet}
  </MultiSelect>
  <button>submit</button>
  (due to passing <code>required={true}</code> here, form submission will abort if
  Multiselect is empty)
  <p>
    Also sets
    <code>allowUserOptions="append"</code> to allow adding custom colors.
  </p>
</form>
```

<label for="countries">What country are you from? <span><code>minSelect=1</code> means no <code>x</code> button to remove the selected option</span></label>

```svelte example collapsible repl="https://svelte.dev/repl/4ff40862436e4bfbb2bd55d234352bb1" stackblitz="src/site/Examples.md"
<script lang="ts">
  import MultiSelect from '$lib'
  import { countries } from '$site/options'

  // required={1} means form validation will prevent submission if no option selected
  let maxOptions: number = $state(10)
</script>

<MultiSelect
  id="countries"
  options={countries}
  required={1}
  minSelect={1}
  maxSelect={1}
  {maxOptions}
  selected={[`Canada`]}
/>

<label>
  maxOptions <input type="range" min=0 max={30} bind:value={maxOptions}>
  {maxOptions} <small>(0 means no limit)</small>
</label>
```

<style>
  label {
    display: flex;
    margin: 1em 0 1ex;
    align-items: center;
    gap: 5pt;
    font-weight: normal;
  }
  label span {
    font-weight: 100;
    margin-left: 1em;
  }
</style>
