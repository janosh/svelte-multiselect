<script lang="ts">
  // import hljs from 'highlight.js/lib/common'
  // import 'highlight.js/styles/vs2015.css'
  // import server_code from './+page.server.ts?raw'
</script>

## Hook up Multiselect to SvelteKit form action incl. form validation

This example shows the SvelteKit form action way of handling MultiSelect fields in form submission events. If you're not interested in [progressively enhanced forms](https://kit.svelte.dev/docs/form-actions#progressive-enhancement) (i.e. supporting no-JS browsers) take a look at the [JS form example](form) instead.

> Note that this example will only work when running the dev server locally since it needs
> a server to respond to the form's POST request and this documentation site is only static
> HTML.

```svelte example
<script lang="ts">
  import MultiSelect from '$lib'
  import { ColorSnippet } from '$site'
  import { colors } from '$site/options'
  import { repository } from '$root/package.json'
  import type { ActionData } from './$types'

  let { form }: { form: ActionData } = $props()

  let err_msg = $derived(
    {
      json: 'The email field is required',
      array: 'The email field is required',
      boring: 'Boring answer!',
    }[form?.error as string],
  )
</script>

<form method="POST" action="?/validate-form">
  <label for="colors">
    <strong>Which colors would you pick for the Martian flag?</strong>
  </label>
  <MultiSelect
    options={colors}
    placeholder="Pick some colors..."
    name="colors"
    required
    invalid={!!form?.error}
    selected={form?.colors ?? [`Red`]}
  >
    {#snippet children({ idx, option })}
      <ColorSnippet {idx} {option} />
    {/snippet}
  </MultiSelect>
  <button>Submit</button>
  <small>
    select some options, then click submit to see what data MultiSelect sends to a form
    submit handler
  </small>
  {#if err_msg}
    <p class="error">{err_msg}</p>
  {/if}
  {#if form?.success}
    <p class="success">
      Good answer! You entered
      {#each form.colors as color}
        <ColorSnippet
          option={color}
          style="display: inline-flex; vertical-align: middle; margin: 0 0 0 1ex"
        />
      {/each}
    </p>
  {/if}
</form>

<style>
  form {
    background-color: rgba(255, 255, 255, 0.1);
    padding: 1ex 1em;
    margin: 2em auto;
    border-radius: 3pt;
  }
  p {
    margin: 1em 0 1ex;
  }
  p.error {
    color: red;
  }
  p.success {
    width: max-content;
    padding: 1pt 6pt;
    box-sizing: border-box;
    color: lightgreen;
    border: 1px solid;
    border-radius: 3pt;
  }
</style>
```

### +page.server.ts

The above code needs to be in a `+page.svelte` file with the following `+page.server.ts` file in the same directory next to it.

```ts
import { invalid } from '@sveltejs/kit'

export const actions = {
  'validate-form': async ({ request }) => {
    const data = await request.formData()
    let colors = data.get(`colors`)

    try {
      colors = JSON.parse(colors)
    } catch (err) {
      return invalid(400, { colors, error: `json` })
    }

    if (!Array.isArray(colors)) {
      return invalid(400, { colors, error: `array` })
    }
    if (colors.length === 1 && colors[0] === `Red`) {
      return invalid(400, { colors, error: `boring` })
    }

    return { colors, success: true }
  },
}
```
