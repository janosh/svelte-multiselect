<script lang="ts">
  import { FileDetails } from '$lib'
  import language_snippet_src from '$site/LanguageSnippet.svelte?raw'
  import options_src from '$site/options.ts?raw'
</script>

## Min/max number of selected options

`maxSelect={5}` prevents users from selecting more than 5 options.

```svelte example id="languages"
<script lang="ts">
  import MultiSelect from '$lib'
  import { languages } from '$site/options'
  import { LanguageSnippet } from '$site'
</script>

<MultiSelect
  options={languages}
  maxSelect={5}
  placeholder="What languages do you know?"
  minSelect={1}
  selected={['JavaScript']}
>
  {#snippet children({ option })}
    <LanguageSnippet {option} />
  {/snippet}
</MultiSelect>
```

<FileDetails files={[
{ title: `LanguageSnippet.svelte`, content: language_snippet_src },
{ title: `options.ts`, content: options_src },
]} />

When setting an integer value for `maxSelect` Multiselect will

- close options dropdown when reaching `maxSelect` items
- prevent users from selecting more options after reaching `maxSelect` items

<br />

`required={3}` means users have to pick at least 3 options before they can submit a form.

```svelte example
<script lang="ts">
  import MultiSelect from '$lib'

  function handle_submit(event: SubmitEvent) {
    const form_data = new FormData(event.target)
    alert('form data received by submit handler:\n' + JSON.stringify(...form_data))
  }
</script>

<form onsubmit={handle_submit}>
  <MultiSelect options={[1, 2, 3, 4, 5, 6]} required={3} name="numbers" sortSelected />
  <button>submit</button>
</form>
```

<br />

Of course, you can combine `maxSelect={n}` and `required={m}` where `n>=m`.

```svelte example
<script lang="ts">
  import MultiSelect from '$lib'

  function handle_submit(event: SubmitEvent) {
    const form_data = new FormData(event.target)
    alert('form data received by submit handler:\n' + JSON.stringify(...form_data))
  }
</script>

<form onsubmit={handle_submit}>
  <MultiSelect
    options={[1, 2, 3, 4, 5, 6]}
    required={2}
    maxSelect={3}
    name="numbers"
    sortSelected
  />
  <button>submit</button>
</form>
```

```svelte example
<script>
  // for https://github.com/janosh/svelte-multiselect/issues/249
  import MultiSelect from '$lib'

  const red_pill =
    `🔴  &ensp; Red Pill (<a href="https://wikipedia.org/wiki/Red_pill_and_blue_pill">what?</a>)`
  const blue_pill =
    `🔵  &ensp; Blue Pill &nbsp; <img height="35px" style="vertical-align: middle;" src="https://upload.wikimedia.org/wikipedia/en/a/ab/Morpheus.jpg" />`
  const options = [{ label: red_pill, value: `red pill`, preselected: true }, {
    label: blue_pill,
    value: `blue pill`,
  }]

  let value = $state(null)
</script>

<MultiSelect {options} maxSelect={1} parseLabelsAsHtml bind:value />
```
