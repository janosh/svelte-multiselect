# Nav Component

Flexible, accessible navigation with dropdown support, mobile burger menu, and keyboard navigation.

## Features

- 🎯 Responsive with automatic mobile burger menu (&lt; 768px)
- ⌨️ Full keyboard navigation (Enter/Space/Arrows/Escape)
- ♿ Proper ARIA attributes and focus management
- 🎨 Customizable via CSS variables and props

## Basic Usage

```svelte example collapsible
<script>
  import { Nav } from '$lib'
  import { page } from '$app/state'

  const routes = ['/', '/about', '/contact', '/blog']
  const link_props = { onclick: (e) => e.preventDefault() }
</script>

<Nav {routes} {page} {link_props} />
```

## Custom Labels

```svelte example collapsible
<script>
  import { Nav } from '$lib'
  import { page } from '$app/state'

  const link_props = { onclick: (e) => e.preventDefault() }
</script>

<Nav
  routes={['/ui', '/css-classes', '/kit-form-actions']}
  labels={{
    '/ui': 'UI Components',
    '/css-classes': 'CSS Classes',
    '/kit-form-actions': 'Form Actions',
  }}
  {page}
  {link_props}
/>
```

## Dropdown Menus

Use tuple syntax `[parent, [children...]]` for nested routes:

```svelte example collapsible
<script>
  import { Nav } from '$lib'
  import { page } from '$app/state'

  const routes = [
    '/',
    ['/docs', ['/docs', '/docs/api', '/docs/examples', '/docs/guides']],
    ['/products', ['/products/item-1', '/products/item-2', '/products/item-3']],
    '/about',
  ]
  const link_props = { onclick: (e) => e.preventDefault() }
</script>

<Nav {routes} {page} {link_props} />
```

**Dropdown without parent page:** When the parent route doesn't exist (e.g., no `/help` page), the trigger becomes a `<span>` instead of a link:

```svelte example collapsible
<script>
  import { Nav } from '$lib'
  import { page } from '$app/state'

  const routes = [
    '/',
    ['/help', ['/help/faq', '/help/support', '/help/contact']],
    '/about',
  ]
  const link_props = { onclick: (e) => e.preventDefault() }
</script>

<Nav {routes} {page} {link_props} />
```

## Keyboard Navigation

- **Tab**: Navigate between items
- **Enter/Space**: Open dropdown or follow link
- **Arrow Down/Up**: Navigate dropdown items
- **Escape**: Close menus

## Custom Link Rendering

Use the `link` snippet to customize link rendering:

```svelte example collapsible
<script>
  import { Nav } from '$lib'
  import { page } from '$app/state'

  const routes = ['/', '/about', '/contact']
  const link_props = { onclick: (e) => e.preventDefault() }
</script>

<Nav {routes} {page} {link_props}>
  {#snippet link({ href, label })}
    <a {href} onclick={(e) => e.preventDefault()}>🔗 {label}</a>
  {/snippet}
</Nav>
```

## Custom Children

Add extra content to the nav menu:

```svelte example collapsible
<script>
  import { Nav } from '$lib'
  import { page } from '$app/state'

  const routes = ['/', '/about', '/contact', '/blog']
  const link_props = { onclick: (e) => e.preventDefault() }
</script>

<Nav {routes} {page} {link_props}>
  {#snippet children({ is_open })}
    <button
      style="padding: 4pt 12pt; background: var(--sms-selected-bg, mediumseagreen); border: none; border-radius: 6px; color: white; cursor: pointer"
      onclick={() => alert('Custom action!')}
    >
      ⚡ Action
    </button>
    {#if is_open}
      <span style="opacity: 0.6; font-size: 0.85em">(menu open)</span>
    {/if}
  {/snippet}
</Nav>
```

## Object Route Format

For more control, use the object format with all available properties:

```svelte example collapsible
<script>
  import { Nav } from '$lib'
  import { page } from '$app/state'

  const routes = [
    { href: '/', label: 'Home' },
    {
      href: '/docs',
      label: 'Documentation',
      children: ['/docs/api', '/docs/guides'],
    },
    { href: '/admin', label: 'Admin', disabled: 'Login required' },
    { separator: true },
    { href: '/settings', align: 'right' },
    {
      href: 'https://github.com/janosh/svelte-multiselect',
      label: 'GitHub',
      external: true,
      align: 'right',
    },
  ]
  const link_props = { onclick: (e) => e.preventDefault() }
</script>

<Nav {routes} {page} {link_props} />
```

### Route Object Properties

| Property    | Type                | Description                               |
| ----------- | ------------------- | ----------------------------------------- |
| `href`      | `string`            | Required. The link URL                    |
| `label`     | `string`            | Custom label (default: derived from href) |
| `children`  | `string[]`          | Sub-routes for dropdown menu              |
| `disabled`  | `boolean \| string` | Disable item; string shows as tooltip     |
| `separator` | `boolean`           | Render visual divider after this item     |
| `align`     | `'left' \| 'right'` | Item alignment (default: left)            |
| `external`  | `boolean`           | Add `target="_blank" rel="noopener"`      |
| `class`     | `string`            | Custom CSS class                          |
| `style`     | `string`            | Custom inline styles                      |

