<script lang="ts">
  import { page } from '$app/state'
  import { Nav } from '$lib'
  import type { NavRoute } from '$lib/types'

  let props = $props()

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
</script>

<Nav
  {...props}
  routes={grouped_routes}
  {page}
  style={`max-width: var(--main-max-width); --nav-link-bg: rgba(0, 0, 0, 0.05); --nav-item-padding: 2pt 4pt; ${
    props.style ?? ``
  }`}
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
