<script>
  import { Nav } from '$lib'
  import { page } from '$app/state'

  const simple_routes = ['/', '/about', '/contact', '/blog']

  const routes_with_dropdowns = [
    '/',
    ['/docs', ['/docs', '/docs/api', '/docs/examples', '/docs/guides']],
    ['/products', ['/products/item-1', '/products/item-2', '/products/item-3']],
    '/about'
  ]

  const routes_no_parent = [
    '/',
    ['/help', ['/help/faq', '/help/support', '/help/contact']],
    '/about'
  ]

  const link_props = {
    onclick: (evt) => evt.preventDefault(), // Disable navigation for demo
    style: 'opacity: 0.8;',
  }
</script>

# Nav Component

Flexible, accessible navigation with dropdown support, mobile burger menu, and keyboard navigation.

## Features

- 🎯 Responsive with automatic mobile burger menu (&lt; 768px)
- ⌨️ Full keyboard navigation (Enter/Space/Arrows/Escape)
- ♿ Proper ARIA attributes and focus management
- 🎨 Customizable via CSS variables and props

## Basic Usage

```svelte
<script>
  import { Nav } from 'svelte-multiselect'
  import { page } from '$app/state'

  const routes = ['/', '/about', '/contact', '/blog']
</script>

<Nav {routes} {page} />
```

<Nav routes={simple_routes} {page} {link_props} />

## Custom Labels

```svelte
<Nav
  routes={['/ui', '/css-classes']}
  labels={{ '/ui': 'UI Components', '/css-classes': 'CSS Classes' }}
  {page}
/>
```

<Nav
  routes={['/ui', '/css-classes', '/kit-form-actions']}
  labels={{
    '/ui': 'UI Components',
    '/css-classes': 'CSS Classes',
    '/kit-form-actions': 'Form Actions'
  }}
  {page}
  {link_props}
/>

## Dropdown Menus

Use tuple syntax `[parent, [children...]]` for nested routes:

```svelte
<script>
  const routes = [
    '/',
    ['/docs', ['/docs', '/docs/api', '/docs/examples']],
    '/about',
  ]
</script>

<Nav {routes} {page} />
```

<Nav routes={routes_with_dropdowns} {page} {link_props} />

**Dropdown without parent page:** When the parent route doesn't exist (e.g., no `/help` page), the trigger becomes a `<span>` instead of a link:

<Nav routes={routes_no_parent} {page} {link_props} />

## Keyboard Navigation

- **Tab**: Navigate between items
- **Enter/Space**: Open dropdown or follow link
- **Arrow Down/Up**: Navigate dropdown items
- **Escape**: Close menus

## Custom Link Rendering

Use the `link` snippet to customize link rendering:

```svelte
<Nav {routes} {page}>
  {#snippet link({ href, label })}
    <a {href} class="custom-link">🔗 {label}</a>
  {/snippet}
</Nav>
```

## Custom Children

Add extra content to the nav menu:

```svelte
<Nav {routes} {page}>
  {#snippet children()}
    <button>Action</button>
  {/snippet}
</Nav>
```

<Nav routes={simple_routes} {page} {link_props}>
  {#snippet children({ is_open })}
    <button
      style="padding: 4pt 12pt; background: var(--sms-selected-bg, mediumseagreen); border: none; border-radius: 6px; color: white; cursor: pointer;"
      onclick={() => alert('Custom action!')}
    >
      ⚡ Action
    </button>
    {#if is_open}
      <span style="opacity: 0.6; font-size: 0.85em;">(menu open)</span>
    {/if}
  {/snippet}
</Nav>

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
}
```
