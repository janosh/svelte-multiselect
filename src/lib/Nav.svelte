<script
  lang="ts"
  generics="Route extends string | [string, string] | [string, string[]]"
>
  // Route can be:
  // - string: just a path ("/about")
  // - [string, string]: [path, custom_label] ("/about", "About Us")
  // - [string, string[]]: [parent_path, child_paths] ("/docs", ["/docs", "/docs/intro"])
  import { Icon } from '$lib'
  import type { Page } from '@sveltejs/kit'
  import type { Snippet } from 'svelte'
  import { click_outside } from 'svelte-multiselect'
  import type { HTMLAttributes } from 'svelte/elements'

  let { routes = [], children, link, menu_props, link_props, page, labels, ...rest }:
    & {
      routes: Route[]
      children?: Snippet<
        [{ is_open: boolean; panel_id: string; routes: Route[] }]
      >
      link?: Snippet<[{ href: string; label: string }]>
      menu_props?: HTMLAttributes<HTMLDivElement>
      link_props?: HTMLAttributes<HTMLAnchorElement>
      page?: Page
      labels?: Record<string, string>
    }
    & Omit<HTMLAttributes<HTMLElementTagNameMap[`nav`]>, `children`> = $props()

  let is_open = $state(false)
  let hovered_dropdown = $state<string | null>(null)
  let focused_item_index = $state<number>(-1)
  let is_touch_device = $state(false)
  const panel_id = `nav-menu-${crypto.randomUUID()}`

  // Detect touch device
  $effect(() => {
    if (typeof globalThis !== `undefined`) {
      is_touch_device = `ontouchstart` in globalThis || navigator.maxTouchPoints > 0
    }
  })

  function close_menus() {
    is_open = false
    hovered_dropdown = null
    focused_item_index = -1
  }

  function toggle_dropdown(href: string, focus_first = false) {
    const is_opening = hovered_dropdown !== href
    hovered_dropdown = hovered_dropdown === href ? null : href
    focused_item_index = is_opening && focus_first ? 0 : -1

    // Focus management for keyboard users
    if (is_opening && focus_first) {
      setTimeout(() => {
        const dropdown = document.querySelector(`.dropdown[data-href="${href}"]`)
        const first_link = dropdown?.querySelector(`div:last-child a`)
        if (first_link instanceof HTMLElement) {
          first_link.focus()
        }
      }, 0)
    }
  }

  function onkeydown(event: KeyboardEvent) {
    if (event.key === `Escape`) close_menus()
  }

  function handle_dropdown_keydown(
    event: KeyboardEvent,
    href: string,
    sub_routes: string[],
  ) {
    const { key } = event

    if (key === `Enter` || key === ` `) {
      event.preventDefault()
      toggle_dropdown(href, true)
      return
    }

    // Arrow key navigation within open dropdown
    if (hovered_dropdown === href && (key === `ArrowDown` || key === `ArrowUp`)) {
      event.preventDefault()
      const direction = key === `ArrowDown` ? 1 : -1
      const new_index = Math.max(
        0,
        Math.min(sub_routes.length - 1, focused_item_index + direction),
      )
      focused_item_index = new_index

      const dropdown = document.querySelector(`.dropdown[data-href="${href}"]`)
      const links = dropdown?.querySelectorAll(`div:last-child a`)
      if (links?.[new_index] instanceof HTMLElement) {
        links[new_index].focus()
      }
    }

    // Open dropdown with ArrowDown when closed
    if (hovered_dropdown !== href && key === `ArrowDown`) {
      event.preventDefault()
      toggle_dropdown(href, true)
    }
  }

  function handle_dropdown_item_keydown(event: KeyboardEvent, href: string) {
    if (event.key === `Escape`) {
      event.preventDefault()
      close_menus()
      // Return focus to dropdown toggle button
      document
        .querySelector(`.dropdown[data-href="${href}"]`)
        ?.querySelector<HTMLButtonElement>(`div:first-child > button`)
        ?.focus()
    }
  }

  function is_current(path: string) {
    if (path === `/`) return page?.url.pathname === `/` ? `page` : undefined
    // Match exact path or path followed by / to avoid partial matches
    // e.g. /tc-periodic-v2 should not match /tc-periodic
    const pathname = page?.url.pathname
    const exact_match = pathname === path
    const prefix_match = pathname?.startsWith(path + `/`)
    return exact_match || prefix_match ? `page` : undefined
  }

  const is_child_current = (sub_routes: string[]) =>
    sub_routes.some((child_path) => is_current(child_path) === `page`)

  function format_label(text: string, remove_parent = false) {
    const custom_label = labels?.[text]
    if (custom_label) return { label: custom_label, style: `` }

    if (remove_parent) text = text.split(`/`).filter(Boolean).pop() ?? text
    const label = text.replace(/^\//, ``).replaceAll(`-`, ` `)
    return { label, style: `text-transform: capitalize` }
  }

  function parse_route(route: Route) {
    if (typeof route === `string`) return { href: route, label: route }
    const [first, second] = route
    return Array.isArray(second)
      ? { href: first, label: first, children: second }
      : { href: first, label: second }
  }
</script>

<svelte:window {onkeydown} />

<nav
  {...rest}
  {@attach click_outside({ callback: close_menus })}
>
  <button
    class="burger"
    onclick={() => is_open = !is_open}
    aria-label="Toggle navigation menu"
    aria-expanded={is_open}
    aria-controls={panel_id}
  >
    <span></span>
    <span></span>
    <span></span>
  </button>

  <div
    id={panel_id}
    class="menu"
    class:open={is_open}
    tabindex="0"
    role="menu"
    {onkeydown}
    {...menu_props}
  >
    {#each routes as route (JSON.stringify(route))}
      {@const { href, label, children: sub_routes } = parse_route(route)}

      {#if sub_routes}
        <!-- Dropdown menu item -->
        {@const parent = format_label(label)}
        {@const child_is_active = is_child_current(sub_routes)}
        {@const parent_page_exists = sub_routes.includes(href)}
        {@const filtered_sub_routes = sub_routes.filter((route) => route !== href)}
        <div
          class="dropdown"
          class:active={child_is_active}
          data-href={href}
          role="group"
          aria-current={child_is_active ? `true` : undefined}
          onmouseenter={() => !is_touch_device && (hovered_dropdown = href)}
          onmouseleave={() => !is_touch_device && (hovered_dropdown = null)}
          onfocusin={() => (hovered_dropdown = href)}
          onfocusout={(event) => {
            const next = event.relatedTarget as Node | null
            if (!next || !(event.currentTarget as HTMLElement).contains(next)) {
              hovered_dropdown = null
            }
          }}
        >
          <div>
            <svelte:element
              this={parent_page_exists ? `a` : `span`}
              href={parent_page_exists ? href : undefined}
              aria-current={is_current(href)}
              onclick={close_menus}
              role={parent_page_exists ? undefined : `button`}
              style={parent.style}
            >
              {@html parent.label}
            </svelte:element>
            <button
              aria-label="Toggle {parent.label} submenu"
              aria-expanded={hovered_dropdown === href}
              aria-haspopup="true"
              onclick={() => toggle_dropdown(href, false)}
              onkeydown={(event) => handle_dropdown_keydown(event, href, filtered_sub_routes)}
            >
              <Icon
                icon="ChevronExpand"
                style="width: 0.8em; height: 0.8em"
              />
            </button>
          </div>
          <div
            class:visible={hovered_dropdown === href}
            role="menu"
            tabindex="-1"
            onmouseenter={() => !is_touch_device && (hovered_dropdown = href)}
            onmouseleave={() => !is_touch_device && (hovered_dropdown = null)}
            onfocusin={() => (hovered_dropdown = href)}
            onfocusout={(event) => {
              const next = event.relatedTarget as Node | null
              if (!next || !(event.currentTarget as HTMLElement).contains(next)) {
                hovered_dropdown = null
              }
            }}
          >
            {#each filtered_sub_routes as child_href (child_href)}
              {@const child = format_label(child_href, true)}
              {#if link}
                {@render link({ href: child_href, label: child.label })}
              {:else}
                <a
                  href={child_href}
                  role="menuitem"
                  aria-current={is_current(child_href)}
                  onclick={close_menus}
                  onkeydown={(event) => handle_dropdown_item_keydown(event, href)}
                  {...link_props}
                  style={`${child.style}; ${link_props?.style ?? ``}`}
                >
                  {@html child.label}
                </a>
              {/if}
            {/each}
          </div>
        </div>
      {:else}
        <!-- Regular link item -->
        {@const regular = format_label(label)}
        {#if link}
          {@render link({ href, label })}
        {:else}
          <a
            {href}
            aria-current={is_current(href)}
            onclick={close_menus}
            {...link_props}
            style={`${regular.style}; ${link_props?.style ?? ``}`}
          >
            {@html regular.label}
          </a>
        {/if}
      {/if}
    {/each}

    {@render children?.({ is_open, panel_id, routes })}
  </div>
</nav>

<style>
  nav {
    position: relative;
    margin: -0.75em auto 1.25em;
    --nav-border-radius: 6pt;
    --nav-surface-bg: light-dark(#fff, #1a1a1a);
    --nav-surface-border: light-dark(rgba(128, 128, 128, 0.25), rgba(200, 200, 200, 0.2));
    --nav-surface-shadow: light-dark(
      0 2px 8px rgba(0, 0, 0, 0.15),
      0 4px 12px rgba(0, 0, 0, 0.5)
    );
  }
  .menu {
    display: flex;
    gap: 1em;
    place-content: center;
    place-items: center;
    flex-wrap: wrap;
    padding: 0.5em;
  }
  .menu > a {
    line-height: 1.3;
    padding: 1pt 5pt;
    border-radius: var(--nav-border-radius);
    text-decoration: none;
    color: inherit;
    transition: background-color 0.2s;
  }
  .menu > a:hover {
    background-color: var(--nav-link-bg-hover);
  }
  .menu > a[aria-current='page'] {
    color: var(--nav-link-active-color);
  }

  /* Dropdown styles */
  .dropdown {
    position: relative;
  }
  .dropdown.active > div:first-child a,
  .dropdown.active > div:first-child span {
    color: var(--nav-link-active-color);
  }
  .dropdown::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    height: var(--nav-dropdown-margin, 3pt);
  }
  .dropdown > div:first-child {
    display: flex;
    align-items: center;
    gap: 0;
    border-radius: var(--nav-border-radius);
    transition: background-color 0.2s;
  }
  .dropdown > div:first-child:hover {
    background-color: var(--nav-link-bg-hover);
  }
  .dropdown > div:first-child > a,
  .dropdown > div:first-child > span {
    line-height: 1.3;
    padding: 1pt 5pt;
    text-decoration: none;
    color: inherit;
    border-radius: var(--nav-border-radius) 0 0 var(--nav-border-radius);
  }
  .dropdown > div:first-child > a[aria-current='page'],
  .dropdown > div:first-child > span[aria-current='page'] {
    color: var(--nav-link-active-color);
  }
  .dropdown > div:first-child > button {
    padding: 1pt 3pt;
    border: none;
    background: transparent;
    color: inherit;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 0 var(--nav-border-radius) var(--nav-border-radius) 0;
  }
  .dropdown > div:last-child {
    position: absolute;
    top: 100%;
    left: 0;
    margin: var(--nav-dropdown-margin, 3pt 0 0 0);
    min-width: max-content;
    background-color: var(--nav-dropdown-bg, var(--nav-surface-bg));
    border: 1px solid var(--nav-dropdown-border-color, var(--nav-surface-border));
    border-radius: var(--nav-border-radius, 6pt);
    box-shadow: var(--nav-dropdown-shadow, var(--nav-surface-shadow));
    padding: var(--nav-dropdown-padding, 2pt 3pt);
    display: none;
    flex-direction: column;
    gap: var(--nav-dropdown-gap, 5pt);
    z-index: var(--nav-dropdown-z-index, 100);
  }
  .dropdown > div:last-child.visible {
    display: flex;
  }
  .dropdown > div:last-child a {
    padding: var(--nav-dropdown-link-padding, 1pt 4pt);
    border-radius: var(--nav-border-radius);
    text-decoration: none;
    color: inherit;
    white-space: nowrap;
    transition: background-color 0.2s;
  }
  .dropdown > div:last-child a:hover {
    background-color: var(--nav-link-bg-hover);
  }
  .dropdown > div:last-child a[aria-current='page'] {
    color: var(--nav-link-active-color);
  }
  /* Mobile burger button */
  .burger {
    display: none;
    position: fixed;
    top: 1rem;
    left: 1rem;
    flex-direction: column;
    justify-content: space-around;
    width: 1.4rem;
    height: 1.4rem;
    background: transparent;
    padding: 0;
    z-index: var(--nav-toggle-btn-z-index, 10);
  }
  .burger span {
    height: 0.18rem;
    background-color: var(--text-color);
    border-radius: 8px;
    transition: all 0.2s linear;
    transform-origin: 1px;
  }
  .burger[aria-expanded='true'] span:first-child {
    transform: rotate(45deg);
  }
  .burger[aria-expanded='true'] span:nth-child(2) {
    opacity: 0;
  }
  .burger[aria-expanded='true'] span:nth-child(3) {
    transform: rotate(-45deg);
  }
  /* Mobile styles */
  @media (max-width: 767px) {
    .burger {
      display: flex;
    }
    .menu {
      position: fixed;
      top: 3rem;
      left: 1rem;
      background-color: var(--nav-surface-bg);
      border: 1px solid var(--nav-surface-border);
      box-shadow: var(--nav-surface-shadow);
      opacity: 0;
      visibility: hidden;
      transition: all 0.3s ease;
      z-index: var(--nav-mobile-z-index, 2);
      flex-direction: column;
      align-items: stretch;
      justify-content: flex-start;
      gap: 0.2em;
      max-width: 90vw;
      border-radius: 6px;
    }
    .menu.open {
      opacity: 1;
      visibility: visible;
    }
    .menu > a,
    .dropdown {
      padding: 2pt 8pt;
    }

    /* Mobile dropdown styles - show as expandable section */
    .dropdown {
      flex-direction: column;
      align-items: stretch;
    }
    .dropdown > div:first-child {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .dropdown > div:first-child > a,
    .dropdown > div:first-child > span {
      flex: 1;
      border-radius: var(--nav-border-radius);
    }
    .dropdown > div:first-child > button {
      padding: 4pt 8pt;
      border-radius: var(--nav-border-radius);
    }
    .dropdown > div:last-child {
      position: static;
      border: none;
      box-shadow: none;
      margin-top: 0.25em;
      padding: 0 0 0 1em;
      background-color: transparent;
    }
  }
</style>
