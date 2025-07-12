<script lang="ts">
  // import hljs from 'highlight.js'
  // import 'highlight.js/styles/vs2015.css'
  import type { Snippet } from 'svelte'

  type File = {
    title: string
    content: string
    language?: string
    node?: HTMLDetailsElement | null
  }

  interface Props {
    files?: File[]
    toggle_all_btn_title?: string
    default_lang?: string
    as?: string
    style?: string | null
    title_snippet?: Snippet<[{ idx: number } & File]>
  }
  let {
    files = $bindable([]),
    toggle_all_btn_title = `Toggle all`,
    default_lang = `typescript`,
    as = `ol`,
    style = null,
    title_snippet,
  }: Props = $props()

  function toggle_all() {
    const any_open = files.some((file) => file.node?.open)
    for (const file of files) {
      if (!file.node) continue
      file.node.open = !any_open
    }
  }
</script>

{#if files?.length > 1}
  <button onclick={toggle_all} title={toggle_all_btn_title}>
    {files.some((file) => file.node?.open) ? `Close` : `Open`} all
  </button>
{/if}

<svelte:element this={as} {style}>
  {#each files as file, idx (file.title)}
    {@const { title, content, language = default_lang } = file ?? {}}
    <li>
      <!-- https://github.com/sveltejs/svelte/issues/12721#issuecomment-2269544690 -->
      <details bind:this={file.node}>
        {#if title || title_snippet}
          <summary>
            {#if title_snippet}
              {@render title_snippet({ idx, ...file })}
            {:else}
              {@html title}
            {/if}
          </summary>
        {/if}

        <pre class="language-{language}"><code>{content}</code></pre>
        <!-- <pre><code>{@html hljs.highlight(content, { language }).value}</code></pre> -->
      </details>
    </li>
  {/each}
</svelte:element>

<style>
  button {
    float: right;
  }
  ol {
    padding: 0;
  }
  ol > li {
    margin: 1ex 0;
  }
</style>
