<script lang="ts">
  // see svelte.config.js where this component is passed to live-examples remark plugin
  import type { Snippet } from 'svelte'
  import type { HTMLAttributes } from 'svelte/elements'
  import Icon from './Icon.svelte'
  import type { IconName } from './icons'

  let {
    src = ``,
    meta = {},
    open = $bindable(!meta.collapsible),
    title,
    example,
    code,
    link_props, // Applied after computed attributes (href, title, etc.), allowing override
    button_props,
  }: {
    // src+meta are passed in by live-examples remark plugin
    src?: string // code fence content, sadly without indentation so we prefer node?.innerText below
    meta?: {
      // code fence metadata
      collapsible?: boolean // whether to show a button to expand/collapse the code
      code_above?: boolean // whether to show the code above the example (default: true when collapsible, false otherwise)
      id?: string // id of the <div> wrapping the code and example (e.g. to write very specific testing selectors)
      repl?: string // Svelte REPL URL
      github?: string | boolean // GitHub URL or true to link to the file serving the current page
      repo?: string // GitHub repo URL
      Wrapper?: string // Svelte component to wrap the example
      example?: boolean
      file?: string
      filename?: string // path of the file serving the current page (set by mdsvex transform)
      lang?: string
    }
    open?: boolean
    title?: Snippet<[]>
    example?: Snippet<[]>
    code?: Snippet<[]>
    link_props?: HTMLAttributes<HTMLAnchorElement>
    button_props?: HTMLAttributes<HTMLButtonElement>
  } = $props()

  let { id, collapsible, repl, github, repo, file, filename, lang } = $derived(meta)
  let code_above = $derived(meta.code_above ?? collapsible) // if code is collapsed, render code above example by default
  // mdsvex transform emits the current page's path as meta.filename, so fall back
  // to it when meta.file is unset (github: true is documented to link there)
  let github_file = $derived(file ?? filename)
  let external_links: { cond: unknown; href?: string; icon: IconName }[] = $derived([
    { cond: repl, href: repl, icon: `Svelte` },
    {
      cond: github && repo,
      href:
        github && github_file
          ? `${repo}/blob/-/${github === true ? github_file : github}`
          : repo,
      icon: `GitHub`,
    },
  ])
  const links = { target: `_blank`, rel: `noreferrer` }
</script>

<nav>
  {#each external_links as { cond, href, icon } (icon)}
    <a
      {href}
      {...links}
      title={icon}
      style:display={cond ? `inline-block` : `none`}
      {...link_props}
    >
      <Icon {icon} />
    </a>
  {/each}
  {#if collapsible}
    {@render title?.()}
    <button onclick={() => (open = !open)} {...button_props}>
      <Icon icon={open ? `Collapse` : `Expand`} />
      {open ? `Close` : `View code`}
    </button>
  {/if}
</nav>
<!-- wrap in div with id for precise CSS selectors in playwright E2E tests -->
<div {id} class="code-example" class:code-above={code_above}>
  {@render example?.()}
  <pre class:open>{#if lang}<span class="lang-label">{lang}</span>{/if}<code
      >{#if code}{@render code()}{:else}{src}{/if}</code
    ></pre>
</div>

<style>
  div.code-example {
    display: flex;
    flex-direction: column;
    margin: var(--code-example-margin, 1em auto);
    position: relative;
  }
  div.code-example.code-above > pre {
    order: -1;
  }
  nav {
    display: flex;
    justify-content: end;
    align-items: center;
    margin: var(--code-example-nav-margin, initial);
    gap: var(--code-example-nav-gap, 1ex);
  }
  pre code {
    background-color: transparent;
    display: inline-block;
  }
  pre {
    position: relative;
    overflow: hidden;
    max-height: 0;
    opacity: 0;
    padding: 0 1em;
    margin: 0;
    transition-property: max-height, opacity, padding, margin;
    transition-duration: var(--code-example-pre-transition-duration, 0.3s);
    transition-timing-function: ease;
    border-radius: var(--code-example-pre-border-radius, 4pt);
    background-color: var(--code-example-pre-bg, var(--pre-bg));
  }
  pre.open {
    opacity: 1;
    max-height: var(--code-example-pre-max-height, 80vh);
    overflow-x: auto;
    overflow-y: auto;
    padding: var(--code-example-pre-padding, 1ex 1em);
    margin: var(--code-example-pre-margin, 1em 0 0 0);
  }
  .code-above > pre.open {
    margin: var(--code-example-pre-margin, 0 0 1em 0);
  }
  /* the label is emitted inline before <code>; pre is white-space: pre, so it
  must be taken out of flow or it indents the first code line */
  .lang-label {
    position: absolute;
    bottom: 2px;
    right: 6px;
    font-size: 0.65rem;
    opacity: 0.35;
    text-transform: uppercase;
    pointer-events: none;
    user-select: none;
    line-height: 1;
  }
</style>
