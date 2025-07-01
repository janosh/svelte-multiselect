<script>
  import hljs from 'highlight.js/lib/common'
  import 'highlight.js/styles/vs2015.css'
  import cmd_palette_src from '$lib/CmdPalette.svelte?raw'
</script>

## Nav Palette

You can use `<MultiSelect />` to build a navigation palette in just 70 lines of code (50 without styles).

```svelte stackblitz id="disabled-input-title"
<script>
  import { goto } from '$app/navigation'
  import { CmdPalette } from '$lib'

  const actions = Object.keys(import.meta.glob(`./**/+page.{svx,svelte,md}`)).map(
    (filename) => {
      const parts = filename.split(`/`).filter((part) => !part.startsWith(`(`)) // remove hidden route segments

      const route = `/${parts.slice(1, -1).join(`/`)}`

      return { label: route, action: () => goto(route) }
    },
  )
</script>

<CmdPalette {actions} />
```

Here's `<CmdPalette />` component

<pre><code>{@html hljs.highlight(cmd_palette_src, { language: 'typescript' }).value}</code></pre>
