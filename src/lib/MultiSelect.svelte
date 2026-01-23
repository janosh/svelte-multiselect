<!-- eslint-disable-next-line @stylistic/quotes -- TS generics require string literals -->
<script lang="ts" generics="Option extends import('./types').Option">
  import { tick, untrack } from 'svelte'
  import { flip } from 'svelte/animate'
  import type { FocusEventHandler, KeyboardEventHandler } from 'svelte/elements'
  import { SvelteMap, SvelteSet } from 'svelte/reactivity'
  import { get_uuid, highlight_matches } from './attachments'
  import CircleSpinner from './CircleSpinner.svelte'
  import Icon from './Icon.svelte'
  import type { GroupedOptions, KeyboardShortcuts, MultiSelectProps } from './types'
  import { fuzzy_match, get_label, get_style, has_group, is_object } from './utils'
  import Wiggle from './Wiggle.svelte'

  let {
    activeIndex = $bindable(null),
    activeOption = $bindable(null),
    createOptionMsg = `Create this option...`,
    allowUserOptions = false,
    allowEmpty = false,
    autocomplete = `off`,
    autoScroll = true,
    breakpoint = 800,
    defaultDisabledTitle = `This option is disabled`,
    disabled = false,
    disabledInputTitle = `This input is disabled`,
    duplicateOptionMsg = `This option is already selected`,
    duplicates = false,
    keepSelectedInDropdown = false,
    key = (opt) => `${get_label(opt)}`.toLowerCase(),
    filterFunc = (opt, searchText) => {
      if (!searchText) return true
      const label = `${get_label(opt)}`
      return fuzzy
        ? fuzzy_match(searchText, label)
        : label.toLowerCase().includes(searchText.toLowerCase())
    },
    fuzzy = true,
    closeDropdownOnSelect = false,
    form_input = $bindable(null),
    highlightMatches = true,
    id = null,
    input = $bindable(null),
    inputClass = ``,
    inputStyle = null,
    inputmode = null,
    invalid = $bindable(false),
    liActiveOptionClass = ``,
    liActiveUserMsgClass = ``,
    liOptionClass = ``,
    liOptionStyle = null,
    liSelectedClass = ``,
    liSelectedStyle = null,
    liUserMsgClass = ``,
    loading = false,
    matchingOptions = $bindable([]),
    maxOptions = undefined,
    maxSelect = $bindable(null),
    maxSelectMsg = (current, max) => (max > 1 ? `${current}/${max}` : ``),
    maxSelectMsgClass = ``,
    name = null,
    noMatchingOptionsMsg = `No matching options`,
    open = $bindable(false),
    options = $bindable(),
    outerDiv = $bindable(null),
    outerDivClass = ``,
    parseLabelsAsHtml = false,
    pattern = null,
    placeholder = null,
    removeAllTitle = `Remove all`,
    removeBtnTitle = `Remove`,
    minSelect = null,
    required = false,
    resetFilterOnAdd = true,
    searchText = $bindable(``),
    value = $bindable(null),
    selected = $bindable(
      value !== null && value !== undefined
        ? Array.isArray(value) ? value : [value]
        : (options
          ?.filter(
            (opt) => typeof opt === `object` && opt !== null && opt?.preselected,
          )
          .slice(0, maxSelect ?? undefined) ?? []),
    ),
    sortSelected = false,
    selectedOptionsDraggable = !sortSelected,
    style = null,
    ulOptionsClass = ``,
    ulSelectedClass = ``,
    ulSelectedStyle = null,
    ulOptionsStyle = null,
    expandIcon,
    selectedItem,
    children,
    removeIcon,
    afterInput,
    spinner,
    disabledIcon,
    option,
    userMsg,
    onblur,
    onclick,
    onfocus,
    onkeydown,
    onkeyup,
    onmousedown,
    onmouseenter,
    onmouseleave,
    ontouchcancel,
    ontouchend,
    ontouchmove,
    ontouchstart,
    onadd,
    oncreate,
    onremove,
    onremoveAll,
    onchange,
    onopen,
    onclose,
    onselectAll,
    onreorder,
    portal: portal_params = {},
    // Select all feature
    selectAllOption = false,
    liSelectAllClass = ``,
    // Dynamic options loading
    loadOptions,
    // Animation parameters for selected options flip animation
    selectedFlipParams = { duration: 100 },
    // Option grouping feature
    collapsibleGroups = false,
    collapsedGroups = $bindable(new Set<string>()),
    groupSelectAll = false,
    ungroupedPosition = `first`,
    groupSortOrder = `none`,
    searchExpandsCollapsedGroups = false,
    searchMatchesGroups = false,
    keyboardExpandsCollapsedGroups = false,
    stickyGroupHeaders = false,
    liGroupHeaderClass = ``,
    liGroupHeaderStyle = null,
    groupHeader,
    ongroupToggle,
    oncollapseAll,
    onexpandAll,
    onsearch,
    onmaxreached,
    onduplicate,
    onactivate,
    collapseAllGroups = $bindable(),
    expandAllGroups = $bindable(),
    // Keyboard shortcuts for common actions
    shortcuts = {},
    ...rest
  }: MultiSelectProps<Option> = $props()

  // Generate unique IDs for ARIA associations (combobox pattern)
  // Uses provided id prop or generates a random one using crypto API
  const internal_id = $derived(id ?? `sms-${get_uuid().slice(0, 8)}`)
  const listbox_id = $derived(`${internal_id}-listbox`)

  // Parse shortcut string into modifier+key parts
  function parse_shortcut(shortcut: string): {
    key: string
    ctrl: boolean
    shift: boolean
    alt: boolean
    meta: boolean
  } {
    const parts = shortcut
      .toLowerCase()
      .split(`+`)
      .map((part) => part.trim())
    const key = parts.pop() ?? ``
    return {
      key,
      ctrl: parts.includes(`ctrl`),
      shift: parts.includes(`shift`),
      alt: parts.includes(`alt`),
      meta: parts.includes(`meta`) || parts.includes(`cmd`),
    }
  }

  function matches_shortcut(
    event: KeyboardEvent,
    shortcut: string | null | undefined,
  ): boolean {
    if (!shortcut) return false
    const parsed = parse_shortcut(shortcut)
    // Require non-empty key to prevent "ctrl+" from matching any key with ctrl pressed
    if (!parsed.key) return false
    const key_matches = event.key.toLowerCase() === parsed.key
    const ctrl_matches = event.ctrlKey === parsed.ctrl
    const shift_matches = event.shiftKey === parsed.shift
    const alt_matches = event.altKey === parsed.alt
    const meta_matches = event.metaKey === parsed.meta
    return (
      key_matches &&
      ctrl_matches &&
      shift_matches &&
      alt_matches &&
      meta_matches
    )
  }

  // Default shortcuts
  const default_shortcuts: KeyboardShortcuts = {
    select_all: `ctrl+a`,
    clear_all: `ctrl+shift+a`,
    open: null,
    close: null,
  }

  const effective_shortcuts = $derived({
    ...default_shortcuts,
    ...shortcuts,
  })

  // Extract loadOptions config into single derived object (supports both simple function and config object)
  const load_options_config = $derived.by(() => {
    if (!loadOptions) return null
    const is_fn = typeof loadOptions === `function`
    return {
      fetch: is_fn ? loadOptions : loadOptions.fetch,
      debounce_ms: is_fn ? 300 : (loadOptions.debounceMs ?? 300),
      batch_size: is_fn ? 50 : (loadOptions.batchSize ?? 50),
      on_open: is_fn ? true : (loadOptions.onOpen ?? true),
    }
  })

  // Helper to compare arrays/values for equality to avoid unnecessary updates.
  // Prevents infinite loops when value/selected are bound to reactive wrappers
  // that clone arrays on assignment (e.g. Superforms, Svelte stores). See issue #309.
  // Treats null/undefined/[] as equivalent empty states to prevent extra updates on init (#369).
  function values_equal(val1: unknown, val2: unknown): boolean {
    if (val1 === val2) return true
    const empty1 = val1 == null || (Array.isArray(val1) && val1.length === 0)
    const empty2 = val2 == null || (Array.isArray(val2) && val2.length === 0)
    if (empty1 && empty2) return true
    if (Array.isArray(val1) && Array.isArray(val2)) {
      return (
        val1.length === val2.length &&
        val1.every((item, idx) => item === val2[idx])
      )
    }
    return false
  }

  // Sync selected ↔ value bidirectionally. Use untrack to prevent each effect from
  // reacting to changes in the "destination" value, and values_equal to prevent
  // infinite loops with reactive wrappers that clone arrays. See issue #309.
  $effect.pre(() => {
    const new_value = maxSelect === 1 ? (selected[0] ?? null) : selected
    if (
      !values_equal(
        untrack(() => value),
        new_value,
      )
    ) {
      value = new_value
    }
  })
  $effect.pre(() => {
    const new_selected = maxSelect === 1
      ? (value ? [value as Option] : [])
      : (Array.isArray(value) ? value : [])
    if (
      !values_equal(
        untrack(() => selected),
        new_selected,
      )
    ) {
      selected = new_selected
    }
  })

  let wiggle = $state(false) // controls wiggle animation when user tries to exceed maxSelect
  let ignore_hover = $state(false) // ignore mouseover during keyboard navigation to prevent scroll-triggered hover

  // Track last selection action for aria-live announcements
  let last_action = $state<
    { type: `add` | `remove` | `removeAll`; label: string } | null
  >(null)

  // Clear last_action after announcement so option counts can be announced again
  $effect(() => {
    if (last_action) {
      const timer = setTimeout(() => (last_action = null), 1000)
      return () => clearTimeout(timer)
    }
  })

  // Debounced onsearch event - fires 150ms after search text stops changing
  let search_debounce_timer: ReturnType<typeof setTimeout> | null = null
  let search_initialized = false
  $effect(() => {
    const current_search = searchText
    // Skip initial mount - only fire on actual user input
    if (!search_initialized) {
      search_initialized = true
      return
    }
    if (!onsearch) return // cleanup handles any pending timer

    search_debounce_timer = setTimeout(() => {
      // Optional chaining in case onsearch is removed while timer is pending
      onsearch?.({
        searchText: current_search,
        matchingCount: matchingOptions.length,
      })
    }, 150)
    return () => {
      if (search_debounce_timer) clearTimeout(search_debounce_timer)
    }
  })

  // Internal state for loadOptions feature (null = never loaded)
  let loaded_options = $state<Option[]>([])
  let load_options_has_more = $state(true)
  let load_options_loading = $state(false)
  let load_options_last_search: string | null = $state(null)
  let debounce_timer: ReturnType<typeof setTimeout> | null = null

  let effective_options = $derived(
    loadOptions ? loaded_options : (options ?? []),
  )

  // Cache selected keys and labels to avoid repeated .map() calls
  let selected_keys = $derived(selected.map(key))
  let selected_labels = $derived(selected.map(get_label))
  // Sets for O(1) lookups (used in template, has_user_msg, group_header_state, batch operations)
  let selected_keys_set = $derived(new Set(selected_keys))
  let selected_labels_set = $derived(new Set(selected_labels))

  // Memoized Set of disabled option keys for O(1) lookups in large option sets
  let disabled_option_keys = $derived(
    new Set(
      effective_options
        .filter((opt) => is_object(opt) && opt.disabled)
        .map(key),
    ),
  )

  // Check if an option is disabled (uses memoized Set for O(1) lookup)
  const is_disabled = (opt: Option) => disabled_option_keys.has(key(opt))

  // Group matching options by their `group` key
  // Note: SvelteMap used here to satisfy eslint svelte/prefer-svelte-reactivity rule,
  // though a plain Map would work since this is recreated fresh on each derivation
  let grouped_options = $derived.by((): GroupedOptions<Option>[] => {
    const groups_map = new SvelteMap<string, Option[]>()
    const ungrouped: Option[] = []

    for (const opt of matchingOptions) {
      if (has_group(opt)) {
        const existing = groups_map.get(opt.group)
        if (existing) existing.push(opt)
        else groups_map.set(opt.group, [opt])
      } else {
        ungrouped.push(opt)
      }
    }

    let grouped = [...groups_map.entries()].map(([group, options]) => ({
      group,
      options,
      collapsed: collapsedGroups.has(group),
    }))

    // Apply group sorting if specified
    if (groupSortOrder && groupSortOrder !== `none`) {
      grouped = grouped.toSorted((group_a, group_b) => {
        if (typeof groupSortOrder === `function`) {
          return groupSortOrder(group_a.group, group_b.group)
        }
        const cmp = group_a.group.localeCompare(group_b.group)
        return groupSortOrder === `desc` ? -cmp : cmp
      })
    }

    if (ungrouped.length === 0) return grouped

    const ungrouped_entry = {
      group: null,
      options: ungrouped,
      collapsed: false,
    }
    return ungroupedPosition === `first`
      ? [ungrouped_entry, ...grouped]
      : [...grouped, ungrouped_entry]
  })

  // Flattened options for navigation (excludes options in collapsed groups)
  let navigable_options = $derived(
    grouped_options.flatMap(({ options: group_opts, collapsed }) =>
      collapsed && collapsibleGroups ? [] : group_opts
    ),
  )

  // Pre-computed Map for O(1) index lookups (avoids O(n²) in template)
  let navigable_index_map = $derived(
    new Map(navigable_options.map((opt, idx) => [opt, idx])),
  )

  // Pre-computed group header state (avoids repeated calculations in template)
  type GroupHeaderState = { all_selected: boolean; selected_count: number }
  let group_header_state = $derived.by(() => {
    const state = new SvelteMap<string, GroupHeaderState>()
    for (const { group, options: opts, collapsed } of grouped_options) {
      if (group === null) continue
      const selectable = get_selectable_opts(opts, collapsed)
      const all_selected = selectable.length > 0 &&
        selectable.every((opt) => selected_keys_set.has(key(opt)))
      // Count selected options (only needed when keepSelectedInDropdown is enabled)
      let selected_count = 0
      if (keepSelectedInDropdown) {
        for (const opt of opts) {
          if (selected_keys_set.has(key(opt))) selected_count++
        }
      }
      state.set(group, { all_selected, selected_count })
    }
    return state
  })

  // Update collapsedGroups state: 'add' adds groups, 'delete' removes groups, 'set' replaces all
  function update_collapsed_groups(
    action: `add` | `delete` | `set`,
    groups: string | Iterable<string>,
  ) {
    const items = typeof groups === `string` ? [groups] : [...groups]
    if (action === `set`) collapsedGroups = new SvelteSet(items)
    else {
      const updated = new SvelteSet(collapsedGroups)
      for (const group of items) updated[action](group)
      collapsedGroups = updated
    }
  }

  // Toggle group collapsed state
  function toggle_group_collapsed(group_name: string) {
    const was_collapsed = collapsedGroups.has(group_name)
    update_collapsed_groups(was_collapsed ? `delete` : `add`, group_name)
    ongroupToggle?.({ group: group_name, collapsed: !was_collapsed })
  }

  // Collapse/expand all groups (exposed via bindable props)
  collapseAllGroups = () => {
    const groups = grouped_options
      .map((entry) => entry.group)
      .filter((group_name): group_name is string => group_name !== null)
    if (groups.length === 0) return
    update_collapsed_groups(`set`, groups)
    oncollapseAll?.({ groups })
  }
  expandAllGroups = () => {
    const groups = [...collapsedGroups]
    if (groups.length === 0) return
    update_collapsed_groups(`set`, [])
    onexpandAll?.({ groups })
  }

  // Expand specified groups and fire ongroupToggle for each
  function expand_groups(groups_to_expand: string[]) {
    if (groups_to_expand.length === 0) return
    update_collapsed_groups(`delete`, groups_to_expand)
    for (const group of groups_to_expand) {
      ongroupToggle?.({ group, collapsed: false })
    }
  }

  // Get names of collapsed groups that have matching options
  const get_collapsed_with_matches = () =>
    grouped_options.flatMap(({ group, collapsed, options: opts }) =>
      group && collapsed && opts.length > 0 ? [group] : []
    )

  // Auto-expand collapsed groups when search matches their options
  $effect(() => {
    if (searchExpandsCollapsedGroups && searchText && collapsibleGroups) {
      expand_groups(get_collapsed_with_matches())
    }
  })

  // Normalize placeholder prop (supports string or { text, persistent } object)
  const placeholder_text = $derived(
    typeof placeholder === `string` ? placeholder : (placeholder?.text ?? null),
  )
  const placeholder_persistent = $derived(
    typeof placeholder === `object` && placeholder?.persistent === true,
  )

  // Helper to sort selected options (used by add() and select_all())
  function sort_selected(items: Option[]): Option[] {
    if (sortSelected === true) {
      return items.toSorted((op1, op2) =>
        `${get_label(op1)}`.localeCompare(`${get_label(op2)}`)
      )
    } else if (typeof sortSelected === `function`) {
      return items.toSorted(sortSelected)
    }
    return items
  }

  untrack(() => {
    if (!loadOptions && !((options?.length ?? 0) > 0)) {
      if (allowUserOptions || loading || disabled || allowEmpty) {
        options = [] // initializing as array avoids errors when component mounts
      } else {
        // error on empty options if user is not allowed to create custom options and loading is false
        // and component is not disabled and allowEmpty is false
        console.error(`MultiSelect: received no options`)
      }
    }
  })
  if (maxSelect !== null && maxSelect < 1) {
    console.error(
      `MultiSelect: maxSelect must be null or positive integer, got ${maxSelect}`,
    )
  }
  if (!Array.isArray(selected)) {
    console.error(
      `MultiSelect: selected prop should always be an array, got ${selected}`,
    )
  }
  $effect(() => {
    if (maxSelect && typeof required === `number` && required > maxSelect) {
      console.error(
        `MultiSelect: maxSelect=${maxSelect} < required=${required}, makes it impossible for users to submit a valid form`,
      )
    }
    if (parseLabelsAsHtml && allowUserOptions) {
      console.warn(
        `MultiSelect: don't combine parseLabelsAsHtml and allowUserOptions. It's susceptible to XSS attacks!`,
      )
    }
    if (sortSelected && selectedOptionsDraggable) {
      console.warn(
        `MultiSelect: sortSelected and selectedOptionsDraggable should not be combined as any ` +
          `user re-orderings of selected options will be undone by sortSelected on component re-renders.`,
      )
    }
    if (allowUserOptions && !createOptionMsg && createOptionMsg !== null) {
      console.error(
        `MultiSelect: allowUserOptions=${allowUserOptions} but createOptionMsg=${createOptionMsg} is falsy. ` +
          `This prevents the "Add option" <span> from showing up, resulting in a confusing user experience.`,
      )
    }
    if (
      maxOptions &&
      (typeof maxOptions != `number` || maxOptions < 0 || maxOptions % 1 != 0)
    ) {
      console.error(
        `MultiSelect: maxOptions must be undefined or a positive integer, got ${maxOptions}`,
      )
    }
  })

  let option_msg_is_active = $state(false) // controls active state of <li>{createOptionMsg}</li>
  let window_width = $state(0)

  // Check if option matches search text (label or optionally group name)
  const matches_search = (opt: Option, search: string): boolean => {
    if (filterFunc(opt, search)) return true
    if (searchMatchesGroups && search && has_group(opt)) {
      return fuzzy
        ? fuzzy_match(search, opt.group)
        : opt.group.toLowerCase().includes(search.toLowerCase())
    }
    return false
  }

  $effect.pre(() => {
    // When using loadOptions, server handles filtering, so skip client-side filterFunc
    matchingOptions = effective_options.filter((opt) => {
      // Check if option is already selected and should be excluded
      const keep_in_list = !selected_keys_set.has(key(opt)) ||
        duplicates ||
        keepSelectedInDropdown
      if (!keep_in_list) return false

      // When using loadOptions, server handles filtering; otherwise check search match
      return loadOptions || matches_search(opt, searchText)
    })
  })

  // reset activeIndex if out of bounds (can happen when options change while dropdown is open)
  $effect(() => {
    if (activeIndex !== null && !navigable_options[activeIndex]) {
      activeIndex = null
    }
  })

  // update activeOption when activeIndex changes
  $effect(() => {
    activeOption = navigable_options[activeIndex ?? -1] ?? null
  })

  // Compute the ID of the currently active option for aria-activedescendant
  const active_option_id = $derived(
    activeIndex !== null && activeIndex < navigable_options.length
      ? `${internal_id}-opt-${activeIndex}`
      : undefined,
  )

  // Helper to check if removing an option would violate minSelect constraint
  const can_remove = $derived(
    minSelect === null || selected.length > minSelect,
  )

  // toggle an option between selected and unselected states (for keepSelectedInDropdown mode)
  function toggle_option(option_to_toggle: Option, event: Event) {
    const is_currently_selected = selected_keys_set.has(key(option_to_toggle))

    if (is_currently_selected) {
      if (can_remove) remove(option_to_toggle, event)
    } else add(option_to_toggle, event)
  }

  // add an option to selected list
  function add(option_to_add: Option, event: Event) {
    event.stopPropagation()
    if (maxSelect !== null && selected.length >= maxSelect) wiggle = true
    if (
      !isNaN(Number(option_to_add)) &&
      typeof selected_labels[0] === `number`
    ) {
      option_to_add = Number(option_to_add) as Option // convert to number if possible
    }

    const is_duplicate = selected_keys_set.has(key(option_to_add))
    const max_reached = maxSelect !== null && maxSelect !== 1 &&
      selected.length >= maxSelect
    // Fire events for blocked add attempts
    if (max_reached) {
      onmaxreached?.({ selected, maxSelect, attemptedOption: option_to_add })
    }
    if (is_duplicate && !duplicates) onduplicate?.({ option: option_to_add })

    if (
      (maxSelect === null || maxSelect === 1 || selected.length < maxSelect) &&
      (duplicates || !is_duplicate)
    ) {
      if (
        !effective_options.includes(option_to_add) && // first check if we find option in the options list
        // this has the side-effect of not allowing to user to add the same
        // custom option twice in append mode
        [true, `append`].includes(allowUserOptions) &&
        searchText.length > 0
      ) {
        // user entered text but no options match, so if allowUserOptions = true | 'append', we create
        // a new option from the user-entered text
        if (typeof effective_options[0] === `object`) {
          // if 1st option is an object, we create new option as object to keep type homogeneity
          option_to_add = { label: searchText } as Option
        } else {
          if (
            [`number`, `undefined`].includes(typeof effective_options[0]) &&
            !isNaN(Number(searchText))
          ) {
            // create new option as number if it parses to a number and 1st option is also number or missing
            option_to_add = Number(searchText) as Option
          } else {
            option_to_add = searchText as Option // else create custom option as string
          }
        }
        // Fire oncreate event for all user-created options, regardless of type
        oncreate?.({ option: option_to_add })
        if (allowUserOptions === `append`) {
          if (loadOptions) {
            loaded_options = [...loaded_options, option_to_add]
          } else {
            options = [...(options ?? []), option_to_add]
          }
        }
      }

      if (resetFilterOnAdd) searchText = `` // reset search string on selection
      if ([``, undefined, null].includes(option_to_add as string | null)) {
        console.error(`MultiSelect: encountered falsy option`, option_to_add)
        return
      }
      // for maxSelect = 1 we always replace current option with new one
      if (maxSelect === 1) selected = [option_to_add]
      else {
        selected = sort_selected([...selected, option_to_add])
      }

      clear_validity()
      handle_dropdown_after_select(event)
      last_action = { type: `add`, label: `${get_label(option_to_add)}` }
      onadd?.({ option: option_to_add })
      onchange?.({ option: option_to_add, type: `add` })
    }
  }

  // remove an option from selected list
  function remove(option_to_drop: Option, event: Event) {
    event.stopPropagation()
    if (selected.length === 0) return

    const idx = selected.findIndex((opt) => key(opt) === key(option_to_drop))
    let option_removed = selected[idx]

    if (option_removed === undefined && allowUserOptions) {
      // if option with label could not be found but allowUserOptions is truthy,
      // assume it was created by user and create corresponding option object
      // on the fly for use as event payload
      const is_object_option = typeof effective_options[0] === `object`
      option_removed = (
        is_object_option ? { label: option_to_drop } : option_to_drop
      ) as Option
    }
    if (option_removed === undefined) {
      console.error(
        `MultiSelect: can't remove option ${
          JSON.stringify(
            option_to_drop,
          )
        }, not found in selected list`,
      )
      return
    }

    selected = selected.filter((_, remove_idx) => remove_idx !== idx)
    clear_validity()
    last_action = { type: `remove`, label: `${get_label(option_removed)}` }
    onremove?.({ option: option_removed })
    onchange?.({ option: option_removed, type: `remove` })
  }

  function open_dropdown(event: Event) {
    event.stopPropagation()

    if (disabled) return
    open = true
    if (!(event instanceof FocusEvent)) {
      // avoid double-focussing input when event that opened dropdown was already input FocusEvent
      input?.focus()
    }
    onopen?.({ event })
  }

  function close_dropdown(event: Event, retain_focus = false) {
    open = false
    if (!retain_focus) input?.blur()
    activeIndex = null
    onclose?.({ event })
  }

  function clear_validity() {
    invalid = false
    form_input?.setCustomValidity(``)
  }

  function handle_dropdown_after_select(event: Event) {
    const reached_max = selected.length >= (maxSelect ?? Infinity)
    const should_close = closeDropdownOnSelect === true ||
      closeDropdownOnSelect === `retain-focus` ||
      (closeDropdownOnSelect === `if-mobile` &&
        window_width &&
        window_width < breakpoint)
    if (reached_max || should_close) {
      close_dropdown(event, closeDropdownOnSelect === `retain-focus`)
    } else input?.focus()
  }

  // Check if a user message (create option, duplicate warning, no match) is visible
  const has_user_msg = $derived(
    searchText.length > 0 &&
      Boolean(
        (allowUserOptions && createOptionMsg) ||
          (!duplicates && selected_labels_set.has(searchText)) ||
          (navigable_options.length === 0 && noMatchingOptionsMsg),
      ),
  )

  // Handle arrow key navigation through options (uses navigable_options to skip collapsed groups)
  async function handle_arrow_navigation(direction: 1 | -1) {
    ignore_hover = true

    // Auto-expand collapsed groups when keyboard navigating
    if (
      keyboardExpandsCollapsedGroups &&
      collapsibleGroups &&
      collapsedGroups.size > 0
    ) {
      expand_groups(get_collapsed_with_matches())
      await tick()
    }

    // toggle user message when no options match but user can create
    if (
      allowUserOptions &&
      !navigable_options.length &&
      searchText.length > 0
    ) {
      option_msg_is_active = !option_msg_is_active
      return
    }
    if (activeIndex === null && !navigable_options.length) return // nothing to navigate

    // activate first option or navigate with wrap-around
    if (activeIndex === null) {
      activeIndex = 0
    } else {
      const total = navigable_options.length + (has_user_msg ? 1 : 0)
      // Guard against division by zero (can happen if options filtered away before effect resets activeIndex)
      if (total === 0) {
        activeIndex = null
        return
      }
      activeIndex = (activeIndex + direction + total) % total // +total handles negative mod
    }

    // update active state based on new index
    option_msg_is_active = has_user_msg && activeIndex === navigable_options.length
    activeOption = option_msg_is_active
      ? null
      : (navigable_options[activeIndex] ?? null)

    if (autoScroll) {
      await tick()
      document
        .querySelector(`ul.options > li.active`)
        ?.scrollIntoViewIfNeeded?.()
    }

    // Fire onactivate for keyboard navigation only (not mouse hover)
    onactivate?.({ option: activeOption, index: activeIndex })
  }

  // handle all keyboard events this component receives
  async function handle_keydown(event: KeyboardEvent) {
    if (disabled) return // Block all keyboard handling when disabled

    // Check keyboard shortcuts first (before other key handling)
    const shortcut_actions: Array<{
      key: keyof typeof effective_shortcuts
      condition: () => boolean
      action: () => void
    }> = [
      {
        key: `select_all`,
        condition: () =>
          !!selectAllOption && navigable_options.length > 0 && maxSelect !== 1,
        action: () => select_all(event),
      },
      {
        key: `clear_all`,
        condition: () => selected.length > 0,
        action: () => remove_all(event),
      },
      {
        key: `open`,
        condition: () => !open,
        action: () => open_dropdown(event),
      },
      {
        key: `close`,
        condition: () => open,
        action: () => {
          close_dropdown(event)
          searchText = ``
        },
      },
    ]

    for (const { key, condition, action } of shortcut_actions) {
      if (matches_shortcut(event, effective_shortcuts[key]) && condition()) {
        event.preventDefault()
        event.stopPropagation()
        action()
        return
      }
    }

    // on escape or tab out of input: close options dropdown and reset search text
    if (event.key === `Escape` || event.key === `Tab`) {
      event.stopPropagation()
      close_dropdown(event)
      searchText = ``
    } // on enter key: toggle active option
    else if (event.key === `Enter`) {
      event.stopPropagation()
      event.preventDefault() // prevent enter key from triggering form submission

      if (activeOption) {
        if (selected_keys_set.has(key(activeOption))) {
          if (can_remove) remove(activeOption, event)
        } else add(activeOption, event) // add() handles resetFilterOnAdd internally when successful
      } else if (allowUserOptions && searchText.length > 0) {
        // user entered text but no options match, so if allowUserOptions is truthy, we create new option
        add(searchText as Option, event)
      } else {
        // no active option and no search text means the options dropdown is closed
        // in which case enter means open it
        open_dropdown(event)
      }
    } // on up/down arrow keys: update active option
    else if (event.key === `ArrowDown` || event.key === `ArrowUp`) {
      event.stopPropagation()
      event.preventDefault()
      await handle_arrow_navigation(event.key === `ArrowUp` ? -1 : 1)
    } // on backspace key: remove last selected option
    else if (event.key === `Backspace` && selected.length > 0 && !searchText) {
      event.stopPropagation()
      if (can_remove) {
        const last_option = selected.at(-1)
        if (last_option) remove(last_option, event)
      }
      // Don't prevent default, allow normal backspace behavior if not removing
    } // make first matching option active on any keypress (if none of the above special cases match)
    else if (navigable_options.length > 0 && activeIndex === null) {
      // Don't stop propagation or prevent default here, allow normal character input
      activeIndex = 0
    }
  }

  function remove_all(event: Event) {
    event.stopPropagation()

    // Keep the first minSelect items, remove the rest
    let removed_options: Option[] = []
    if (minSelect === null) {
      // If no minSelect constraint, remove all
      removed_options = selected
      selected = []
    } else if (selected.length > minSelect) {
      // Keep the first minSelect items
      removed_options = selected.slice(minSelect)
      selected = selected.slice(0, minSelect)
    }
    // Only fire events if something was actually removed
    if (removed_options.length > 0) {
      searchText = `` // always clear on remove all (resetFilterOnAdd only applies to add operations)
      last_action = {
        type: `removeAll`,
        label: `${removed_options.length} options`,
      }
      onremoveAll?.({ options: removed_options })
      onchange?.({ options: selected, type: `removeAll` })
    }
  }

  // Check if option index is within maxOptions visibility limit
  const is_option_visible = (idx: number) =>
    idx >= 0 && (maxOptions == null || idx < maxOptions)

  // Get non-disabled, selectable options from a list
  // For collapsed groups: returns all non-disabled options (user explicitly wants this group)
  // For expanded groups/top-level: respects maxOptions rendering limit
  const get_selectable_opts = (opts: Option[], skip_visibility_check = false) =>
    opts.filter((opt) => {
      if (is_disabled(opt)) return false
      if (skip_visibility_check) return true
      return is_option_visible(navigable_index_map.get(opt) ?? -1)
    })

  // Batch-add options to selection with all side effects (used by select_all and group select)
  function batch_add_options(options_to_add: Option[], event: Event) {
    const remaining = Math.max(0, (maxSelect ?? Infinity) - selected.length)
    const to_add = options_to_add
      .filter((opt) => !selected_keys_set.has(key(opt)))
      .slice(0, remaining)

    if (to_add.length === 0) return

    selected = sort_selected([...selected, ...to_add])
    if (resetFilterOnAdd) searchText = ``
    clear_validity()
    handle_dropdown_after_select(event)
    onselectAll?.({ options: to_add })
    onchange?.({ options: selected, type: `selectAll` })
  }

  // Batch-add options for top-level "Select all" (only visible/navigable options)
  function select_all(event: Event) {
    event.stopPropagation()
    batch_add_options(get_selectable_opts(navigable_options), event)
  }

  // Toggle group selection: works even when group is collapsed
  // If all selectable options are selected, deselect them; otherwise select all
  function toggle_group_selection(
    group_opts: Option[],
    group_collapsed: boolean,
    all_selected: boolean,
    event: Event,
  ) {
    event.stopPropagation()
    const selectable = get_selectable_opts(group_opts, group_collapsed)
    if (all_selected) {
      // Deselect all options in this group
      const keys_to_remove = new Set(selectable.map(key))
      const removed = selected.filter((opt) => keys_to_remove.has(key(opt)))
      selected = selected.filter((opt) => !keys_to_remove.has(key(opt)))
      if (removed.length > 0) {
        onremoveAll?.({ options: removed })
        onchange?.({ options: selected, type: `removeAll` })
      }
    } else {
      // Select all non-disabled, non-selected options in this group
      batch_add_options(selectable, event)
    }
  }

  // O(1) lookup using pre-computed Set instead of O(n) array.includes()
  const is_selected = (label: string | number) => selected_labels_set.has(label)

  const if_enter_or_space =
    (handler: (event: KeyboardEvent) => void) => (event: KeyboardEvent) => {
      if (event.key === `Enter` || event.code === `Space`) {
        event.preventDefault()
        handler(event)
      }
    }

  // Handle option interaction (click or keyboard) - DRY helper for template
  const handle_option_interact = (
    opt: Option,
    opt_disabled: boolean | null,
    event: Event,
  ) => {
    if (opt_disabled) return
    if (keepSelectedInDropdown) toggle_option(opt, event)
    else add(opt, event)
  }

  function on_click_outside(event: MouseEvent | TouchEvent) {
    if (!outerDiv) return
    const target = event.target as Node
    // Check if click is inside the main component
    if (outerDiv.contains(target)) return
    // If portal is active, also check if click is inside the portalled options dropdown
    if (portal_params?.active && ul_options && ul_options.contains(target)) {
      return
    }
    // Click is outside both the main component and any portalled dropdown
    close_dropdown(event)
  }

  let drag_idx: number | null = $state(null)
  // event handlers enable dragging to reorder selected options
  const drop = (target_idx: number) => (event: DragEvent) => {
    if (!event.dataTransfer) return
    event.dataTransfer.dropEffect = `move`
    const start_idx = parseInt(event.dataTransfer.getData(`text/plain`))
    const new_selected = [...selected]

    if (start_idx < target_idx) {
      new_selected.splice(target_idx + 1, 0, new_selected[start_idx])
      new_selected.splice(start_idx, 1)
    } else {
      new_selected.splice(target_idx, 0, new_selected[start_idx])
      new_selected.splice(start_idx + 1, 1)
    }
    selected = new_selected
    drag_idx = null
    onreorder?.({ options: new_selected })
    onchange?.({ options: new_selected, type: `reorder` })
  }

  const dragstart = (idx: number) => (event: DragEvent) => {
    if (!event.dataTransfer) return
    // only allow moving, not copying (also affects the cursor during drag)
    event.dataTransfer.effectAllowed = `move`
    event.dataTransfer.dropEffect = `move`
    event.dataTransfer.setData(`text/plain`, `${idx}`)
  }

  let ul_options = $state<HTMLUListElement>()

  const handle_input_keydown: KeyboardEventHandler<HTMLInputElement> = (
    event,
  ) => {
    handle_keydown(event) // Restore internal logic
    // Call original forwarded handler
    onkeydown?.(event)
  }

  const handle_input_focus: FocusEventHandler<HTMLInputElement> = (event) => {
    open_dropdown(event)
    onfocus?.(event)
  }

  // Override input's focus method to ensure dropdown opens on programmatic focus
  // https://github.com/janosh/svelte-multiselect/issues/289
  $effect(() => {
    if (!input) return

    const orig_focus = input.focus.bind(input)

    input.focus = (options?: FocusOptions) => {
      orig_focus(options)
      if (!disabled && !open) {
        open_dropdown(new FocusEvent(`focus`, { bubbles: true }))
      }
    }

    return () => {
      if (input) input.focus = orig_focus
    }
  })

  const handle_input_blur: FocusEventHandler<HTMLInputElement> = (event) => {
    // For portalled dropdowns, don't close on blur since clicks on portalled elements
    // will cause blur but we want to allow the click to register first
    // (otherwise mobile touch event is unable to select options https://github.com/janosh/svelte-multiselect/issues/335)
    if (portal_params?.active) {
      onblur?.(event) // Let the click handler manage closing for portalled dropdowns
      return
    }

    // For non-portalled dropdowns, close when focus moves outside the component
    if (!outerDiv?.contains(event.relatedTarget as Node)) close_dropdown(event)

    onblur?.(event) // Call original handler (if any passed as component prop)
  }

  // reset form validation when required prop changes
  // https://github.com/janosh/svelte-multiselect/issues/285
  $effect.pre(() => {
    required = required // trigger effect when required changes
    form_input?.setCustomValidity(``)
  })

  type PortalParams = { target_node: HTMLElement | null; active?: boolean }
  function portal(node: HTMLElement, params: PortalParams) {
    let { target_node, active } = params
    if (!active) return
    let render_in_place = typeof window === `undefined` ||
      !document.body.contains(node)

    if (!render_in_place) {
      document.body.appendChild(node)
      node.style.position = `fixed`

      const update_position = () => {
        if (!target_node || !open) return (node.hidden = true)
        const rect = target_node.getBoundingClientRect()
        node.style.left = `${rect.left}px`
        node.style.top = `${rect.bottom}px`
        node.style.width = `${rect.width}px`
        node.hidden = false
      }

      if (open) tick().then(update_position)

      window.addEventListener(`scroll`, update_position, true)
      window.addEventListener(`resize`, update_position)

      $effect(() => {
        if (open && target_node) update_position()
        else node.hidden = true
      })

      return {
        update(params: PortalParams) {
          target_node = params.target_node
          render_in_place = typeof window === `undefined` ||
            !document.body.contains(node)
          if (open && !render_in_place && target_node) {
            tick().then(update_position)
          } else if (!open || !target_node) node.hidden = true
        },
        destroy() {
          if (!render_in_place) node.remove()
          window.removeEventListener(`scroll`, update_position, true)
          window.removeEventListener(`resize`, update_position)
        },
      }
    }
  }

  // Dynamic options loading - captures search at call time to avoid race conditions
  async function load_dynamic_options(reset: boolean) {
    if (
      !load_options_config ||
      load_options_loading ||
      (!reset && !load_options_has_more)
    ) {
      return
    }
    // Capture search term at call time to avoid race with user typing during fetch
    const search = searchText
    const offset = reset ? 0 : loaded_options.length
    load_options_loading = true
    try {
      const limit = load_options_config.batch_size
      const result = await load_options_config.fetch({ search, offset, limit })
      loaded_options = reset ? result.options : [...loaded_options, ...result.options]
      load_options_has_more = result.hasMore
      load_options_last_search = search
    } catch (err) {
      console.error(`MultiSelect: loadOptions error:`, err)
    } finally {
      load_options_loading = false
    }
  }

  // Single effect handles initial load + search changes
  $effect(() => {
    if (!load_options_config) return

    // Reset state when dropdown closes so next open triggers fresh load
    if (!open) {
      load_options_last_search = null
      loaded_options = []
      load_options_has_more = true
      return
    }

    if (debounce_timer) clearTimeout(debounce_timer)

    const search = searchText
    const is_first_load = load_options_last_search === null

    if (is_first_load) {
      if (load_options_config.on_open) {
        // Load immediately on dropdown open
        load_dynamic_options(true)
      } else if (search) {
        // onOpen=false but user typed - debounce and load
        debounce_timer = setTimeout(
          () => load_dynamic_options(true),
          load_options_config.debounce_ms,
        )
      }
      // If onOpen=false and no search text, do nothing (wait for user to type)
    } else if (search !== load_options_last_search) {
      // Subsequent loads: debounce search changes
      // Clear stale results immediately so UI doesn't show wrong results while loading
      loaded_options = []
      load_options_has_more = true
      debounce_timer = setTimeout(
        () => load_dynamic_options(true),
        load_options_config.debounce_ms,
      )
    }
    return () => {
      if (debounce_timer) clearTimeout(debounce_timer)
    }
  })

  function handle_options_scroll(event: Event) {
    if (!load_options_config || load_options_loading || !load_options_has_more) {
      return
    }
    const { scrollTop, scrollHeight, clientHeight } = event.target as HTMLElement
    if (scrollHeight - scrollTop - clientHeight <= 100) {
      load_dynamic_options(false)
    }
  }
