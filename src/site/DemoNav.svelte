<script lang="ts">
  import { resolve } from '$app/paths'
  import { page } from '$app/state'
  import type { Pathname } from '$app/types'
  import { Nav, ThemeToggle } from '$lib'
  import type { ComponentProps } from 'svelte'
  import { demo_labels, demo_nav_routes } from '../routes/(demos)'

  let props: Partial<ComponentProps<typeof Nav>> = $props()

  const resolve_path = resolve as (path: Pathname) => string
  const prefixed_routes = [`/` as Pathname, ...demo_nav_routes].map((route) =>
    typeof route === `string`
      ? resolve_path(route)
      : {
          ...route,
          href: resolve_path(route.href),
          // single-page groups carry no children, see routes/(demos)/index.ts
          ...(route.children && { children: route.children.map(resolve_path) }),
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
    ...Object.fromEntries(
      Object.entries(demo_labels).map(([route, label]) => [
        resolve_path(route as Pathname),
        label,
      ]),
    ),
    ...(props.labels ?? {}),
  }}
>
  <ThemeToggle style="margin-left: 6pt" />
</Nav>
