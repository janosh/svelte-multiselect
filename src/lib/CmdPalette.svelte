<script lang="ts" generics="Action extends CmdAction = CmdAction">
  import type { ComponentProps } from 'svelte'
  import type { HTMLAttributes } from 'svelte/elements'
  import { fade } from 'svelte/transition'
  import MultiSelect from './MultiSelect.svelte'
  import type { CmdAction, MultiSelectProps } from './types'
  import {
    cmd_action_matches,
    format_cmd_metadata,
    matches_shortcut,
    split_shortcut,
  } from './utils'

  // MultiSelect's option snippet param (option + idx/selected/active/disabled)
  type OptionSnippetParams = Parameters<
    NonNullable<MultiSelectProps<Action>[`option`]>
  >[0]
  type AddParams = Parameters<NonNullable<MultiSelectProps<Action>[`onadd`]>>[0]
  type DialogEvent = Parameters<
    NonNullable<HTMLAttributes<HTMLDialogElement>[`oncancel`]>
  >[0]

  let {
    actions,
    activeIndex: active_idx = $bindable(null),
    triggers = [`k`],
    close_keys = [`Escape`],
    fade_duration = 200,
    dialog_style = ``,
    open = $bindable(false),
    dialog = $bindable(null),
    input = $bindable(null),
    aria_label = `Command palette`,
    filterFunc: filter_func,
    fuzzy = true,
    inputProps: input_props,
    input_aria_label = aria_label === `Command palette` ? `Search commands` : aria_label,
    matchingOptions: matching_actions = $bindable([]),
    noMatchingOptionsMsg: no_matching_options_msg = `No matching commands`,
    onadd,
    placeholder = `Type a command…`,
    searchText: search_text = $bindable(``),
    dialog_props,
    global_shortcuts = true,
    recent_actions_key = null,
    max_recent = 20,
    ...rest
  }: Omit<ComponentProps<typeof MultiSelect<Action>>, `options`> & {
    actions: Action[]
    triggers?: string[]
    close_keys?: string[]
    fade_duration?: number // in ms
    dialog_style?: string // inline style for the dialog element
    open?: boolean
    dialog?: HTMLDialogElement | null
    input?: HTMLInputElement | null
    input_aria_label?: string
    aria_label?: string
    placeholder?: string
    dialog_props?: HTMLAttributes<HTMLDialogElement>
    // run action.shortcut hotkeys globally while the palette is closed (default: true)
    global_shortcuts?: boolean
    // localStorage key to persist recently triggered actions. When set, recent
    // actions rank first in the dropdown (most recent on top). null = disabled
    recent_actions_key?: string | null
    max_recent?: number // cap on persisted recent actions (default: 20)
  } = $props()

  // === Recent actions (frecency ranking) ===
  let recent_action_ids = $state<string[]>([])

  const get_action_id = (action: CmdAction): string => `${action.id ?? action.label}`
  const recent_limit = $derived(
    Number.isFinite(max_recent) ? Math.max(0, Math.floor(max_recent)) : 20,
  )
  const get_action_signature = (action: CmdAction): string =>
    action.id === undefined
      ? JSON.stringify([
          action.label,
          action.description,
          action.badge,
          action.disabled,
          action.group,
          action.metadata,
          action.keywords,
          action.shortcut,
        ])
      : JSON.stringify([`id`, action.id])
  const action_key_cache = new WeakMap<CmdAction[`action`], Map<string, symbol>>()
  const get_action_fallback_key = (action: Action) => action.id ?? action.action
  const get_action_key = (action: Action): symbol | Action => {
    if (
      typeof action !== `object` ||
      action === null ||
      typeof action.action !== `function`
    )
      return action
    const signature = get_action_signature(action)
    const signature_keys =
      action_key_cache.get(action.action) ?? new Map<string, symbol>()
    action_key_cache.set(action.action, signature_keys)
    const action_key = signature_keys.get(signature) ?? Symbol(`cmd-action`)
    signature_keys.set(signature, action_key)
    return action_key
  }
  const can_track_recents = $derived(
    new Set(actions.map(get_action_id)).size === actions.length,
  )

  // load persisted recents (client-only since $effect doesn't run during SSR)
  $effect(() => {
    if (!recent_actions_key || !can_track_recents) return
    try {
      const stored: unknown = JSON.parse(localStorage.getItem(recent_actions_key) ?? `[]`)
      recent_action_ids = Array.isArray(stored)
        ? stored.filter((recent) => typeof recent === `string`).slice(0, recent_limit)
        : []
    } catch {
      recent_action_ids = [] // ignore corrupted storage
    }
  })

  function record_recent(action: Action) {
    if (!recent_actions_key || !can_track_recents) return
    const action_id = get_action_id(action)
    recent_action_ids = [
      action_id,
      ...recent_action_ids.filter((recent_id) => recent_id !== action_id),
    ].slice(0, recent_limit)
    try {
      localStorage.setItem(recent_actions_key, JSON.stringify(recent_action_ids))
    } catch {
      // storage full or unavailable - recents just won't persist
    }
  }

  // recently triggered actions first (most recent on top), rest keep original order
  const sorted_actions = $derived.by(() => {
    if (!recent_actions_key || !can_track_recents || recent_action_ids.length === 0)
      return actions
    // drop stale persisted ids (actions removed/renamed since) so they don't
    // occupy low ranks and push real recents below non-recent actions
    const current_ids = new Set(actions.map(get_action_id))
    const rank = new Map(
      recent_action_ids
        .filter((recent_id) => current_ids.has(recent_id))
        .map((action_id, idx) => [action_id, idx]),
    )
    return [...actions].toSorted(
      (left_action, right_action) =>
        (rank.get(get_action_id(left_action)) ?? actions.length) -
        (rank.get(get_action_id(right_action)) ?? actions.length),
    )
  })

  // === Shortcut display ===
  // Map shortcut segments to display symbols (deterministic across platforms)
  const key_symbols: Record<string, string> = {
    meta: `⌘`,
    cmd: `⌘`,
    shift: `⇧`,
    alt: `⌥`,
    ctrl: `Ctrl`,
    enter: `↵`,
    backspace: `⌫`,
    delete: `⌦`,
    escape: `Esc`,
    arrowup: `↑`,
    arrowdown: `↓`,
    arrowleft: `←`,
    arrowright: `→`,
  }
  const format_shortcut = (shortcut: string): string[] =>
    split_shortcut(shortcut).map((part) => {
      const key_segment = part.trim().toLowerCase()
      // title-case unknown multi-char segments, upper-case single chars (empty stays empty)
      const title_case = key_segment.charAt(0).toUpperCase() + key_segment.slice(1)
      return (
        key_symbols[key_segment] ??
        (key_segment.length > 1 ? title_case : key_segment.toUpperCase())
      )
    })

  // Dynamic actions may contain metadata not present in the static action list.
  const has_action_meta = $derived(
    Boolean(rest.loadOptions) ||
      actions.some(
        (action) =>
          action.shortcut || action.description || action.badge || action.metadata,
      ),
  )
  $effect(() => {
    if (!open) return
    if (dialog && !dialog.open) {
      try {
        dialog.showModal()
      } catch {
        // showModal missing (older DOM impls) or dialog not in document
        dialog.setAttribute(`open`, ``)
      }
    }
    if (input && document.activeElement !== input) input.focus()
  })

  function toggle(event: KeyboardEvent): boolean {
    const should_open =
      !open && triggers.includes(event.key) && (event.metaKey || event.ctrlKey)
    const should_close = open && close_keys.includes(event.key)
    if (!should_open && !should_close) return false
    event.preventDefault()
    open = should_open
    return true
  }

  function handle_dialog_cancel(event: DialogEvent) {
    if (!close_keys.includes(`Escape`)) event.preventDefault()
    dialog_props?.oncancel?.(event)
  }

  function handle_window_keydown(event: KeyboardEvent) {
    const is_close_key = open && close_keys.includes(event.key)
    if (event.defaultPrevented && !is_close_key) return
    if (toggle(event)) return
    // run action hotkeys globally while the palette is closed
    if (open || !global_shortcuts) return
    const action = actions.find(
      (cmd_action) =>
        !cmd_action.disabled && matches_shortcut(event, cmd_action.shortcut),
    )
    if (!action) return
    event.preventDefault()
    record_recent(action)
    action.action(action.label)
  }

  function close_if_outside(event: MouseEvent) {
    const target = event.target
    // dialog is null until the next flush after open is set, e.g. when a button's
    // click handler sets open=true and the same click bubbles up to window - don't
    // treat that click as outside. Element (not HTMLElement) so SVG targets count.
    if (!open || !dialog || !(target instanceof Element)) return
    // backdrop clicks on a modal dialog have target === dialog, so close unless the click
    // is on this palette's MultiSelect (scoped inside the dialog) or its options list
    if (dialog.contains(target) && target.closest(`div.multiselect`)) return
    const listbox_id = input?.getAttribute(`aria-controls`)
    const listbox = listbox_id && document.querySelector(`#${CSS.escape(listbox_id)}`)
    if (listbox && listbox.contains(target)) return
    open = false
  }

  function trigger_action_and_close(params: AddParams) {
    const { option } = params
    if (!option?.action || option.disabled) return
    record_recent(option)
    option.action(option.label)
    open = false
    onadd?.(params)
  }