</script>

<svelte:window
  onclick={on_click_outside}
  ontouchstart={on_click_outside}
  bind:innerWidth={window_width}
/>

<div
  bind:this={outerDiv}
  class:disabled
  class:single={maxSelect === 1}
  class:open
  class:invalid
  class="multiselect {outerDivClass} {rest.class ?? ``}"
  onmouseup={open_dropdown}
  title={disabled ? disabledInputTitle : null}
  data-id={id}
  role="searchbox"
  tabindex="-1"
  {style}
>
  <!-- form control input invisible to the user, only purpose is to abort form submission if this component fails data validation -->
  <!-- bind:value={selected} prevents form submission if required prop is true and no options are selected -->
  <input
    {name}
    required={Boolean(required)}
    value={selected.length >= Number(required) ? JSON.stringify(selected) : null}
    tabindex="-1"
    aria-hidden="true"
    aria-label="ignore this, used only to prevent form submission if select is required but empty"
    class="form-control"
    bind:this={form_input}
    oninvalid={() => {
      invalid = true
      let msg
      if (maxSelect && maxSelect > 1 && Number(required) > 1) {
        msg = `Please select between ${required} and ${maxSelect} options`
      } else if (Number(required) > 1) {
        msg = `Please select at least ${required} options`
      } else {
        msg = `Please select an option`
      }
      form_input?.setCustomValidity(msg)
    }}
  />
  <span class="expand-icon">
    {#if expandIcon}
      {@render expandIcon({ open })}
    {:else}
      <Icon
        icon="ChevronExpand"
        style="width: 15px; min-width: 1em; padding: 0 1pt; cursor: pointer"
      />
    {/if}
  </span>
  <ul
    class="selected {ulSelectedClass}"
    aria-label="selected options"
    style={ulSelectedStyle}
  >
    {#each selected as option, idx (duplicates ? `${key(option)}-${idx}` : key(option))}
      {@const selectedOptionStyle = [get_style(option, `selected`), liSelectedStyle]
        .filter(Boolean)
        .join(` `) || null}
      <li
        class={liSelectedClass}
        role="option"
        aria-selected="true"
        animate:flip={selectedFlipParams}
        draggable={selectedOptionsDraggable && !disabled && selected.length > 1}
        ondragstart={dragstart(idx)}
        ondragover={(event) => {
          event.preventDefault() // needed for ondrop to fire
        }}
        ondrop={drop(idx)}
        ondragenter={() => (drag_idx = idx)}
        class:active={drag_idx === idx}
        style={selectedOptionStyle}
        onmouseup={(event) => event.stopPropagation()}
      >
        {#if selectedItem}
          {@render selectedItem({ option, idx })}
        {:else if children}
          {@render children({ option, idx })}
        {:else if parseLabelsAsHtml}
          {@html get_label(option)}
        {:else}
          {get_label(option)}
        {/if}
        {#if !disabled && can_remove}
          <button
            onclick={(event) => remove(option, event)}
            onkeydown={if_enter_or_space((event) => remove(option, event))}
            type="button"
            title="{removeBtnTitle} {get_label(option)}"
            class="remove"
          >
            {#if removeIcon}
              {@render removeIcon()}
            {:else}
              <Icon icon="Cross" style="width: 15px" />
            {/if}
          </button>
        {/if}
      </li>
    {/each}
    <input
      class={inputClass}
      style={inputStyle}
      bind:this={input}
      bind:value={searchText}
      {id}
      {disabled}
      {autocomplete}
      {inputmode}
      {pattern}
      placeholder={selected.length === 0 || placeholder_persistent ? placeholder_text : null}
      role="combobox"
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-controls={listbox_id}
      aria-activedescendant={active_option_id}
      aria-busy={loading || load_options_loading || null}
      aria-invalid={invalid ? `true` : null}
      ondrop={() => false}
      onmouseup={open_dropdown}
      onkeydown={handle_input_keydown}
      onfocus={handle_input_focus}
      onblur={handle_input_blur}
      {onclick}
      {onkeyup}
      {onmousedown}
      {onmouseenter}
      {onmouseleave}
      {ontouchcancel}
      {ontouchend}
      {ontouchmove}
      {ontouchstart}
      {...rest}
    />
    {@render afterInput?.({
        selected,
        disabled,
        invalid,
        id,
        placeholder: placeholder_text,
        open,
        required,
      })}
  </ul>
  {#if loading}
    {#if spinner}
      {@render spinner()}
    {:else}
      <CircleSpinner />
    {/if}
  {/if}
  {#if disabled}
    {#if disabledIcon}
      {@render disabledIcon()}
    {:else}
      <Icon
        icon="Disabled"
        style="width: 14pt; margin: 0 2pt"
        data-name="disabled-icon"
        aria-disabled="true"
      />
    {/if}
  {:else if selected.length > 0}
    {#if maxSelect && (maxSelect > 1 || maxSelectMsg)}
      <Wiggle bind:wiggle angle={20}>
        <span class="max-select-msg {maxSelectMsgClass}">
          {maxSelectMsg?.(selected.length, maxSelect)}
        </span>
      </Wiggle>
    {/if}
    {#if maxSelect !== 1 && selected.length > 1}
      <button
        type="button"
        class="remove remove-all"
        title={removeAllTitle}
        onclick={remove_all}
        onkeydown={if_enter_or_space(remove_all)}
      >
        {#if removeIcon}
          {@render removeIcon()}
        {:else}
          <Icon icon="Cross" style="width: 15px" />
        {/if}
      </button>
    {/if}
  {/if}

  <!-- only render options dropdown if options or searchText is not empty (needed to avoid briefly flashing empty dropdown) -->
  {#if (searchText && noMatchingOptionsMsg) || effective_options.length > 0 ||
      loadOptions}
    <ul
      use:portal={{ target_node: outerDiv, ...portal_params }}
      {@attach highlight_matches({
        query: searchText,
        disabled: !highlightMatches,
        fuzzy,
        css_class: `sms-search-matches`,
        // don't highlight text in the "Create this option..." message
        node_filter: (node) =>
          node?.parentElement?.closest(`li.user-msg`)
            ? NodeFilter.FILTER_REJECT
            : NodeFilter.FILTER_ACCEPT,
      })}
      id={listbox_id}
      class:hidden={!open}
      class="options {ulOptionsClass}"
      role="listbox"
      aria-multiselectable={maxSelect === null || maxSelect > 1}
      aria-expanded={open}
      aria-disabled={disabled ? `true` : null}
      bind:this={ul_options}
      style={ulOptionsStyle}
      onscroll={handle_options_scroll}
      onmousemove={() => (ignore_hover = false)}
    >
      {#if selectAllOption && effective_options.length > 0 &&
        (maxSelect === null || maxSelect > 1)}
        {@const label = typeof selectAllOption === `string` ? selectAllOption : `Select all`}
        <li
          class="select-all {liSelectAllClass}"
          onclick={select_all}
          onkeydown={if_enter_or_space(select_all)}
          role="option"
          aria-selected="false"
          tabindex="0"
        >
          {label}
        </li>
      {/if}
      {#each grouped_options as
        { group: group_name, options: group_opts, collapsed },
        group_idx
        (group_name ?? `ungrouped-${group_idx}`)
      }
        {#if group_name !== null}
          {@const { all_selected, selected_count } = group_header_state.get(
        group_name,
      ) ?? { all_selected: false, selected_count: 0 }}
          {@const handle_toggle = () =>
        collapsibleGroups && toggle_group_collapsed(group_name)}
          {@const handle_group_select = (event: Event) =>
        toggle_group_selection(group_opts, collapsed, all_selected, event)}
          <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
          <li
            class="group-header {liGroupHeaderClass}"
            class:collapsible={collapsibleGroups}
            class:sticky={stickyGroupHeaders}
            role={collapsibleGroups ? `button` : `presentation`}
            aria-expanded={collapsibleGroups ? !collapsed : undefined}
            aria-label="Group: {group_name}"
            style={liGroupHeaderStyle}
            onclick={handle_toggle}
            onkeydown={if_enter_or_space(handle_toggle)}
            tabindex={collapsibleGroups ? 0 : -1}
          >
            {#if groupHeader}
              {@render groupHeader({ group: group_name, options: group_opts, collapsed })}
            {:else}
              <span class="group-label">{group_name}</span>
              <span class="group-count">
                {#if keepSelectedInDropdown && selected_count > 0}
                  ({selected_count}/{group_opts.length})
                {:else}
                  ({group_opts.length})
                {/if}
              </span>
              {#if groupSelectAll && (maxSelect === null || maxSelect > 1)}
                <button
                  type="button"
                  class="group-select-all"
                  class:deselect={all_selected}
                  onclick={handle_group_select}
                  onkeydown={if_enter_or_space(handle_group_select)}
                >
                  {all_selected ? `Deselect all` : `Select all`}
                </button>
              {/if}
              {#if collapsibleGroups}
                <Icon
                  icon={collapsed ? `ChevronRight` : `ChevronDown`}
                  style="width: 12px; margin-left: auto"
                />
              {/if}
            {/if}
          </li>
        {/if}
        {#if !collapsed || !collapsibleGroups}
          {#each group_opts as
            option_item,
            local_idx
            (duplicates
        ? `${key(option_item)}-${group_idx}-${local_idx}`
        : key(option_item))
          }
            {@const flat_idx = navigable_index_map.get(option_item) ?? -1}
            {@const {
        label,
        disabled = null,
        title = null,
        selectedTitle = null,
        disabledTitle = defaultDisabledTitle,
      } = is_object(option_item) ? option_item : { label: option_item }}
            {@const active = activeIndex === flat_idx && flat_idx >= 0}
            {@const selected = is_selected(label)}
            {@const optionStyle = [get_style(option_item, `option`), liOptionStyle]
        .filter(Boolean)
        .join(` `) || null}
            {#if is_option_visible(flat_idx)}
              <li
                id="{internal_id}-opt-{flat_idx}"
                onclick={(event) => handle_option_interact(option_item, disabled, event)}
                title={disabled ? disabledTitle : (selected && selectedTitle) || title}
                class:selected
                class:active
                class:disabled
                class="{liOptionClass} {active ? liActiveOptionClass : ``}"
                onmouseover={() => {
                  if (!disabled && !ignore_hover) activeIndex = flat_idx
                }}
                onfocus={() => {
                  if (!disabled) activeIndex = flat_idx
                }}
                role="option"
                aria-selected={selected ? `true` : `false`}
                aria-posinset={flat_idx + 1}
                aria-setsize={navigable_options.length}
                style={optionStyle}
                onkeydown={if_enter_or_space((event) =>
                  handle_option_interact(option_item, disabled, event)
                )}
              >
                {#if keepSelectedInDropdown === `checkboxes`}
                  <input
                    type="checkbox"
                    class="option-checkbox"
                    checked={selected}
                    aria-label="Toggle {get_label(option_item)}"
                    tabindex="-1"
                  />
                {/if}
                {#if option}
                  {@render option({ option: option_item, idx: flat_idx })}
                {:else if children}
                  {@render children({ option: option_item, idx: flat_idx })}
                {:else if parseLabelsAsHtml}
                  {@html get_label(option_item)}
                {:else}
                  {get_label(option_item)}
                {/if}
              </li>
            {/if}
          {/each}
        {/if}
      {/each}
      {#if searchText}
        {@const text_input_is_duplicate = selected_labels.includes(searchText)}
        {@const is_dupe = !duplicates && text_input_is_duplicate && `dupe`}
        {@const can_create = Boolean(allowUserOptions && createOptionMsg) && `create`}
        {@const no_match =
        Boolean(navigable_options?.length === 0 && noMatchingOptionsMsg) &&
        `no-match`}
        {@const msgType = is_dupe || can_create || no_match}
        {@const msg = msgType && {
        dupe: duplicateOptionMsg,
        create: createOptionMsg,
        'no-match': noMatchingOptionsMsg,
      }[msgType]}
        {@const can_add_user_option = msgType === `create` && allowUserOptions}
        {@const handle_create = (event: Event) =>
        can_add_user_option && add(searchText as Option, event)}
        {#if msg}
          <li
            onclick={handle_create}
            onkeydown={can_add_user_option ? if_enter_or_space(handle_create) : undefined}
            title={msgType === `create`
            ? createOptionMsg
            : msgType === `dupe`
            ? duplicateOptionMsg
            : ``}
            class:active={option_msg_is_active}
            onmouseover={() => !ignore_hover && (option_msg_is_active = true)}
            onfocus={() => (option_msg_is_active = true)}
            onmouseout={() => (option_msg_is_active = false)}
            onblur={() => (option_msg_is_active = false)}
            role="option"
            aria-selected="false"
            class="
              user-msg {liUserMsgClass} {option_msg_is_active
              ? liActiveUserMsgClass
              : ``}
            "
            style:cursor={{
              dupe: `not-allowed`,
              create: `pointer`,
              'no-match': `default`,
            }[msgType]}
          >
            {#if userMsg}
              {@render userMsg({ searchText, msgType, msg })}
            {:else}
              {msg}
            {/if}
          </li>
        {/if}
      {/if}
      {#if loadOptions && load_options_loading}
        <li
          class="loading-more"
          role="status"
          aria-label="Loading more options"
        >
          <CircleSpinner />
        </li>
      {/if}
    </ul>
  {/if}
  <!-- Screen reader announcements for dropdown state, option count, and selection changes -->
  <div class="sr-only" aria-live="polite" aria-atomic="true">
    {#if last_action}
      {#if last_action.type === `add`}
        {last_action.label} selected
      {:else if last_action.type === `remove`}
        {last_action.label} removed
      {:else if last_action.type === `removeAll`}
        {last_action.label} removed
      {/if}
    {:else if open}
      {matchingOptions.length} option{matchingOptions.length === 1 ? `` : `s`} available
    {/if}
  </div>
</div>

<style>
  /* Screen reader only - visually hidden but accessible to assistive technology */
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  /* Use :where() for elements with user-overridable class props (outerDivClass, ulSelectedClass, liSelectedClass)
     so user-provided classes take precedence. See: https://github.com/janosh/svelte-multiselect/issues/380 */
  :where(div.multiselect) {
    position: relative;
    align-items: center;
    display: flex;
    cursor: text;
    box-sizing: border-box;
    border: var(--sms-border, 1pt solid light-dark(lightgray, #555));
    border-radius: var(--sms-border-radius, 3pt);
    background: var(--sms-bg, light-dark(white, #1a1a1a));
    width: var(--sms-width);
    max-width: var(--sms-max-width);
    padding: var(--sms-padding, 0 3pt);
    color: var(--sms-text-color);
    font-size: var(--sms-font-size, inherit);
    min-height: var(--sms-min-height, 22pt);
    margin: var(--sms-margin);
  }
  :where(div.multiselect.open) {
    /* increase z-index when open to ensure the dropdown of one <MultiSelect />
    displays above that of another slightly below it on the page */
    z-index: var(--sms-open-z-index, 4);
  }
  :where(div.multiselect:focus-within) {
    border: var(
      --sms-focus-border,
      1pt solid var(--sms-active-color, cornflowerblue)
    );
  }
  :where(div.multiselect.disabled) {
    background: var(--sms-disabled-bg, light-dark(lightgray, #444));
    cursor: not-allowed;
  }

  :where(div.multiselect > ul.selected) {
    display: flex;
    flex: 1;
    padding: 0;
    margin: 0;
    flex-wrap: wrap;
  }
  :where(div.multiselect > ul.selected > li) {
    align-items: center;
    border-radius: 3pt;
    display: flex;
    margin: 2pt;
    line-height: normal;
    transition: 0.3s;
    white-space: nowrap;
    background: var(
      --sms-selected-bg,
      light-dark(rgba(0, 0, 0, 0.15), rgba(255, 255, 255, 0.15))
    );
    padding: var(--sms-selected-li-padding, 1pt 5pt);
    color: var(--sms-selected-text-color, var(--sms-text-color));
  }
  :where(div.multiselect > ul.selected > li[draggable='true']) {
    cursor: grab;
  }
  :where(div.multiselect > ul.selected > li.active) {
    background: var(
      --sms-li-active-bg,
      var(
        --sms-active-color,
        light-dark(rgba(0, 0, 0, 0.15), rgba(255, 255, 255, 0.15))
      )
    );
  }
  :is(div.multiselect button) {
    border-radius: 50%;
    aspect-ratio: 1; /* ensure circle, not ellipse */
    display: flex;
    transition: 0.2s;
    color: inherit;
    background: transparent;
    border: none;
    cursor: pointer;
    outline: none;
    padding: 1pt;
    margin: 0 0 0 3pt; /* CSS reset */
  }
  :is(div.multiselect button.remove-all) {
    margin: 0 3pt;
  }
  :is(ul.selected > li button:hover, button.remove-all:hover, button:focus) {
    color: var(--sms-remove-btn-hover-color, light-dark(#0088cc, lightskyblue));
    background: var(
      --sms-remove-btn-hover-bg,
      light-dark(rgba(0, 0, 0, 0.2), rgba(255, 255, 255, 0.2))
    );
  }

  :is(div.multiselect input) {
    margin: auto 0; /* CSS reset */
    padding: 0; /* CSS reset */
  }
  :where(div.multiselect > ul.selected > input) {
    border: none;
    outline: none;
    background: none;
    flex: 1; /* this + next line fix issue #12 https://git.io/JiDe3 */
    min-width: 2em;
    /* ensure input uses text color and not --sms-selected-text-color */
    color: var(--sms-text-color);
    font-size: inherit;
    cursor: inherit; /* needed for disabled state */
    border-radius: 0; /* reset ul.selected > li */
  }

  /* When options are selected, placeholder is hidden in which case we minimize input width to avoid adding unnecessary width to div.multiselect */
  :where(div.multiselect > ul.selected > input:not(:placeholder-shown)) {
    min-width: 1px; /* Minimal width to remain interactive */
  }

  /* don't wrap ::placeholder rules in :is() as it seems to be overpowered by browser defaults i.t.o. specificity */
  div.multiselect > ul.selected > input::placeholder {
    padding-left: 5pt;
    color: var(--sms-placeholder-color);
    opacity: var(--sms-placeholder-opacity);
  }
  :is(div.multiselect > input.form-control) {
    width: 2em;
    position: absolute;
    background: transparent;
    border: none;
    outline: none;
    z-index: -1;
    opacity: 0;
    pointer-events: none;
  }

  /* Use :where() for ul.options elements with class props (ulOptionsClass, liOptionClass, liUserMsgClass) */
  :where(ul.options) {
    list-style: none;
    /* top, left, width, position are managed by portal when active */
    /* but provide defaults for non-portaled or initial state */
    position: absolute; /* Default, overridden by portal to fixed when open */
    top: 100%;
    left: 0;
    width: 100%;
    /* Default z-index if not portaled/overridden by portal */
    z-index: var(--sms-options-z-index, 3);
    overflow: auto;
    transition: all 0.2s; /* is this transition is desirable with portal positioning? */
    box-sizing: border-box;
    background: var(--sms-options-bg, light-dark(#fafafa, #1a1a1a));
    max-height: var(--sms-options-max-height, 50vh);
    overscroll-behavior: var(--sms-options-overscroll, none);
    box-shadow: var(
      --sms-options-shadow,
      light-dark(0 0 14pt -8pt black, 0 0 14pt -4pt rgba(0, 0, 0, 0.8))
    );
    border: var(--sms-options-border);
    border-width: var(--sms-options-border-width);
    border-radius: var(--sms-options-border-radius, 1ex);
    padding: var(--sms-options-padding);
    margin: var(--sms-options-margin, 6pt 0 0 0);
  }
  :where(ul.options.hidden) {
    visibility: hidden;
    opacity: 0;
    transform: translateY(50px);
    pointer-events: none;
  }
  :where(ul.options > li) {
    padding: 3pt 1ex;
    cursor: pointer;
    scroll-margin: var(--sms-options-scroll-margin, 100px);
    border-left: 3px solid transparent;
  }
  :where(ul.options .user-msg) {
    /* block needed so vertical padding applies to span */
    display: block;
    padding: 3pt 2ex;
  }
  :where(ul.options > li.selected) {
    background: var(
      --sms-li-selected-plain-bg,
      light-dark(rgba(0, 123, 255, 0.1), rgba(100, 180, 255, 0.2))
    );
    border-left: var(
      --sms-li-selected-plain-border,
      3px solid var(--sms-active-color, cornflowerblue)
    );
  }
  :where(ul.options > li.active) {
    background: var(
      --sms-li-active-bg,
      var(
        --sms-active-color,
        light-dark(rgba(0, 0, 0, 0.15), rgba(255, 255, 255, 0.15))
      )
    );
  }
  :where(ul.options > li.disabled) {
    cursor: not-allowed;
    background: var(--sms-li-disabled-bg, light-dark(#f5f5f6, #2a2a2a));
    color: var(--sms-li-disabled-text, light-dark(#b8b8b8, #666));
  }
  /* Checkbox styling for keepSelectedInDropdown='checkboxes' mode - internal, no class prop */
  :is(ul.options > li > input.option-checkbox) {
    width: 16px;
    height: 16px;
    margin-right: 6px;
    accent-color: var(--sms-active-color, cornflowerblue);
  }
  /* Select all option styling - has liSelectAllClass prop */
  :where(ul.options > li.select-all) {
    border-bottom: var(
      --sms-select-all-border-bottom,
      1px solid light-dark(lightgray, #555)
    );
    font-weight: var(--sms-select-all-font-weight, 500);
    color: var(--sms-select-all-color, inherit);
    background: var(--sms-select-all-bg, transparent);
    margin-bottom: var(--sms-select-all-margin-bottom, 2pt);
  }
  :where(ul.options > li.select-all:hover) {
    background: var(
      --sms-select-all-hover-bg,
      var(
        --sms-li-active-bg,
        var(
          --sms-active-color,
          light-dark(rgba(0, 0, 0, 0.15), rgba(255, 255, 255, 0.15))
        )
      )
    );
  }
  /* Group header styling - has liGroupHeaderClass prop */
  :where(ul.options > li.group-header) {
    display: flex;
    align-items: center;
    font-weight: var(--sms-group-header-font-weight, 600);
    font-size: var(--sms-group-header-font-size, 0.85em);
    color: var(--sms-group-header-color, light-dark(#666, #aaa));
    background: var(--sms-group-header-bg, transparent);
    padding: var(--sms-group-header-padding, 6pt 1ex 3pt);
    cursor: default;
    border-left: none;
    text-transform: var(--sms-group-header-text-transform, uppercase);
    letter-spacing: var(--sms-group-header-letter-spacing, 0.5px);
  }
  :where(ul.options > li.group-header:not(:first-child)) {
    margin-top: var(--sms-group-header-margin-top, 4pt);
    border-top: var(
      --sms-group-header-border-top,
      1px solid light-dark(#eee, #333)
    );
  }
  :where(ul.options > li.group-header.collapsible) {
    cursor: pointer;
  }
  :where(ul.options > li.group-header.collapsible:hover) {
    background: var(
      --sms-group-header-hover-bg,
      light-dark(rgba(0, 0, 0, 0.05), rgba(255, 255, 255, 0.05))
    );
  }
  /* Internal elements without class props - keep :is() for specificity */
  :is(ul.options > li.group-header .group-label) {
    flex: 1;
  }
  :is(ul.options > li.group-header .group-count) {
    opacity: 0.6;
    font-size: 0.9em;
    font-weight: normal;
    margin-left: 4pt;
  }
  /* Sticky group headers when enabled */
  :where(ul.options > li.group-header.sticky) {
    position: sticky;
    top: 0;
    z-index: 1;
    background: var(
      --sms-group-header-sticky-bg,
      var(--sms-options-bg, light-dark(#fafafa, #1a1a1a))
    );
  }
  /* Indent grouped options for visual hierarchy */
  :where(
    ul.options > li:not(.group-header):not(.select-all):not(.user-msg):not(.loading-more)
  ) {
    padding-left: var(
      --sms-group-item-padding-left,
      var(--sms-group-option-indent, 1.5ex)
    );
  }
  /* Collapse/expand animation for group chevron icon - internal, keep :is() for specificity */
  :is(ul.options > li.group-header) :global(svg) {
    transition: transform var(--sms-group-collapse-duration, 0.15s) ease-out;
  }
  /* Keep :is() for internal buttons without class props */
  :is(ul.options > li.group-header button.group-select-all) {
    font-size: 0.9em;
    font-weight: normal;
    text-transform: none;
    color: var(--sms-active-color, cornflowerblue);
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 2pt 4pt;
    margin-left: 8pt;
    border-radius: 3pt;
    aspect-ratio: auto; /* override global button aspect-ratio: 1 */
  }
  :is(ul.options > li.group-header button.group-select-all:hover) {
    background: var(
      --sms-group-select-all-hover-bg,
      light-dark(rgba(0, 0, 0, 0.1), rgba(255, 255, 255, 0.1))
    );
  }
  :is(ul.options > li.group-header button.group-select-all.deselect) {
    color: var(--sms-group-deselect-color, light-dark(#c44, #f77));
  }
  :where(span.max-select-msg) {
    padding: 0 3pt;
  }
  ::highlight(sms-search-matches) {
    color: light-dark(#1a8870, mediumaquamarine);
  }
  /* Loading more indicator for infinite scrolling - internal, no class prop */
  :is(ul.options > li.loading-more) {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 8pt;
    cursor: default;
  }
</style>
