<script lang="ts">
  import hljs from 'highlight.js/lib/common'
  import 'highlight.js/styles/vs2015.css'
  import store_src from '$site/stores.ts?raw'
</script>

## Page-Reload Persistent MultiSelect

`language_store` is a Svelte [`writable`](https://svelte.dev/docs/svelte/svelte-store#writable) that's bound to the browser's `sessionStorage`. This example shows how MultiSelect retains its `selected` state on page reload.

<br />

```svelte example stackblitz id="languages"
<script>
  import MultiSelect from '$lib'
  import { languages } from '$site/options'
  import { LanguageSnippet } from '$site'
  import { language_store } from '$site/stores'
</script>

<MultiSelect
  options={languages}
  placeholder="What languages do you know?"
  bind:selected={$language_store}
>
  {#snippet selectedItem({ idx, option })}
    <LanguageSnippet {option} {idx} />
  {/snippet}
</MultiSelect>
```

`language_store` uses custom initialization logic and a wrapper around `set` method to update `sessionStorage` on new values:

<pre><code>{@html hljs.highlight(store_src, { language: 'typescript' }).value}</code></pre>
