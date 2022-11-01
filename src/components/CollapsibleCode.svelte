<script lang="ts">
  import hljs from 'highlight.js/lib/common'
  import 'highlight.js/styles/vs2015.css'
  import Collapsible from './Collapsible.svelte'

  export let code: string
</script>

<Collapsible title="View code">
  <pre><code>{@html hljs.highlight(code.trim(), { language: `html` }).value}</code></pre>
</Collapsible>