## Disabled Routes

Disable routes with `disabled: true` or a tooltip message:

```svelte example collapsible
<script>
  import { Nav } from '$lib'
  import { page } from '$app/state'

  const routes = [
    { href: '/' },
    { href: '/premium', disabled: true },
    { href: '/beta', disabled: 'Coming soon!' },
    { href: '/about' },
  ]
  const link_props = { onclick: (e) => e.preventDefault() }
</script>

<Nav {routes} {page} {link_props} />
```

## Separators

Add visual dividers between navigation groups:

```svelte example collapsible
<script>
  import { Nav } from '$lib'
  import { page } from '$app/state'

  const routes = [
    { href: '/' },
    { href: '/docs' },
    { separator: true },
    { href: '/settings' },
    { href: '/logout', separator: true },
    { href: '/help' },
  ]
  const link_props = { onclick: (e) => e.preventDefault() }
</script>

<Nav {routes} {page} {link_props} />
```

## External Links

Mark links as external to open in new tabs with proper security attributes:

```svelte example collapsible
<script>
  import { Nav } from '$lib'
  import { page } from '$app/state'

  const routes = [
    { href: '/' },
    { href: 'https://github.com', label: 'GitHub', external: true },
    { href: 'https://svelte.dev', label: 'Svelte Docs', external: true },
    { href: '/about' },
  ]
  const link_props = { onclick: (e) => e.preventDefault() }
</script>

<Nav {routes} {page} {link_props} />
```

## Right-Aligned Items

Push items to the right side of the navigation:

```svelte example collapsible
<script>
  import { Nav } from '$lib'
  import { page } from '$app/state'

  const routes = [
    { href: '/', label: 'Home' },
    { href: '/docs', label: 'Docs' },
    { href: '/about', label: 'About' },
    { href: '/settings', align: 'right' },
    { href: '/profile', label: '👤', align: 'right' },
  ]
  const link_props = { onclick: (e) => e.preventDefault() }
</script>

<Nav {routes} {page} {link_props} />
```

## Callbacks

Handle navigation events with callbacks:

```svelte example collapsible
<script>
  import { Nav } from '$lib'
  import { page } from '$app/state'

  const routes = ['/', '/about', '/contact', '/blog']
  const link_props = { onclick: (e) => e.preventDefault() }
  let nav_message = $state('')
  let menu_status = $state('closed')
</script>

<div style="margin-bottom: 1em">
  <strong>Last action:</strong>
  {nav_message || 'None'} | <strong>Menu:</strong>
  {menu_status}
</div>

<Nav
  {routes}
  {page}
  {link_props}
  onnavigate={({ href }) => {
    nav_message = `Navigated to ${href}`
    return false
  }}
  onopen={() => (menu_status = 'open')}
  onclose={() => (menu_status = 'closed')}
/>
```

## Custom Breakpoint

Control when mobile menu appears with the `breakpoint` prop:

```svelte
<!-- Always show mobile menu -->
<Nav {routes} breakpoint={9999} />

<!-- Never show mobile menu -->
<Nav {routes} breakpoint={0} />

<!-- Custom breakpoint (default: 767) -->
<Nav {routes} breakpoint={1024} />
```

## Item Snippet

Fully customize item rendering with the `item` snippet. Use `render_default` as an escape hatch to render the default item when needed:

```svelte example collapsible
<script>
  import { Nav } from '$lib'
  import { page } from '$app/state'

  const routes = [
    { href: '/', label: 'Home', icon: '🏠' },
    { href: '/docs', label: 'Docs', icon: '📚' },
    { href: '/settings', label: 'Settings', icon: '⚙️' },
  ]
  const link_props = { onclick: (e) => e.preventDefault() }
</script>

<Nav {routes} {page} {link_props}>
  {#snippet item({ route, render_default })}
    <span style="display: flex; align-items: center; gap: 0.3em">
      {#if route.icon}
        <span>{route.icon}</span>
      {/if}
      {@render render_default()}
    </span>
  {/snippet}
</Nav>
```

## Styling

Customize via CSS variables:

```css
nav {
  --nav-border-radius: 6pt;
  --nav-link-bg-hover: rgba(255, 255, 255, 0.1);
  --nav-link-active-color: mediumseagreen;
  --nav-dropdown-bg: var(--surface-bg);
  --nav-dropdown-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  --nav-dropdown-z-index: 100;
  --nav-mobile-z-index: 2;
  --nav-disabled-opacity: 0.5;
  --nav-separator-color: currentColor;
  --nav-separator-margin: 0 0.25em;
}
```
