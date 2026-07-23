<script lang="ts">
  import { base } from '$app/paths'
  import { page } from '$app/state'
  import { Nav, ThemeToggle } from '$lib'
  import type { NavRoute } from '$lib/types'
  import type { ComponentProps } from 'svelte'

  let props: Partial<ComponentProps<typeof Nav>> = $props()

  // NOTE: Update this list when adding/removing demo pages in src/routes/(demos)/
  const grouped_routes = [
    `/`,
    {
      href: `/basics`,
      label: `Basics`,
      children: [`/basics`, `/form`, `/events`, `/disabled`],
    },
    {
      href: `/selection`,
      label: `Selection`,
      children: [
        `/selection`,
        `/min-max-select`,
        `/input-dropdown`,
        `/duplicates`,
        `/sort-selected`,
        `/keep-selected`,
        `/allow-user-options`,
        `/history`,
      ],
    },
    {
      href: `/styling`,
      label: `Styling`,
      children: [
        `/styling`,
        `/ui`,
        `/css-classes`,
        `/snippets`,
        `/parse-labels-as-html`,
        `/portal`,
      ],
    },
    {
      href: `/data`,
      label: `Data`,
      children: [`/data`, `/grouping`, `/infinite-scroll`],
    },
    {
      href: `/integration`,
      label: `Integration`,
      children: [`/integration`, `/kit-form-actions`, `/persistent`, `/attachments`],
    },
    {
      href: `/components`,
      label: `Components`,
      children: [`/components`, `/nav`, `/cmd-palette`],
    },
  ] satisfies NavRoute[]
  const add_base = (path: string): string => `${base}${path}`
  const prefixed_routes = grouped_routes.map((route) =>
    typeof route === `string`
      ? add_base(route)
      : {
          ...route,
          href: add_base(route.href),
          children: route.children?.map(add_base),
        },
  )

  const base_style = `max-width: var(--main-max-width); --nav-item-padding: 2pt 4pt; --nav-link-active-color: var(--accent); `
</script>

<Nav
  {...props}
  routes={prefixed_routes}
  {page}
  style={base_style + (props.style ?? ``)}
  menu_props={{ style: `gap: 10pt` }}
  labels={{
    [add_base(`/`)]: `Home`,
    [add_base(`/ui`)]: `UI`,
    [add_base(`/css-classes`)]: `CSS Classes`,
    [add_base(`/kit-form-actions`)]: `Form Actions`,
    [add_base(`/cmd-palette`)]: `CmdPalette`,
    [add_base(`/min-max-select`)]: `Min/Max`,
    [add_base(`/input-dropdown`)]: `Input Dropdown`,
    [add_base(`/allow-user-options`)]: `User Options`,
    [add_base(`/sort-selected`)]: `Sort Selected`,
    [add_base(`/keep-selected`)]: `Keep Selected`,
    [add_base(`/parse-labels-as-html`)]: `HTML Labels`,
    [add_base(`/infinite-scroll`)]: `Infinite Scroll`,
    ...(props.labels ?? {}),
  }}
>
  <ThemeToggle style="margin-left: 6pt" />
</Nav>
