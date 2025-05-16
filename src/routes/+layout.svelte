<script lang="ts">
  import { afterNavigate, goto } from '$app/navigation'
  import { page } from '$app/state'
  import { CmdPalette } from '$lib'
  import { repository } from '$root/package.json'
  import { Footer } from '$site'
  import { demos } from '$site/stores'
  import { mount, type Snippet } from 'svelte'
  import Toc from 'svelte-toc'
  import { CopyButton, GitHubCorner } from 'svelte-zoo'
  import '../app.css'

  interface Props {
    children?: Snippet
  }
  let { children }: Props = $props()

  afterNavigate(() => {
    for (const node of document.querySelectorAll(`pre > code`)) {
      // skip if <pre> already contains a button (presumably for copy)
      const pre = node.parentElement
      if (!pre || pre.querySelector(`button`)) continue

      mount(CopyButton, {
        target: pre,
        props: {
          content: node.textContent ?? ``,
          style: `position: absolute; top: 1ex; right: 1ex;`,
        },
      })
    }
  })

  const routes = Object.keys(import.meta.glob(`./**/+page.{svx,svelte,md}`)).map(
    (filename) => {
      const parts = filename.split(`/`).filter((part) => !part.startsWith(`(`)) // remove hidden route segments
      return { route: `/${parts.slice(1, -1).join(`/`)}`, filename }
    },
  )

  if (routes.length < 3) {
    console.error(`Too few demo routes found: ${routes.length}`)
  }

  $demos = routes
    .filter(({ filename }) => filename.includes(`/(demos)/`))
    .map(({ route }) => route)

  const actions = routes.map(({ route }) => ({ label: route, action: () => goto(route) }))
</script>

<CmdPalette {actions} placeholder="Go to..." />

<GitHubCorner href={repository} />

{#if !page.error && page.url.pathname !== `/`}
  <a href="." aria-label="Back to index page">&laquo; home</a>
{/if}

{@render children?.()}

{#if [`/`, `/changelog`, `/contributing`].includes(page.url.pathname)}
  <Toc
    headingSelector="main > :where(h2, h3)"
    breakpoint={1250}
    --toc-mobile-bg="#1c0e3e"
    --toc-font-size="9pt"
    --toc-li-padding="3pt 1ex"
    --toc-mobile-btn-color="white"
    --toc-max-width="20em"
    --toc-desktop-nav-margin="0 0 0 17em"
  />
{/if}

<Footer />

<style>
  a[href='.'] {
    font-size: 15pt;
    position: absolute;
    top: 2em;
    left: 2em;
    background-color: rgba(255, 255, 255, 0.1);
    padding: 1pt 5pt;
    border-radius: 3pt;
    transition: 0.2s;
  }
  a[href='.']:hover {
    background-color: rgba(255, 255, 255, 0.2);
  }
</style>
