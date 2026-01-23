<script lang="ts">
  import type { Page } from '@sveltejs/kit'
  import type { Snippet } from 'svelte'
  import type { HTMLAttributes } from 'svelte/elements'
  import {
    click_outside,
    get_uuid,
    tooltip,
    type TooltipOptions,
  } from './attachments'
  import Icon from './Icon.svelte'
  import type { NavRoute, NavRouteObject } from './types'

  // Props for the item snippet's render_default function context
  interface ItemSnippetParams {
    route: NavRouteObject // normalized route object
    href: string
    label: string
    is_active: boolean
    is_dropdown: boolean
    render_default: Snippet // escape hatch to render default
  }

  let {
    routes = [],
    children,
    item,
    link,
    menu_props,
    link_props,
    page,
    labels,
    tooltips,
    tooltip_options,
    breakpoint = 767,
    onnavigate,
    onopen,
    onclose,
    ...rest
  }: {
    routes: NavRoute[]
    children?: Snippet<
      [{ is_open: boolean; panel_id: string; routes: NavRoute[] }]
    >
    item?: Snippet<[ItemSnippetParams]>
    link?: Snippet<[{ href: string; label: string }]>
    menu_props?: HTMLAttributes<HTMLDivElement>
    link_props?: HTMLAttributes<HTMLAnchorElement>
    page?: Page
    labels?: Record<string, string>
    tooltips?: Record<string, string | Omit<TooltipOptions, `disabled`>>
    tooltip_options?: Omit<TooltipOptions, `content`>
    breakpoint?: number
    onnavigate?: (data: {
      href: string
      event: MouseEvent
      route: NavRouteObject
    }) => void | false
    onopen?: () => void
    onclose?: () => void
  } & Omit<HTMLAttributes<HTMLElementTagNameMap[`nav`]>, `children`> = $props()

  let is_open = $state(false)
  let hovered_dropdown = $state<string | null>(null)
  let focused_item_index = $state<number>(-1)
  let is_touch_device = $state(false)
  let is_mobile = $state(false)
  const panel_id = `nav-menu-${get_uuid()}`

  // Track previous is_open state for callbacks
  let prev_is_open = $state(false)

  // Detect touch device and handle responsive breakpoint
  $effect(() => {
    if (typeof globalThis === `undefined`) return
    is_touch_device = `ontouchstart` in globalThis || navigator.maxTouchPoints > 0

    // Handle responsive breakpoint via JS since CSS variables don't work in media queries
    const check_mobile = () => {
      is_mobile = globalThis.innerWidth <= breakpoint
    }
    check_mobile()
    globalThis.addEventListener(`resize`, check_mobile)
    return () => globalThis.removeEventListener(`resize`, check_mobile)
  })

  // Call onopen/onclose callbacks when menu state changes
  $effect(() => {
    if (is_open && !prev_is_open) {
      onopen?.()
    } else if (!is_open && prev_is_open) {
      onclose?.()
    }
    prev_is_open = is_open
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
        document
          .querySelector<HTMLElement>(
            `.dropdown[data-href="${href}"] [role="menuitem"]`,
          )
          ?.focus()
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
    if (
      hovered_dropdown === href &&
      (key === `ArrowDown` || key === `ArrowUp`)
    ) {
      event.preventDefault()
      const direction = key === `ArrowDown` ? 1 : -1
      focused_item_index = Math.max(
        0,
        Math.min(sub_routes.length - 1, focused_item_index + direction),
      )
      document
        .querySelectorAll<HTMLElement>(
          `.dropdown[data-href="${href}"] [role="menuitem"]`,
        )
        ?.[focused_item_index]?.focus()
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
      document
        .querySelector<HTMLButtonElement>(
          `.dropdown[data-href="${href}"] [data-dropdown-toggle]`,
        )
        ?.focus()
    }
  }

  function is_current(path: string | undefined) {
    if (!path) return undefined
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

  function format_label(text: string | undefined, remove_parent = false) {
    if (!text) return { label: ``, style: `` }
    const custom_label = labels?.[text]
    if (custom_label) return { label: custom_label, style: `` }

    if (remove_parent) text = text.split(`/`).filter(Boolean).pop() ?? text
    let label = text.replace(/^\//, ``).replaceAll(`-`, ` `)
    // Handle root path '/' which becomes empty after stripping
    if (!label && text === `/`) label = `Home`
    return { label, style: label ? `text-transform: capitalize` : `` }
  }

  // Normalize all route formats to NavRouteObject
  function parse_route(route: NavRoute): NavRouteObject {
    if (typeof route === `string`) return { href: route }
    if (Array.isArray(route)) {
      const [href, second] = route
      return Array.isArray(second)
        ? { href, children: second }
        : { href, label: second }
    }
    return route
  }

  function get_tooltip(route: NavRouteObject) {
    // Priority: disabled message > route.tooltip > tooltips[href]
    if (typeof route.disabled === `string`) {
      return tooltip({ ...tooltip_options, content: route.disabled })
    }
    const content = route.tooltip ?? tooltips?.[route.href]
    if (!content) return undefined
    // Support both string (content only) and object (full options) formats
    const opts = typeof content === `string` ? { content } : content
    return tooltip({ ...tooltip_options, ...opts })
  }

  // Handle link click with onnavigate callback
  function handle_link_click(event: MouseEvent, route: NavRouteObject) {
    if (route.disabled) {
      event.preventDefault()
      return
    }
    if (onnavigate) {
      const result = onnavigate({ href: route.href, event, route })
      if (result === false) {
        event.preventDefault()
        return
      }
    }
    close_menus()
  }

  // Get external link attributes
  function get_external_attrs(route: NavRouteObject) {
    if (!route.external) return {}
    return { target: `_blank`, rel: `noopener noreferrer` }
  }
</script>

<svelte:window {onkeydown} />

<!-- Default item rendering snippet for escape hatch -->
{#snippet default_item_render(
  parsed_route: NavRouteObject,
  formatted: { label: string; style: string },
  item_tooltip: ReturnType<typeof tooltip> | undefined,
)}
  {@const is_disabled = Boolean(parsed_route.disabled)}
  {#if is_disabled}
    <span
      class="disabled {parsed_route.class ?? ``}"
      style={`${formatted.style}; ${parsed_route.style ?? ``}`}
      aria-disabled="true"
      {@attach item_tooltip}
    >{@html formatted.label}</span>
  {:else if link}
    {@render link({ href: parsed_route.href, label: formatted.label })}
  {:else}
    <a
      href={parsed_route.href}
      aria-current={is_current(parsed_route.href)}
      onclick={(event) => handle_link_click(event, parsed_route)}
      class={parsed_route.class}
      {...link_props}
      {...get_external_attrs(parsed_route)}
      style={`${formatted.style}; ${link_props?.style ?? ``}; ${parsed_route.style ?? ``}`}
      {@attach item_tooltip}
    >
      {@html formatted.label}
    </a>
  {/if}
{/snippet}

<nav
  {...rest}
  class:mobile={is_mobile}
  {@attach click_outside({ callback: close_menus })}
>
  <button
    class="burger"
    type="button"
    onclick={() => (is_open = !is_open)}
    aria-label="Toggle navigation menu"
    aria-expanded={is_open}
    aria-controls={panel_id}
  >
    <span aria-hidden="true"></span>
    <span aria-hidden="true"></span>
    <span aria-hidden="true"></span>
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
    {#each routes as
      route,
      route_idx
      (`${route_idx}-${
        typeof route === `string`
          ? route
          : Array.isArray(route)
          ? route[0]
          : (route.href ?? `sep-${route_idx}`)
      }`)
    }
      {@const parsed_route = parse_route(route)}
      {@const formatted = format_label(parsed_route.label ?? parsed_route.href)}
      {@const sub_routes = parsed_route.children}
      {@const is_active = is_current(parsed_route.href) === `page`}
      {@const is_dropdown = Boolean(sub_routes)}
      {@const is_right = parsed_route.align === `right`}
      {@const item_tooltip = get_tooltip(parsed_route)}

      <!-- Separator-only item -->
      {#if parsed_route.separator && !parsed_route.href}
        <div class="separator" role="separator"></div>
      {:else if sub_routes}
        <!-- Dropdown menu item -->
        {@const child_is_active = is_child_current(sub_routes)}
        {@const parent_page_exists = sub_routes.includes(parsed_route.href)}
        {@const filtered_sub_routes = sub_routes.filter(
        (r) => r !== parsed_route.href,
      )}
        <div
          class="dropdown"
          class:active={child_is_active}
          class:align-right={is_right}
          data-href={parsed_route.href}
          role="group"
          aria-current={child_is_active ? `true` : undefined}
          onmouseenter={() => !is_touch_device && (hovered_dropdown = parsed_route.href)}
          onmouseleave={() => !is_touch_device && (hovered_dropdown = null)}
          onfocusin={() => (hovered_dropdown = parsed_route.href)}
          onfocusout={(event) => {
            const next = event.relatedTarget as Node | null
            if (!next || !(event.currentTarget as HTMLElement).contains(next)) {
              hovered_dropdown = null
            }
          }}
        >
          <div>
            {#if parsed_route.disabled}
              <span
                class="disabled {parsed_route.class ?? ``}"
                style={`${formatted.style}; ${parsed_route.style ?? ``}`}
                aria-disabled="true"
                {@attach item_tooltip}
              >{@html formatted.label}</span>
            {:else if parent_page_exists}
              <a
                href={parsed_route.href}
                aria-current={is_current(parsed_route.href)}
                onclick={(event) => handle_link_click(event, parsed_route)}
                class={parsed_route.class}
                style={`${formatted.style}; ${parsed_route.style ?? ``}`}
                {...get_external_attrs(parsed_route)}
                {@attach item_tooltip}
              >
                {@html formatted.label}
              </a>
            {:else}
              <span
                class={parsed_route.class}
                style={`${formatted.style}; ${parsed_route.style ?? ``}`}
                {@attach item_tooltip}
              >{@html formatted.label}</span>
            {/if}
            <button
              type="button"
              data-dropdown-toggle
              aria-label="Toggle {formatted.label} submenu"
              aria-expanded={hovered_dropdown === parsed_route.href}
              aria-haspopup="true"
              onclick={() => toggle_dropdown(parsed_route.href, false)}
              onkeydown={(event) =>
              handle_dropdown_keydown(
                event,
                parsed_route.href,
                filtered_sub_routes,
              )}
            >
              <Icon icon="ChevronExpand" style="width: 0.8em; height: 0.8em" />
            </button>
          </div>
          <div
            class:visible={hovered_dropdown === parsed_route.href}
            role="menu"
            tabindex="-1"
            onmouseenter={() => !is_touch_device && (hovered_dropdown = parsed_route.href)}
            onmouseleave={() => !is_touch_device && (hovered_dropdown = null)}
            onfocusin={() => (hovered_dropdown = parsed_route.href)}
            onfocusout={(event) => {
              const next = event.relatedTarget as Node | null
              if (
                !next ||
                !(event.currentTarget as HTMLElement).contains(next)
              ) {
                hovered_dropdown = null
              }
            }}
          >
            {#each filtered_sub_routes as child_href (child_href)}
              {@const child_formatted = format_label(child_href, true)}
              {@const child_tooltip = get_tooltip({ href: child_href })}
              {#if link}
                {@render link({ href: child_href, label: child_formatted.label })}
              {:else}
                <a
                  href={child_href}
                  role="menuitem"
                  aria-current={is_current(child_href)}
                  onclick={(event) => handle_link_click(event, { href: child_href })}
                  onkeydown={(event) => handle_dropdown_item_keydown(event, parsed_route.href)}
                  {...link_props}
                  style={`${child_formatted.style}; ${link_props?.style ?? ``}`}
                  {@attach child_tooltip}
                >
                  {@html child_formatted.label}
                </a>
              {/if}
            {/each}
          </div>
        </div>
        <!-- Separator after dropdown if specified -->
        {#if parsed_route.separator}
          <div class="separator" role="separator"></div>
        {/if}
      {:else}
        <!-- Regular link item -->
        {#if item}
          <!-- User-provided item snippet with render_default escape hatch -->
          {#snippet render_default_snippet()}
            {@render default_item_render(parsed_route, formatted, item_tooltip)}
          {/snippet}
          <span class:align-right={is_right}>
            {@render item({
          route: parsed_route,
          href: parsed_route.href,
          label: formatted.label,
          is_active,
          is_dropdown,
          render_default: render_default_snippet,
        })}
          </span>
        {:else}
          <span class:align-right={is_right}>
            {@render default_item_render(parsed_route, formatted, item_tooltip)}
          </span>
        {/if}
        <!-- Separator after item if specified -->
        {#if parsed_route.separator}
          <div class="separator" role="separator"></div>
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
    --nav-surface-bg: light-dark(#fafafa, #1a1a1a);
    --nav-surface-border: light-dark(
      rgba(128, 128, 128, 0.25),
      rgba(200, 200, 200, 0.2)
    );
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
  .menu > span,
  .menu > span > a {
    line-height: 1.3;
    padding: 1pt 5pt;
    border-radius: var(--nav-border-radius);
    text-decoration: none;
    color: inherit;
    transition: background-color 0.2s;
  }
  .menu > span > a:hover {
    background-color: var(--nav-link-bg-hover);
  }
  .menu > span > a[aria-current='page'] {
    color: var(--nav-link-active-color);
  }
  /* Disabled items */
  .menu .disabled {
    opacity: var(--nav-disabled-opacity, 0.5);
    cursor: not-allowed;
    pointer-events: none;
  }
  /* Right-aligned items - only first one gets margin-left: auto */
  .menu > .align-right,
  .menu > .dropdown.align-right {
    margin-left: auto;
  }
  .menu > .align-right + .align-right,
  .menu > .align-right + .dropdown.align-right,
  .menu > .dropdown.align-right + .align-right,
  .menu > .dropdown.align-right + .dropdown.align-right {
    margin-left: 0;
  }
  /* Separator */
  .menu > .separator {
    width: 1px;
    height: 1.2em;
    background-color: var(--nav-separator-color, currentColor);
    opacity: 0.3;
    margin: var(--nav-separator-margin, 0 0.25em);
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
  .dropdown > div:first-child > a[aria-current='page'] {
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
    outline-offset: -1px;
  }
  .dropdown > div:first-child > button:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: -2px;
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
    width: 100%;
    height: 0.18rem;
    background-color: var(--text);
    border-radius: 8px;
    transition: all 0.2s linear;
    transform-origin: center;
  }
  .burger[aria-expanded='true'] span:first-child {
    transform: translateY(0.4rem) rotate(45deg);
  }
  .burger[aria-expanded='true'] span:nth-child(2) {
    opacity: 0;
  }
  .burger[aria-expanded='true'] span:nth-child(3) {
    transform: translateY(-0.4rem) rotate(-45deg);
  }
  /* Mobile styles - using .mobile class set via JS based on breakpoint prop */
  nav.mobile .burger {
    display: flex;
  }
  nav.mobile .menu {
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
    justify-content: start;
    gap: 0.2em;
    max-width: 90vw;
    border-radius: 6px;
  }
  nav.mobile .menu.open {
    opacity: 1;
    visibility: visible;
  }
  nav.mobile .menu > span,
  nav.mobile .menu > span > a,
  nav.mobile .dropdown {
    padding: 2pt 8pt;
  }
  /* Mobile separator */
  nav.mobile .menu > .separator {
    width: 100%;
    height: 1px;
    margin: var(--nav-separator-margin, 0.25em 0);
  }
  /* Mobile dropdown styles - show as expandable section */
  nav.mobile .dropdown {
    flex-direction: column;
    align-items: stretch;
  }
  nav.mobile .dropdown > div:first-child {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  nav.mobile .dropdown > div:first-child > a,
  nav.mobile .dropdown > div:first-child > span {
    flex: 1;
    border-radius: var(--nav-border-radius);
  }
  nav.mobile .dropdown > div:first-child > button {
    padding: 4pt 8pt;
    border-radius: var(--nav-border-radius);
  }
  nav.mobile .dropdown > div:last-child {
    position: static;
    border: none;
    box-shadow: none;
    margin-top: 0.25em;
    padding: 0 0 0 1em;
    background-color: transparent;
  }
  /* Mobile right-aligned items stack normally */
  nav.mobile .menu > .align-right,
  nav.mobile .menu > .dropdown.align-right {
    margin-left: 0;
  }
</style>
