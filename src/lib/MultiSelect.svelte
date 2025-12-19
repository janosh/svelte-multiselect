<!-- eslint-disable-next-line @stylistic/quotes -- TS generics require string literals -->
<script lang="ts" generics="Option extends import('./types').Option">
  import { tick } from 'svelte'
  import { flip } from 'svelte/animate'
  import type { FocusEventHandler, KeyboardEventHandler } from 'svelte/elements'
  import { highlight_matches } from './attachments'
  import CircleSpinner from './CircleSpinner.svelte'
  import Icon from './Icon.svelte'
  import type { MultiSelectProps } from './types'
  import { fuzzy_match, get_label, get_style } from './utils'
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
    maxSelect = null,
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
        ? (Array.isArray(value) ? value : [value])
        : (options
          ?.filter((opt) => opt instanceof Object && opt?.preselected)
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
    portal: portal_params = {},
    // Select all feature
    selectAllOption = false,
    liSelectAllClass = ``,
    // Dynamic options loading
    loadOptions,
    // Animation parameters for selected options flip animation
    selectedFlipParams = { duration: 100 },
    ...rest
  }: MultiSelectProps<Option> = $props()

  // Extract loadOptions function and config (supports both simple function and config object)
  const load_options_fn = $derived(
    loadOptions
      ? (typeof loadOptions === `function` ? loadOptions : loadOptions.fetch)
      : null,
  )
  const load_options_debounce_ms = $derived(
    loadOptions && typeof loadOptions === `object`
      ? (loadOptions.debounceMs ?? 300)
      : 300,
  )
  const load_options_batch_size = $derived(
    loadOptions && typeof loadOptions === `object`
      ? (loadOptions.batchSize ?? 50)
      : 50,
  )
  const load_options_on_open = $derived(
    loadOptions && typeof loadOptions === `object`
      ? (loadOptions.onOpen ?? true)
      : true,
  )

  $effect.pre(() => {
    // if maxSelect=1, value is the single item in selected (or null if selected is empty)
    // this solves both https://github.com/janosh/svelte-multiselect/issues/86 and
    // https://github.com/janosh/svelte-multiselect/issues/136
    value = maxSelect === 1 ? (selected[0] ?? null) : selected
  }) // sync selected updates to value
  $effect.pre(() => {
    if (maxSelect === 1) selected = value ? [value as Option] : []
    else selected = (value as Option[]) ?? []
  }) // sync value updates to selected

  let wiggle = $state(false) // controls wiggle animation when user tries to exceed maxSelect
  let ignore_hover = $state(false) // ignore mouseover during keyboard navigation to prevent scroll-triggered hover

  // Internal state for loadOptions feature (null = never loaded)
  let loaded_options = $state<Option[]>([])
  let load_options_has_more = $state(true)
  let load_options_loading = $state(false)
  let load_options_last_search: string | null = $state(null)
  let debounce_timer: ReturnType<typeof setTimeout> | null = null

  let effective_options = $derived(loadOptions ? loaded_options : (options ?? []))

  // Cache selected keys and labels to avoid repeated .map() calls
  let selected_keys = $derived(selected.map(key))
  let selected_labels = $derived(selected.map(get_label))

  // Normalize placeholder prop (supports string or { text, persistent } object)
  const placeholder_text = $derived(
    typeof placeholder === `string` ? placeholder : placeholder?.text ?? null,
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

  if (!loadOptions && !((options?.length ?? 0) > 0)) {
    if (allowUserOptions || loading || disabled || allowEmpty) {
      options = [] // initializing as array avoids errors when component mounts
    } else {
      // error on empty options if user is not allowed to create custom options and loading is false
      // and component is not disabled and allowEmpty is false
      console.error(`MultiSelect received no options`)
    }
  }
  if (maxSelect !== null && maxSelect < 1) {
    console.error(
      `MultiSelect's maxSelect must be null or positive integer, got ${maxSelect}`,
    )
  }
  if (!Array.isArray(selected)) {
    console.error(
      `MultiSelect's selected prop should always be an array, got ${selected}`,
    )
  }
  if (maxSelect && typeof required === `number` && required > maxSelect) {
    console.error(
      `MultiSelect maxSelect=${maxSelect} < required=${required}, makes it impossible for users to submit a valid form`,
    )
  }
  if (parseLabelsAsHtml && allowUserOptions) {
    console.warn(
      `Don't combine parseLabelsAsHtml and allowUserOptions. It's susceptible to XSS attacks!`,
    )
  }
  if (sortSelected && selectedOptionsDraggable) {
    console.warn(
      `MultiSelect's sortSelected and selectedOptionsDraggable should not be combined as any ` +
        `user re-orderings of selected options will be undone by sortSelected on component re-renders.`,
    )
  }
  if (allowUserOptions && !createOptionMsg && createOptionMsg !== null) {
    console.error(
      `MultiSelect has allowUserOptions=${allowUserOptions} but createOptionMsg=${createOptionMsg} is falsy. ` +
        `This prevents the "Add option" <span> from showing up, resulting in a confusing user experience.`,
    )
  }
  if (
    maxOptions &&
    (typeof maxOptions != `number` || maxOptions < 0 || maxOptions % 1 != 0)
  ) {
    console.error(
      `MultiSelect's maxOptions must be undefined or a positive integer, got ${maxOptions}`,
    )
  }

  let option_msg_is_active = $state(false) // controls active state of <li>{createOptionMsg}</li>
  let window_width = $state(0)

  // options matching the current search text
  $effect.pre(() => {
    // When using loadOptions, server handles filtering, so skip client-side filterFunc
    const opts_to_filter = effective_options
    matchingOptions = opts_to_filter.filter(
      (opt) =>
        (loadOptions || filterFunc(opt, searchText)) &&
        // remove already selected options from dropdown list unless duplicate selections are allowed
        // or keepSelectedInDropdown is enabled
        (!selected_keys.includes(key(opt)) || duplicates || keepSelectedInDropdown),
    )
  })

  // raise if matchingOptions[activeIndex] does not yield a value
  if (activeIndex !== null && !matchingOptions[activeIndex]) {
    throw new Error(
      `Run time error, activeIndex=${activeIndex} is out of bounds, matchingOptions.length=${matchingOptions.length}`,
    )
  }

  // update activeOption when activeIndex changes
  $effect(() => {
    activeOption = matchingOptions[activeIndex ?? -1] ?? null
  })

  // toggle an option between selected and unselected states (for keepSelectedInDropdown mode)
  function toggle_option(option_to_toggle: Option, event: Event) {
    const is_currently_selected = selected_keys.includes(key(option_to_toggle))

    if (is_currently_selected) {
      if (minSelect === null || selected.length > minSelect) { // Only remove if it wouldn't violate minSelect
        remove(option_to_toggle, event)
      }
    } else add(option_to_toggle, event)
  }

  // add an option to selected list
  function add(option_to_add: Option, event: Event) {
    event.stopPropagation()
    if (maxSelect !== null && selected.length >= maxSelect) wiggle = true
    if (
      !isNaN(Number(option_to_add)) && typeof selected_labels[0] === `number`
    ) {
      option_to_add = Number(option_to_add) as Option // convert to number if possible
    }

    const is_duplicate = selected_keys.includes(key(option_to_add))
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
        console.error(`MultiSelect: encountered falsy option ${option_to_add}`)
        return
      }
      // for maxSelect = 1 we always replace current option with new one
      if (maxSelect === 1) selected = [option_to_add]
      else {
        selected = sort_selected([...selected, option_to_add])
      }

      clear_validity()
      handle_dropdown_after_select(event)
      onadd?.({ option: option_to_add })
      onchange?.({ option: option_to_add, type: `add` })
    }
  }

  // remove an option from selected list
  function remove(option_to_drop: Option, event: Event) {
    event.stopPropagation()
    if (selected.length === 0) return

    const idx = selected.findIndex((opt) => key(opt) === key(option_to_drop))

    let [option_removed] = selected.splice(idx, 1) // remove option from selected list

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
      return console.error(
        `Multiselect can't remove selected option ${
          JSON.stringify(option_to_drop)
        }, not found in selected list`,
      )
    }

    selected = [...selected] // trigger Svelte rerender
    clear_validity()
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
      (closeDropdownOnSelect === `if-mobile` && window_width &&
        window_width < breakpoint)
    if (reached_max || should_close) {
      close_dropdown(event, closeDropdownOnSelect === `retain-focus`)
    } else input?.focus()
  }

  // handle all keyboard events this component receives
  async function handle_keydown(event: KeyboardEvent) {
    // on escape or tab out of input: close options dropdown and reset search text
    if (event.key === `Escape` || event.key === `Tab`) {
      event.stopPropagation()
      close_dropdown(event)
      searchText = ``
    } // on enter key: toggle active option and reset search text
    else if (event.key === `Enter`) {
      event.stopPropagation()
      event.preventDefault() // prevent enter key from triggering form submission

      if (activeOption) {
        if (selected_keys.includes(key(activeOption))) {
          // Only remove if it wouldn't violate minSelect
          if (minSelect === null || selected.length > minSelect) {
            remove(activeOption, event)
            if (resetFilterOnAdd) searchText = ``
          }
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
    else if ([`ArrowDown`, `ArrowUp`].includes(event.key)) {
      event.stopPropagation()
      ignore_hover = true // prevent scroll-triggered mouseover from changing activeIndex
      // if no option is active yet, but there are matching options, make first one active
      if (activeIndex === null && matchingOptions.length > 0) {
        event.preventDefault() // Prevent scroll only if we handle the key
        activeIndex = 0
        return
      } else if (
        allowUserOptions && !matchingOptions.length && searchText.length > 0
      ) {
        event.preventDefault() // Prevent scroll only if we handle the key
        // if allowUserOptions is truthy and user entered text but no options match, we make
        // <li>{addUserMsg}</li> active on keydown (or toggle it if already active)
        option_msg_is_active = !option_msg_is_active
        return
      } else if (activeIndex === null) {
        // if no option is active and no options are matching, do nothing
        return
      }
      event.preventDefault() // Prevent scroll only if we handle the key
      // if none of the above special cases apply, we make next/prev option
      // active with wrap around at both ends
      const increment = event.key === `ArrowUp` ? -1 : 1

      // Include user message in total count if it exists
      const has_user_msg = searchText && (
        (allowUserOptions && createOptionMsg) ||
        (!duplicates && selected_labels.includes(searchText)) ||
        (matchingOptions.length === 0 && noMatchingOptionsMsg)
      )
      const total_items = matchingOptions.length + (has_user_msg ? 1 : 0)

      activeIndex = (activeIndex + increment) % total_items
      // in JS % behaves like remainder operator, not real modulo, so negative numbers stay negative
      // need to do manual wrap around at 0
      if (activeIndex < 0) activeIndex = total_items - 1

      // Handle user message activation
      if (has_user_msg && activeIndex === matchingOptions.length) {
        option_msg_is_active = true
        activeOption = null
      } else {
        option_msg_is_active = false
        activeOption = matchingOptions[activeIndex] ?? null
      }

      if (autoScroll) {
        await tick()
        const li = document.querySelector(`ul.options > li.active`)
        if (li) li.scrollIntoViewIfNeeded?.()
      }
    } // on backspace key: remove last selected option
    else if (event.key === `Backspace` && selected.length > 0 && !searchText) {
      event.stopPropagation()
      // Only remove option if it wouldn't violate minSelect
      if (minSelect === null || selected.length > minSelect) {
        const last_option = selected.at(-1)
        if (last_option) remove(last_option, event)
      }
      // Don't prevent default, allow normal backspace behavior if not removing
    } // make first matching option active on any keypress (if none of the above special cases match)
    else if (matchingOptions.length > 0 && activeIndex === null) {
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
      searchText = `` // always clear on remove all (resetFilterOnAdd only applies to add operations)
    } else if (selected.length > minSelect) {
      // Keep the first minSelect items
      removed_options = selected.slice(minSelect)
      selected = selected.slice(0, minSelect)
      searchText = `` // always clear on remove all (resetFilterOnAdd only applies to add operations)
    }
    onremoveAll?.({ options: removed_options })
    onchange?.({ options: selected, type: `removeAll` })
    // If selected.length <= minSelect, do nothing (can't remove any more)
  }

  function select_all(event: Event) {
    event.stopPropagation()
    const limit = maxSelect ?? Infinity
    // Use matchingOptions for "select all visible" semantics
    const options_to_add = matchingOptions.filter((opt) => {
      const is_disabled = opt instanceof Object && opt.disabled
      return !is_disabled && !selected_keys.includes(key(opt))
    }).slice(0, limit - selected.length)

    if (options_to_add.length > 0) {
      selected = sort_selected([...selected, ...options_to_add])
      if (resetFilterOnAdd) searchText = ``
      clear_validity()
      handle_dropdown_after_select(event)
      onselectAll?.({ options: options_to_add })
      onchange?.({ options: selected, type: `selectAll` })
    }
  }

  let is_selected = $derived((label: string | number) =>
    selected_labels.includes(label)
  )

  const if_enter_or_space =
    (handler: (event: KeyboardEvent) => void) => (event: KeyboardEvent) => {
      if (event.key === `Enter` || event.code === `Space`) {
        event.preventDefault()
        handler(event)
      }
    }

  function on_click_outside(event: MouseEvent | TouchEvent) {
    if (!outerDiv) return
    const target = event.target as Node
    // Check if click is inside the main component
    if (outerDiv.contains(target)) return
    // If portal is active, also check if click is inside the portalled options dropdown
    if (portal_params?.active && ul_options && ul_options.contains(target)) return
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
  }

  const dragstart = (idx: number) => (event: DragEvent) => {
    if (!event.dataTransfer) return
    // only allow moving, not copying (also affects the cursor during drag)
    event.dataTransfer.effectAllowed = `move`
    event.dataTransfer.dropEffect = `move`
    event.dataTransfer.setData(`text/plain`, `${idx}`)
  }

  let ul_options = $state<HTMLUListElement>()

  const handle_input_keydown: KeyboardEventHandler<HTMLInputElement> = (event) => {
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
          if (open && !render_in_place && target_node) tick().then(update_position)
          else if (!open || !target_node) node.hidden = true
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
      !load_options_fn || load_options_loading || (!reset && !load_options_has_more)
    ) {
      return
    }
    // Capture search term at call time to avoid race with user typing during fetch
    const search = searchText
    const offset = reset ? 0 : loaded_options.length
    load_options_loading = true
    try {
      const limit = load_options_batch_size
      const result = await load_options_fn({ search, offset, limit })
      loaded_options = reset ? result.options : [...loaded_options, ...result.options]
      load_options_has_more = result.hasMore
      load_options_last_search = search
    } catch (err) {
      console.error(`MultiSelect loadOptions error:`, err)
    } finally {
      load_options_loading = false
    }
  }

  // Single effect handles initial load + search changes
  $effect(() => {
    if (!load_options_fn) return

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
      if (load_options_on_open) {
        // Load immediately on dropdown open
        load_dynamic_options(true)
      } else if (search) {
        // onOpen=false but user typed - debounce and load
        debounce_timer = setTimeout(
          () => load_dynamic_options(true),
          load_options_debounce_ms,
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
        load_options_debounce_ms,
      )
    }
    return () => {
      if (debounce_timer) clearTimeout(debounce_timer)
    }
  })

  function handle_options_scroll(event: Event) {
    if (!load_options_fn || load_options_loading || !load_options_has_more) return
    const { scrollTop, scrollHeight, clientHeight } = event.target as HTMLElement
    if (scrollHeight - scrollTop - clientHeight <= 100) load_dynamic_options(false)
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
  {#if expandIcon}
    {@render expandIcon({ open })}
  {:else}
    <Icon
      icon="ChevronExpand"
      style="width: 15px; min-width: 1em; padding: 0 1pt; cursor: pointer"
    />
  {/if}
  <ul
    class="selected {ulSelectedClass}"
    aria-label="selected options"
    style={ulSelectedStyle}
  >
    {#each selected as option, idx (duplicates ? `${key(option)}-${idx}` : key(option))}
      {@const selectedOptionStyle =
        [get_style(option, `selected`), liSelectedStyle].filter(Boolean).join(
          ` `,
        ) ||
        null}
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
          {@render selectedItem({
          option,
          idx,
        })}
        {:else if children}
          {@render children({
          option,
          idx,
        })}
        {:else if parseLabelsAsHtml}
          {@html get_label(option)}
        {:else}
          {get_label(option)}
        {/if}
        {#if !disabled && (minSelect === null || selected.length > minSelect)}
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
      {#each matchingOptions.slice(
        0,
        maxOptions == null ? Infinity : Math.max(0, maxOptions),
      ) as
        option_item,
        idx
        (duplicates ? `${key(option_item)}-${idx}` : key(option_item))
      }
        {@const {
        label,
        disabled = null,
        title = null,
        selectedTitle = null,
        disabledTitle = defaultDisabledTitle,
      } = option_item instanceof Object ? option_item : { label: option_item }}
        {@const active = activeIndex === idx}
        {@const selected = is_selected(label)}
        {@const optionStyle =
        [get_style(option_item, `option`), liOptionStyle].filter(Boolean).join(
          ` `,
        ) ||
        null}
        <li
          onclick={(event) => {
            if (disabled) return
            if (keepSelectedInDropdown) toggle_option(option_item, event)
            else add(option_item, event)
          }}
          title={disabled ? disabledTitle : (selected && selectedTitle) || title}
          class:selected
          class:active
          class:disabled
          class="{liOptionClass} {active ? liActiveOptionClass : ``}"
          onmouseover={() => {
            if (!disabled && !ignore_hover) activeIndex = idx
          }}
          onfocus={() => {
            if (!disabled) activeIndex = idx
          }}
          role="option"
          aria-selected={selected ? `true` : `false`}
          style={optionStyle}
          onkeydown={(event) => {
            if (!disabled && (event.key === `Enter` || event.code === `Space`)) {
              event.preventDefault()
              if (keepSelectedInDropdown) toggle_option(option_item, event)
              else add(option_item, event)
            }
          }}
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
            {@render option({
          option: option_item,
          idx,
        })}
          {:else if children}
            {@render children({
          option: option_item,
          idx,
        })}
          {:else if parseLabelsAsHtml}
            {@html get_label(option_item)}
          {:else}
            {get_label(option_item)}
          {/if}
        </li>
      {/each}
      {#if searchText}
        {@const text_input_is_duplicate = selected_labels.includes(searchText)}
        {@const is_dupe = !duplicates && text_input_is_duplicate && `dupe`}
        {@const can_create = Boolean(allowUserOptions && createOptionMsg) && `create`}
        {@const no_match = Boolean(matchingOptions?.length === 0 && noMatchingOptionsMsg) &&
        `no-match`}
        {@const msgType = is_dupe || can_create || no_match}
        {#if msgType}
          {@const msg = {
        dupe: duplicateOptionMsg,
        create: createOptionMsg,
        'no-match': noMatchingOptionsMsg,
      }[msgType]}
          <li
            onclick={(event) => {
              if (msgType === `create` && allowUserOptions) {
                add(searchText as Option, event)
              }
            }}
            onkeydown={(event) => {
              if (
                msgType === `create` &&
                allowUserOptions &&
                (event.key === `Enter` || event.code === `Space`)
              ) {
                event.preventDefault()
                add(searchText as Option, event)
              }
            }}
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
        <li class="loading-more" role="status" aria-label="Loading more options">
          <CircleSpinner />
        </li>
      {/if}
    </ul>
  {/if}
</div>

<style>
  :is(div.multiselect) {
    position: relative;
    align-items: center;
    display: flex;
    cursor: text;
    box-sizing: border-box;
    border: var(--sms-border, 1pt solid lightgray);
    border-radius: var(--sms-border-radius, 3pt);
    background: var(--sms-bg);
    width: var(--sms-width);
    max-width: var(--sms-max-width);
    padding: var(--sms-padding, 0 3pt);
    color: var(--sms-text-color);
    font-size: var(--sms-font-size, inherit);
    min-height: var(--sms-min-height, 22pt);
    margin: var(--sms-margin);
  }
  :is(div.multiselect.open) {
    /* increase z-index when open to ensure the dropdown of one <MultiSelect />
    displays above that of another slightly below it on the page */
    z-index: var(--sms-open-z-index, 4);
  }
  :is(div.multiselect:focus-within) {
    border: var(--sms-focus-border, 1pt solid var(--sms-active-color, cornflowerblue));
  }
  :is(div.multiselect.disabled) {
    background: var(--sms-disabled-bg, lightgray);
    cursor: not-allowed;
  }

  :is(div.multiselect > ul.selected) {
    display: flex;
    flex: 1;
    padding: 0;
    margin: 0;
    flex-wrap: wrap;
  }
  :is(div.multiselect > ul.selected > li) {
    align-items: center;
    border-radius: 3pt;
    display: flex;
    margin: 2pt;
    line-height: normal;
    transition: 0.3s;
    white-space: nowrap;
    background: var(--sms-selected-bg, rgba(0, 0, 0, 0.15));
    padding: var(--sms-selected-li-padding, 1pt 5pt);
    color: var(--sms-selected-text-color, var(--sms-text-color));
  }
  :is(div.multiselect > ul.selected > li[draggable='true']) {
    cursor: grab;
  }
  :is(div.multiselect > ul.selected > li.active) {
    background: var(--sms-li-active-bg, var(--sms-active-color, rgba(0, 0, 0, 0.15)));
  }
  :is(div.multiselect button) {
    border-radius: 50%;
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
    color: var(--sms-remove-btn-hover-color, lightskyblue);
    background: var(--sms-remove-btn-hover-bg, rgba(0, 0, 0, 0.2));
  }

  :is(div.multiselect input) {
    margin: auto 0; /* CSS reset */
    padding: 0; /* CSS reset */
  }
  :is(div.multiselect > ul.selected > input) {
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
  :is(div.multiselect > ul.selected > input:not(:placeholder-shown)) {
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

  ul.options {
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
    transition: all
      0.2s; /* Consider if this transition is desirable with portal positioning */
    box-sizing: border-box;
    background: var(--sms-options-bg, white);
    max-height: var(--sms-options-max-height, 50vh);
    overscroll-behavior: var(--sms-options-overscroll, none);
    box-shadow: var(--sms-options-shadow, 0 0 14pt -8pt black);
    border: var(--sms-options-border);
    border-width: var(--sms-options-border-width);
    border-radius: var(--sms-options-border-radius, 1ex);
    padding: var(--sms-options-padding);
    margin: var(--sms-options-margin, inherit);
  }
  ul.options.hidden {
    visibility: hidden;
    opacity: 0;
    transform: translateY(50px);
    pointer-events: none;
  }
  ul.options > li {
    padding: 3pt 1ex;
    cursor: pointer;
    scroll-margin: var(--sms-options-scroll-margin, 100px);
    border-left: 3px solid transparent;
  }
  ul.options .user-msg {
    /* block needed so vertical padding applies to span */
    display: block;
    padding: 3pt 2ex;
  }
  ul.options > li.selected {
    background: var(--sms-li-selected-plain-bg, rgba(0, 123, 255, 0.1));
    border-left: var(
      --sms-li-selected-plain-border,
      3px solid var(--sms-active-color, cornflowerblue)
    );
  }
  ul.options > li.active {
    background: var(--sms-li-active-bg, var(--sms-active-color, rgba(0, 0, 0, 0.15)));
  }
  ul.options > li.disabled {
    cursor: not-allowed;
    background: var(--sms-li-disabled-bg, #f5f5f6);
    color: var(--sms-li-disabled-text, #b8b8b8);
  }
  /* Checkbox styling for keepSelectedInDropdown='checkboxes' mode */
  ul.options > li > input.option-checkbox {
    width: 16px;
    height: 16px;
    margin-right: 6px;
    accent-color: var(--sms-active-color, cornflowerblue);
  }
  /* Select all option styling */
  ul.options > li.select-all {
    border-bottom: var(--sms-select-all-border-bottom, 1px solid lightgray);
    font-weight: var(--sms-select-all-font-weight, 500);
    color: var(--sms-select-all-color, inherit);
    background: var(--sms-select-all-bg, transparent);
    margin-bottom: var(--sms-select-all-margin-bottom, 2pt);
  }
  ul.options > li.select-all:hover {
    background: var(
      --sms-select-all-hover-bg,
      var(--sms-li-active-bg, var(--sms-active-color, rgba(0, 0, 0, 0.15)))
    );
  }
  :is(span.max-select-msg) {
    padding: 0 3pt;
  }
  ::highlight(sms-search-matches) {
    color: mediumaquamarine;
  }
  /* Loading more indicator for infinite scrolling */
  ul.options > li.loading-more {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 8pt;
    cursor: default;
  }
</style>