</script>

<svelte:window onkeydown={handle_window_keydown} onclick={close_if_outside} />

{#snippet action_item({ option }: OptionSnippetParams)}
  {@const metadata = format_cmd_metadata(option.metadata)}
  <span class="cmd-action">
    <span class="cmd-label">
      {option.label}
      {#if option.description}
        <small class="cmd-description">{option.description}</small>
      {/if}
    </span>
    {#if metadata || option.badge || option.shortcut}
      <span class="cmd-meta">
        {#if metadata}<small class="cmd-metadata">{metadata}</small>{/if}
        {#if option.badge}<span class="cmd-badge">{option.badge}</span>{/if}
        {#if option.shortcut}
          <span class="cmd-shortcut" aria-hidden="true">
            {#each format_shortcut(option.shortcut) as part, idx (idx)}
              <kbd>{part}</kbd>
            {/each}
          </span>
        {/if}
      </span>
    {/if}
  </span>
{/snippet}

{#if open}
  <dialog
    bind:this={dialog}
    transition:fade={{ duration: fade_duration }}
    style={dialog_style}
    aria-label={aria_label}
    onclose={() => (open = false)}
    {...dialog_props}
    oncancel={handle_dialog_cancel}
  >
    <MultiSelect
      options={sorted_actions}
      bind:activeIndex={active_idx}
      activeOptionFallbackKey={get_action_fallback_key}
      autoActiveFirstOption
      bind:input
      bind:matchingOptions={matching_actions}
      bind:searchText={search_text}
      filterFunc={filter_func ??
        ((action, search) => cmd_action_matches(action, search, fuzzy))}
      {fuzzy}
      inputProps={{ 'aria-label': input_aria_label, ...input_props }}
      noMatchingOptionsMsg={no_matching_options_msg}
      {placeholder}
      key={get_action_key}
      onadd={trigger_action_and_close}
      onkeydown={toggle}
      option={has_action_meta ? action_item : undefined}
      {...rest}
      --sms-bg="var(--sms-options-bg)"
      --sms-width="var(--cmd-width, min(38rem, 90vw))"
      --sms-max-width="none"
      --sms-placeholder-color="lightgray"
      --sms-padding="3pt"
      --sms-options-margin="1px 0"
      --sms-options-border-radius="0 0 1ex 1ex"
    />
  </dialog>
{/if}

<style>
  .cmd-action {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1em;
    min-width: 0;
  }
  .cmd-description {
    display: block;
    opacity: 0.6;
    font-size: var(--cmd-description-font-size, 0.75em);
  }
  .cmd-meta {
    display: flex;
    min-width: 0;
    flex-shrink: 0;
    align-items: center;
    gap: 0.5em;
  }
  .cmd-metadata {
    max-width: var(--cmd-metadata-max-width, 14em);
    overflow: hidden;
    opacity: 0.6;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .cmd-badge {
    padding: 0.05em 0.4em;
    border-radius: 999px;
    background: var(--cmd-badge-bg, color-mix(in srgb, currentColor 10%, transparent));
    opacity: 0.7;
    font-size: var(--cmd-badge-font-size, 0.7em);
  }
  .cmd-shortcut {
    flex-shrink: 0;
    display: flex;
    gap: 2pt;
  }
  .cmd-shortcut kbd {
    background: var(
      --cmd-kbd-bg,
      light-dark(rgba(0, 0, 0, 0.08), rgba(255, 255, 255, 0.15))
    );
    border-radius: 3pt;
    padding: 0 4pt;
    font-size: var(--cmd-kbd-font-size, 0.8em);
    line-height: 1.5;
  }
  :where(dialog) {
    position: fixed;
    top: 30%;
    left: 0;
    right: 0;
    bottom: auto;
    margin: 0 auto;
    border: none;
    padding: var(--cmd-dialog-padding, 6pt);
    background-color: transparent;
    display: flex;
    /* Let command results/popovers escape the dialog; default clipping hides suggestions. */
    overflow: visible;
    color: light-dark(#222, #eee);
    z-index: var(--cmd-palette-z-index, 10);
    font-size: 2.4ex;
  }
</style>
