<script lang="ts">
  import type { Snippet } from 'svelte'
  import type { HTMLAttributes, HTMLDetailsAttributes } from 'svelte/elements'

  type File = {
    title: string
    content: string
    language?: string
    node?: HTMLDetailsElement | null
  }

  let {
    files = $bindable([]),
    toggle_all_btn_title = `Toggle all`,
    default_lang = `svelte`,
    as = `ol`,
    title_snippet,
    button_props,
    details_props,
    ...rest
  }: {
    files?: File[]
    toggle_all_btn_title?: string
    default_lang?: string
    as?: string
    title_snippet?: Snippet<[{ idx: number } & File]>
    button_props?: HTMLAttributes<HTMLButtonElement>
    details_props?: HTMLDetailsAttributes
  } & HTMLAttributes<HTMLOListElement> = $props()

  // Use reactive state for node refs to avoid binding_property_non_reactive warning
  let node_refs = $state<(HTMLDetailsElement | null)[]>([])

  // Trim stale refs when files shrink and sync node_refs back to files.node for external access
  $effect(() => {
    // Trim stale references when files array shrinks to prevent memory leaks
    if (node_refs.length > files.length) {
      node_refs.splice(files.length)
    }
    for (const [idx, node] of node_refs.entries()) {
      if (files[idx]) files[idx].node = node
    }
  })

  // Check if any nodes are open (for button text)
  const any_open = $derived(node_refs.some((node) => node?.open))

  function toggle_all() { // Read current DOM state fresh (can't use $derived any_open here - it may be stale)
    const should_close = node_refs.some((node) => node?.open)
    for (const node of node_refs) {
      if (!node) continue
      node.open = !should_close
    }
  }

  // Lazy-loaded syntax highlighter using starry-night (CSS already loaded in app.css)
  interface HastNode {
    type: string
    value?: string
    tagName?: string
    properties?: { className?: string[] }
    children?: HastNode[]
  }
  let highlighter: {
    highlight: (code: string, scope: string) => HastNode
    flagToScope: (flag: string) => string | undefined
  } | undefined
  const escape_html = (str: string): string =>
    str.replace(/&/g, `&amp;`).replace(/</g, `&lt;`).replace(/>/g, `&gt;`)
  const hast_to_html = (node: HastNode): string => {
    if (node.type === `text`) return escape_html(node.value ?? ``)
    if (node.type === `root`) return (node.children ?? []).map(hast_to_html).join(``)
    const cls = node.properties?.className?.join(` `)
    const attrs = cls ? ` class="${cls}"` : ``
    const inner = (node.children ?? []).map(hast_to_html).join(``)
    return `<${node.tagName}${attrs}>${inner}</${node.tagName}>`
  }
  async function highlight(code: string, lang: string): Promise<string> {
    if (!highlighter) {
      const { createStarryNight, common } = await import(`@wooorm/starry-night`)
      const source_svelte =
        (await import(`@wooorm/starry-night/source.svelte`)).default
      highlighter = await createStarryNight([...common, source_svelte])
    }
    const scope = highlighter.flagToScope(lang)
    if (!scope) return escape_html(code)
    return hast_to_html(highlighter.highlight(code, scope))
  }

  // Cache of highlighted HTML keyed by content+language
  let highlighted_cache = $state<Record<string, string>>({})
  $effect(() => {
    for (const file of files) {
      const lang = file.language ?? default_lang
      const key = `${lang}:${file.content}`
      if (!(key in highlighted_cache)) {
        highlight(file.content, lang).then(
          (html) => {
            highlighted_cache[key] = html
          },
          () => {}, // silently skip unsupported languages
        )
      }
    }
  })
</script>

{#if files?.length > 1}
  <button onclick={toggle_all} title={toggle_all_btn_title} {...button_props}>
    {any_open ? `Close` : `Open`} all
  </button>
{/if}

<svelte:element this={as} {...rest}>
  {#each files as file, idx (file.title)}
    {@const { title, content, language = default_lang } = file ?? {}}
    {@const cache_key = `${language}:${content}`}
    <li>
      <details bind:this={node_refs[idx]} {...details_props}>
        {#if title || title_snippet}
          <summary>
            {#if title_snippet}
              {@render title_snippet({ idx, ...file })}
            {:else}
              {@html title}
            {/if}
          </summary>
        {/if}

        <pre
          class="language-{language}"
        ><code>{#if highlighted_cache[cache_key]}{@html highlighted_cache[cache_key]}{:else}{content}{/if}</code></pre>
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
  pre {
    background: var(--pre-bg, light-dark(#f3f5f8, rgba(0, 0, 0, 0.3)));
  }
</style>
