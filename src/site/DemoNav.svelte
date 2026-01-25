<script lang="ts">
  import { page } from '$app/state'
  import { Nav } from '$lib'
  import type { NavRoute } from '$lib/types'
  import type { ComponentProps } from 'svelte'

  let props: Partial<ComponentProps<typeof Nav>> = $props()

  // NOTE: Update this list when adding/removing demo pages in src/routes/(demos)/
  const grouped_routes: NavRoute[] = [
    `/`,
    {
      href: `#basics`,
      label: `Basics`,
      children: [`/form`, `/events`, `/disabled`],
    },
    {
      href: `#selection`,
      label: `Selection`,
      children: [
        `/min-max-select`,
        `/duplicates`,
        `/sort-selected`,
        `/keep-selected`,
        `/allow-user-options`,
        `/history`,
      ],
    },
    {
      href: `#styling`,
      label: `Styling`,
      children: [
        `/ui`,
        `/css-classes`,
        `/snippets`,
        `/parse-labels-as-html`,
        `/portal`,
      ],
    },
    {
      href: `#data`,
      label: `Data`,
      children: [`/grouping`, `/infinite-scroll`],
    },
    {
      href: `#integration`,
      label: `Integration`,
      children: [`/kit-form-actions`, `/persistent`, `/attachments`],
    },
    {
      href: `#components`,
      label: `Components`,
      children: [`/nav`, `/cmd-palette`],
    },
  ]

  const base_style =
    `max-width: var(--main-max-width); --nav-link-bg: rgba(0, 0, 0, 0.05); --nav-item-padding: 2pt 4pt; `
</script>

<Nav
  {...props}
  routes={grouped_routes}
  {page}
  style={base_style + (props.style ?? ``)}
  menu_props={{ style: `gap: 10pt` }}
  labels={{
    '/': `Home`,
    '/ui': `UI`,
    '/css-classes': `CSS Classes`,
    '/kit-form-actions': `Form Actions`,
    '/cmd-palette': `CmdPalette`,
    '/min-max-select': `Min/Max`,
    '/allow-user-options': `User Options`,
    '/sort-selected': `Sort Selected`,
    '/keep-selected': `Keep Selected`,
    '/parse-labels-as-html': `HTML Labels`,
    '/infinite-scroll': `Infinite Scroll`,
    ...(props.labels ?? {}),
  }}
/>
