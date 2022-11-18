<script lang="ts">
  import type { ObjectOption } from '$lib'
  import MultiSelect from '$lib'
  import { colors, countries, frontend_libs, languages, ml_libs } from '../options'
  import { language_store, country_store } from '../stores'
  import CollapsibleCode from './CollapsibleCode.svelte'
  import ColorSlot from './ColorSlot.svelte'
  import Confetti from './Confetti.svelte'
  import LanguageSlot from './LanguageSlot.svelte'
  import RepoSlot from './RepoSlot.svelte'

  let selected_ml: string[]
  let selected_colors = [`red`, `orange`, `yellow`]

  let show_confetti = false

  const frontend_libs_filter_func = (op: ObjectOption, searchText: string) => {
    if (!searchText) return true
    const [label, lang, searchStr] = [op.label, op.lang, searchText].map((s) =>
      `${s}`.toLowerCase()
    )
    return label.includes(searchStr) || lang.includes(searchStr)
  }

  let loading = false
  let searchText = ``
  $: if (searchText) {
    loading = true
    setTimeout(() => (loading = false), 1000)
  }
</script>

<h2>Examples</h2>

<section>
  <h3>Multi Select</h3>

  <pre>bind:selected = {JSON.stringify($language_store)}</pre>

  <label for="languages">Favorite programming languages?</label>

  <MultiSelect
    id="languages"
    options={languages}
    placeholder="Take your pick..."
    bind:selected={$language_store}
  >
    <LanguageSlot let:option {option} slot="selected" />
    <LanguageSlot let:option {option} slot="option" />
  </MultiSelect>
  <CollapsibleCode
    repl_url="https://svelte.dev/repl/e3b88f59f62b498d943ecf7756ab75d7"
    code={`
<pre>bind:selected = {JSON.stringify($language_store)}</pre>

<label for="languages">Favorite programming languages?</label>

<MultiSelect
  id="languages"
  options={languages}
  placeholder="Take your pick..."
  bind:selected={$language_store}
>
  <LanguageSlot let:option {option} slot="selected" />
  <LanguageSlot let:option {option} slot="option" />
</MultiSelect>`}
  />
</section>

<section>
  <h3>Single Select</h3>

  <p>with loading indicator on text input</p>

  <pre>selected = {JSON.stringify(selected_ml)}</pre>

  <label for="fav-ml-tool">Favorite machine learning framework?</label>

  <MultiSelect
    id="fav-ml-tool"
    maxSelect={1}
    maxSelectMsg={(current, max) => `${current} of ${max} selected`}
    options={ml_libs}
    bind:selected={selected_ml}
    bind:searchText
    placeholder="Favorite machine learning framework?"
    {loading}
  />
  <CollapsibleCode
    repl_url="https://svelte.dev/repl/79e22e1905c94456aa21564b4d5f8759"
    code={`
<pre>selected = {JSON.stringify(selected_ml)}</pre>

<label for="fav-ml-tool">Favorite machine learning framework?</label>

<MultiSelect
  id="fav-ml-tool"
  maxSelect={1}
  maxSelectMsg={(current, max) => \`\${current} of \${max} selected\`}
  options={ml_libs}
  bind:selected={selected_ml}
  bind:searchText
  placeholder="Favorite machine learning framework?"
  {loading}
/>
`}
  />
</section>

