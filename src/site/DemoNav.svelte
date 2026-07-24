<script lang="ts">
  import { resolve } from '$app/paths'
  import { page } from '$app/state'
  import type { Pathname } from '$app/types'
  import { Nav, ThemeToggle } from '$lib'
  import type { ComponentProps } from 'svelte'
  import { demo_nav_routes } from '../routes/(demos)'

  let props: Partial<ComponentProps<typeof Nav>> = $props()

  const resolve_path = resolve as (path: Pathname) => string
  const prefixed_routes = [`/` as Pathname, ...demo_nav_routes].map((route) =>
    typeof route === `string`
      ? resolve_path(route)
      : {
          ...route,
          href: resolve_path(route.href),
          children: route.children.map(resolve_path),
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
    [resolve_path(`/`)]: `Home`,
    [resolve_path(`/ui`)]: `UI`,
    [resolve_path(`/css-classes`)]: `CSS Classes`,
    [resolve_path(`/kit-form-actions`)]: `Form Actions`,
    [resolve_path(`/command-menu`)]: `CommandMenu`,
    [resolve_path(`/min-max-select`)]: `Min/Max`,
    [resolve_path(`/input-dropdown`)]: `Input Dropdown`,
    [resolve_path(`/allow-user-options`)]: `User Options`,
    [resolve_path(`/sort-selected`)]: `Sort Selected`,
    [resolve_path(`/keep-selected`)]: `Keep Selected`,
    [resolve_path(`/parse-labels-as-html`)]: `HTML Labels`,
    [resolve_path(`/infinite-scroll`)]: `Infinite Scroll`,
    ...(props.labels ?? {}),
  }}
>
  <ThemeToggle style="margin-left: 6pt" />
</Nav>
