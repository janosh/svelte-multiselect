<script lang="ts">
  import { browser } from '$app/environment'
  import { goto } from '$app/navigation'
  import { base } from '$app/paths'
  import { page } from '$app/state'
  import { CopyButton, GitHubCorner, PagefindPalette, slug_to_title } from '$lib'
  import { name, repository } from '$root/package.json'
  import { DemoNav, Footer } from '$site'
  import favicon from '$site/favicon.svg'
  import type { Snippet } from 'svelte'
  import { Toc } from 'svelte-toc'
  // eslint-disable-next-line import/no-unassigned-import -- global route styles
  import '../app.css'
  import { routes } from './(demos)'

  let { children }: { children?: Snippet<[]> } = $props()
  let toc_desktop = $state(true)

  const actions = routes.map(({ route }) => ({
    label: route,
    action: () => goto(`${base}${route}`),
  }))
  const is_home = $derived(page.route.id === `/`)
  const page_title = $derived.by(() => {
    const route_slug = page.url.pathname
      .split(`/`)
      .findLast(Boolean)
      ?.replace(/\.html$/, ``)
    return is_home || !route_slug ? `Svelte MultiSelect` : slug_to_title(route_slug)
  })

  if (browser) {
    const saved_theme = localStorage.getItem(`theme`)
    let effective_theme = saved_theme
    if (effective_theme !== `light` && effective_theme !== `dark`) {
      effective_theme = matchMedia(`(prefers-color-scheme: dark)`).matches
        ? `dark`
        : `light`
    }
    document.documentElement.style.colorScheme = effective_theme
    document.documentElement.dataset.theme = effective_theme
  }
</script>

<svelte:head>
  <title>{page_title}</title>
  <meta data-pagefind-meta="title[content]" content={page_title} />
  <link rel="icon" href={favicon} />
</svelte:head>

{#if !is_home}
  <h1>
    <img src={favicon} alt={name} height="50" width="50" />&ensp;Svelte MultiSelect
  </h1>
  <DemoNav --nav-item-padding="1pt 4pt" />
{/if}

<PagefindPalette
  fallback_actions={actions}
  navigate={goto}
  strip_html_suffix
  pagefind_path={`${base}/pagefind/pagefind.js`}
/>

<GitHubCorner href={repository} />

<CopyButton global global_selector="pre:not(li > pre) > code" />

<div data-pagefind-body style="display: contents">
  {@render children?.()}
</div>

{#if is_home}
  <Toc
    headingSelector="main > :where(h2, h3)"
    breakpoint={1500}
    bind:desktop={toc_desktop}
    asideProps={{
      style: toc_desktop
        ? `position: fixed; right: 2em; font-size: 0.7rem; max-width: 17rem;`
        : ``,
    }}
    openButtonProps={{ style: `display: flex; padding: 3px;` }}
    --toc-mobile-bg="light-dark(#fff, #222226)"
    --toc-padding="1em 0 1em 1em"
    --toc-active-color="var(--accent)"
  />
{/if}

<Footer />