<section>
  <h3>Chance of Confetti</h3>

  <label for="confetti-select">Callback on item selection</label>

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
    <RepoSlot let:idx {idx} let:option {option} slot="option" />
  </MultiSelect>
  {#if show_confetti}
    <Confetti />
  {/if}

  <CollapsibleCode
    repl_url="https://svelte.dev/repl/516279bd62ec424986115263c2cdc169"
    code={`
<label for="confetti-select">Callback on item selection</label>

<MultiSelect
  id="confetti-select"
  options={frontend_libs}
  maxSelect={4}
  placeholder="Favorite web framework?"
  filterFunc={frontend_libs_filter_func}
  on:add={(e) => {
    if (e.detail.option.label === 'Svelte') {
      show_confetti = true
      setTimeout(() => (show_confetti = false), 3000)
    }
  }}
>
  <RepoSlot let:idx {idx} let:option {option} slot="option" />
</MultiSelect>
{#if show_confetti}
  <Confetti />
{/if}
`}
  />
</section>

<section>
  <h3>Slot Components</h3>

  <label for="color-select">
    Color select using the <code>'selected'</code> and <code>'option'</code> slot components
    to render colors.
  </label>
  <form
    on:submit|preventDefault={() => {
      alert(`You selected '${selected_colors.join(`, `)}'`)
    }}
  >
    <MultiSelect
      id="color-select"
      options={colors}
      bind:selected={selected_colors}
      placeholder="Pick some colors..."
      allowUserOptions="append"
      required
    >
      <ColorSlot let:idx {idx} let:option {option} slot="selected" />
      <ColorSlot let:idx {idx} let:option {option} slot="option" />
    </MultiSelect>
    <button>submit</button>
    (due to passing <code>required={true}</code> here, form submission will abort if
    Multiselect is empty)
    <p>
      Also sets
      <code>allowUserOptions="append"</code> to allow adding custom colors.
    </p>
  </form>
  <CollapsibleCode
    repl_url="https://svelte.dev/repl/3a217c39932047a09f61d6425b04a7c3"
    code={`
<label for="color-select">
  Color select using the \`selected\` and \`option\` slot components to render colors.
</label>

<form on:submit|preventDefault={() => {alert('You selected "\${selected_colors.join(', ')}"')}}>

  <MultiSelect
  id="color-select"
  options={colors}
  bind:selected={selected_colors}
  placeholder="Pick some colors..."
  allowUserOptions="append"
  required
>
  <ColorSlot let:idx {idx} let:option {option} slot="selected" />
  <ColorSlot let:idx {idx} let:option {option} slot="option" />
</MultiSelect>

<button style="border: none; border-radius: 1pt; margin: 5pt 5pt 8pt 0;">
  submit
</button>
`}
  />
</section>

<section>
  <h3><code>minSelect</code></h3>

  <p>
    Note the missing remove <code>x</code> button behind the selected option due to
    <code>minSelect=1</code>
  </p>

  <label for="countries">What country are you from?</label>

  <MultiSelect
    id="countries"
    options={countries}
    required={1}
    minSelect={1}
    maxSelect={1}
    bind:selected={$country_store}
  />
  <CollapsibleCode
    repl_url="https://svelte.dev/repl/55257560b40346f3bc127d7adb944372"
    code={`
<label for="countries">What country are you from?</label>

<MultiSelect
  id="countries"
  options={countries}
  required={1}
  minSelect={1}
  maxSelect={1}
  bind:selected={$country_store}
/>`}
  />
</section>

<!-- <section>
  <h3>Very long Multi Select</h3>

  <label for="octicons">List of GitHub's Octicons</label>

  <MultiSelect
    id="octicons"
    options={octicons}
    placeholder="Take your pick..."
    maxSelect={20}
    maxSelectMsg={(current, max) =>
      current == max ? `Hold your horses!` : `${current} of ${max}`}
  >
    <IconifySlotSlot let:option {option} slot="selected" />
    <IconifySlotSlot let:option {option} slot="option" />
  </MultiSelect>
</section> -->
<style>
  section {
    margin-bottom: 2em;
    background-color: #28154b;
    border-radius: 4pt;
    padding: 1pt 10pt;
    position: relative;
  }
  section h3 {
    margin: 5pt 0 10pt;
  }
  section p {
    margin: 5pt 0;
  }
  pre {
    white-space: pre-wrap;
    padding: 7pt 1em;
    font-size: 1em;
    word-break: break-word;
  }
</style>
