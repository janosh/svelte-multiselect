<script lang="ts">
  import { run, stopPropagation, preventDefault, createBubbler, self, handlers } from 'svelte/legacy';

  const bubble = createBubbler();
  import { createEventDispatcher, tick } from 'svelte'
  import { flip } from 'svelte/animate'

  import CircleSpinner from './CircleSpinner.svelte'
  import Wiggle from './Wiggle.svelte'
  import { CrossIcon, DisabledIcon, ExpandIcon } from './icons'
  import type { DispatchEvents, MultiSelectEvents, Option as T } from './types'
  import { get_label, get_style } from './utils'
  type Option = $$Generic<T>

  
  // takes two options and returns true if they are equal
  
  interface Props {
    activeIndex?: number | null;
    activeOption?: Option | null;
    createOptionMsg?: string | null;
    allowUserOptions?: boolean | 'append';
    allowEmpty?: boolean; // added for https://github.com/janosh/svelte-multiselect/issues/192
    autocomplete?: string;
    autoScroll?: boolean;
    breakpoint?: number; // any screen with more horizontal pixels is considered desktop, below is mobile
    defaultDisabledTitle?: string;
    disabled?: boolean;
    disabledInputTitle?: string;
    // prettier-ignore
    duplicateOptionMsg?: string;
    duplicates?: boolean; // whether to allow duplicate options
    // case-insensitive equality comparison after string coercion and looks only at the `label` key of object options by default
    key?: (opt: T) => unknown;
    filterFunc?: any;
    closeDropdownOnSelect?: boolean | 'desktop';
    form_input?: HTMLInputElement | null;
    highlightMatches?: boolean;
    id?: string | null;
    input?: HTMLInputElement | null;
    inputClass?: string;
    inputStyle?: string | null;
    inputmode?: string | null;
    invalid?: boolean;
    liActiveOptionClass?: string;
    liActiveUserMsgClass?: string;
    liOptionClass?: string;
    liOptionStyle?: string | null;
    liSelectedClass?: string;
    liSelectedStyle?: string | null;
    liUserMsgClass?: string;
    loading?: boolean;
    matchingOptions?: Option[];
    maxOptions?: number | undefined;
    maxSelect?: number | null; // null means there is no upper limit for selected.length
    maxSelectMsg?: ((current: number, max: number) => string) | null;
    maxSelectMsgClass?: string;
    name?: string | null;
    noMatchingOptionsMsg?: string;
    open?: boolean;
    options: Option[];
    outerDiv?: HTMLDivElement | null;
    outerDivClass?: string;
    parseLabelsAsHtml?: boolean; // should not be combined with allowUserOptions!
    pattern?: string | null;
    placeholder?: string | null;
    removeAllTitle?: string;
    removeBtnTitle?: string;
    minSelect?: number | null; // null means there is no lower limit for selected.length
    required?: boolean | number;
    resetFilterOnAdd?: boolean;
    searchText?: string;
    selected?: Option[]; // don't allow more than maxSelect preselected options
    sortSelected?: boolean | ((op1: Option, op2: Option) => number);
    selectedOptionsDraggable?: boolean;
    style?: string | null;
    ulOptionsClass?: string;
    ulSelectedClass?: string;
    ulSelectedStyle?: string | null;
    ulOptionsStyle?: string | null;
    value?: Option | Option[] | null;
    expandIcon?: import('svelte').Snippet<[any]>;
    selectedItem?: import('svelte').Snippet<[any]>;
    children?: import('svelte').Snippet<[any]>;
    removeIcon?: import('svelte').Snippet;
    afterInput?: import('svelte').Snippet<[any]>;
    spinner?: import('svelte').Snippet;
    disabledIcon?: import('svelte').Snippet;
    optionItem?: import('svelte').Snippet<[any]>;
    userMsg?: import('svelte').Snippet<[any]>;
  }

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
    key = (opt) => `${get_label(opt)}`.toLowerCase(),
    filterFunc = (opt: Option, searchText: string): boolean => {
    if (!searchText) return true
    return `${get_label(opt)}`.toLowerCase().includes(searchText.toLowerCase())
  },
    closeDropdownOnSelect = `desktop`,
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
    maxSelectMsg = (
    current: number,
    max: number,
  ) => (max > 1 ? `${current}/${max}` : ``),
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
    selected = $bindable(options
      ?.filter((opt) => opt instanceof Object && opt?.preselected)
      .slice(0, maxSelect ?? undefined) ?? []),
    sortSelected = false,
    selectedOptionsDraggable = !sortSelected,
    style = null,
    ulOptionsClass = ``,
    ulSelectedClass = ``,
    ulSelectedStyle = null,
    ulOptionsStyle = null,
    value = $bindable(null),
    expandIcon,
    selectedItem,
    children,
    removeIcon,
    afterInput,
    spinner,
    disabledIcon,
    optionItem,
    userMsg
  }: Props = $props();

  const selected_to_value = (selected: Option[]) => {
    value = maxSelect === 1 ? (selected[0] ?? null) : selected
  }
  const value_to_selected = (value: Option | Option[] | null) => {
    if (maxSelect === 1) selected = value ? [value as Option] : []
    else selected = (value as Option[]) ?? []
  }

  // if maxSelect=1, value is the single item in selected (or null if selected is empty)
  // this solves both https://github.com/janosh/svelte-multiselect/issues/86 and
  // https://github.com/janosh/svelte-multiselect/issues/136
  run(() => {
    selected_to_value(selected)
  });
  run(() => {
    value_to_selected(value)
  });

  let wiggle = $state(false) // controls wiggle animation when user tries to exceed maxSelect

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  type $$Events = MultiSelectEvents // for type-safe event listening on this component

  if (!(options?.length > 0)) {
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

  const dispatch = createEventDispatcher<DispatchEvents<Option>>()
  let option_msg_is_active: boolean = $state(false) // controls active state of <li>{createOptionMsg}</li>
  let window_width: number = $state()

  // options matching the current search text
  run(() => {
    matchingOptions = options.filter(
      (opt) =>
        filterFunc(opt, searchText) &&
        // remove already selected options from dropdown list unless duplicate selections are allowed
        (!selected.map(key).includes(key(opt)) || duplicates),
    )
  });

  // raise if matchingOptions[activeIndex] does not yield a value
  if (activeIndex !== null && !matchingOptions[activeIndex]) {
    throw `Run time error, activeIndex=${activeIndex} is out of bounds, matchingOptions.length=${matchingOptions.length}`
  }
  // update activeOption when activeIndex changes
  run(() => {
    activeOption = matchingOptions[activeIndex ?? -1] ?? null
  });

  // add an option to selected list
  function add(option: T, event: Event) {
    if (maxSelect && maxSelect > 1 && selected.length >= maxSelect) wiggle = true
    if (!isNaN(Number(option)) && typeof selected.map(get_label)[0] === `number`) {
      option = Number(option) as Option // convert to number if possible
    }
    const is_duplicate = selected.map(key).includes(key(option))

    if (
      (maxSelect === null || maxSelect === 1 || selected.length < maxSelect) &&
      (duplicates || !is_duplicate)
    ) {
      if (
        !options.includes(option) && // first check if we find option in the options list
        // this has the side-effect of not allowing to user to add the same
        // custom option twice in append mode
        [true, `append`].includes(allowUserOptions) &&
        searchText.length > 0
      ) {
        // user entered text but no options match, so if allowUserOptions = true | 'append', we create
        // a new option from the user-entered text
        if (typeof options[0] === `object`) {
          // if 1st option is an object, we create new option as object to keep type homogeneity
          option = { label: searchText } as Option
        } else {
          if (
            [`number`, `undefined`].includes(typeof options[0]) &&
            !isNaN(Number(searchText))
          ) {
            // create new option as number if it parses to a number and 1st option is also number or missing
            option = Number(searchText) as Option
          } else {
            option = searchText as Option // else create custom option as string
          }
          dispatch(`create`, { option })
        }
        if (allowUserOptions === `append`) options = [...options, option]
      }

      if (resetFilterOnAdd) searchText = `` // reset search string on selection
      if ([``, undefined, null].includes(option as string | null)) {
        console.error(`MultiSelect: encountered falsy option ${option}`)
        return
      }
      if (maxSelect === 1) {
        // for maxSelect = 1 we always replace current option with new one
        selected = [option]
      } else {
        selected = [...selected, option]
        if (sortSelected === true) {
          selected = selected.sort((op1: Option, op2: Option) => {
            const [label1, label2] = [get_label(op1), get_label(op2)]
            // coerce to string if labels are numbers
            return `${label1}`.localeCompare(`${label2}`)
          })
        } else if (typeof sortSelected === `function`) {
          selected = selected.sort(sortSelected)
        }
      }

      const reached_max_select = selected.length === maxSelect

      const dropdown_should_close =
        closeDropdownOnSelect === true ||
        (closeDropdownOnSelect === `desktop` && window_width < breakpoint)

      if (reached_max_select || dropdown_should_close) {
        close_dropdown(event)
      } else if (!dropdown_should_close) {
        input?.focus()
      }
      dispatch(`add`, { option })
      dispatch(`change`, { option, type: `add` })

      invalid = false // reset error status whenever new items are selected
      form_input?.setCustomValidity(``)
    }
  }

  // remove an option from selected list
  function remove(to_remove: T) {
    if (selected.length === 0) return

    const idx = selected.findIndex((opt) => key(opt) === key(to_remove))

    let [option] = selected.splice(idx, 1) // remove option from selected list

    if (option === undefined && allowUserOptions) {
      // if option with label could not be found but allowUserOptions is truthy,
      // assume it was created by user and create corresponding option object
      // on the fly for use as event payload
      const other_ops_type = typeof options[0]
      option = (other_ops_type ? { label: to_remove } : to_remove) as Option
    }
    if (option === undefined) {
      return console.error(
        `Multiselect can't remove selected option ${JSON.stringify(
          to_remove,
        )}, not found in selected list`,
      )
    }

    selected = [...selected] // trigger Svelte rerender

    invalid = false // reset error status whenever items are removed
    form_input?.setCustomValidity(``)
    dispatch(`remove`, { option })
    dispatch(`change`, { option, type: `remove` })
  }

  function open_dropdown(event: Event) {
    if (disabled) return
    open = true
    if (!(event instanceof FocusEvent)) {
      // avoid double-focussing input when event that opened dropdown was already input FocusEvent
      input?.focus()
    }
    dispatch(`open`, { event })
  }

  function close_dropdown(event: Event) {
    open = false
    input?.blur()
    activeIndex = null
    dispatch(`close`, { event })
  }

  // handle all keyboard events this component receives
  async function handle_keydown(event: KeyboardEvent) {
    // on escape or tab out of input: close options dropdown and reset search text
    if (event.key === `Escape` || event.key === `Tab`) {
      close_dropdown(event)
      searchText = ``
    }
    // on enter key: toggle active option and reset search text
    else if (event.key === `Enter`) {
      event.preventDefault() // prevent enter key from triggering form submission

      if (activeOption) {
        selected.includes(activeOption) ? remove(activeOption) : add(activeOption, event)
        searchText = ``
      } else if (allowUserOptions && searchText.length > 0) {
        // user entered text but no options match, so if allowUserOptions is truthy, we create new option
        add(searchText, event)
      }
      // no active option and no search text means the options dropdown is closed
      // in which case enter means open it
      else open_dropdown(event)
    }
    // on up/down arrow keys: update active option
    else if ([`ArrowDown`, `ArrowUp`].includes(event.key)) {
      // if no option is active yet, but there are matching options, make first one active
      if (activeIndex === null && matchingOptions.length > 0) {
        activeIndex = 0
        return
      } else if (allowUserOptions && !matchingOptions.length && searchText.length > 0) {
        // if allowUserOptions is truthy and user entered text but no options match, we make
        // <li>{addUserMsg}</li> active on keydown (or toggle it if already active)
        option_msg_is_active = !option_msg_is_active
        return
      } else if (activeIndex === null) {
        // if no option is active and no options are matching, do nothing
        return
      }
      event.preventDefault()
      // if none of the above special cases apply, we make next/prev option
      // active with wrap around at both ends
      const increment = event.key === `ArrowUp` ? -1 : 1

      activeIndex = (activeIndex + increment) % matchingOptions.length
      // in JS % behaves like remainder operator, not real modulo, so negative numbers stay negative
      // need to do manual wrap around at 0
      if (activeIndex < 0) activeIndex = matchingOptions.length - 1

      if (autoScroll) {
        await tick()
        const li = document.querySelector(`ul.options > li.active`)
        if (li) li.scrollIntoViewIfNeeded?.()
      }
    }
    // on backspace key: remove last selected option
    else if (event.key === `Backspace` && selected.length > 0 && !searchText) {
      remove(selected.at(-1) as Option)
    }
    // make first matching option active on any keypress (if none of the above special cases match)
    else if (matchingOptions.length > 0) {
      activeIndex = 0
    }
  }

  function remove_all() {
    dispatch(`removeAll`, { options: selected })
    dispatch(`change`, { options: selected, type: `removeAll` })
    selected = []
    searchText = ``
  }

  let is_selected = $derived((label: string | number) => selected.map(get_label).includes(label))

  const if_enter_or_space = (handler: () => void) => (event: KeyboardEvent) => {
    if ([`Enter`, `Space`].includes(event.code)) {
      event.preventDefault()
      handler()
    }
  }

  function on_click_outside(event: MouseEvent | TouchEvent) {
    if (outerDiv && !outerDiv.contains(event.target as Node)) {
      close_dropdown(event)
    }
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

  let ul_options: HTMLUListElement = $state()
  // highlight text matching user-entered search text in available options
  function highlight_matching_options(event: InputEvent) {
    if (!highlightMatches || typeof CSS == `undefined` || !CSS.highlights) return // abort if CSS highlight API not supported

    // clear previous ranges from HighlightRegistry
    CSS.highlights.clear()

    // get input's search query
    const query = (event?.target as HTMLInputElement)?.value.trim().toLowerCase()
    if (!query) return

    const tree_walker = document.createTreeWalker(ul_options, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => {
        // don't highlight text in the "no matching options" message
        if (node?.textContent === noMatchingOptionsMsg) return NodeFilter.FILTER_REJECT
        return NodeFilter.FILTER_ACCEPT
      },
    })
    const text_nodes: Node[] = []
    let current_node = tree_walker.nextNode()
    while (current_node) {
      text_nodes.push(current_node)
      current_node = tree_walker.nextNode()
    }

    // iterate over all text nodes and find matches
    const ranges = text_nodes.map((el) => {
      const text = el.textContent?.toLowerCase()
      const indices = []
      let start_pos = 0
      while (text && start_pos < text.length) {
        const index = text.indexOf(query, start_pos)
        if (index === -1) break
        indices.push(index)
        start_pos = index + query.length
      }

      // create range object for each str found in the text node
      return indices.map((index) => {
        const range = new Range()
        range.setStart(el, index)
        range.setEnd(el, index + query.length)
        return range
      })
    })

    // create Highlight object from ranges and add to registry
    CSS.highlights.set(`sms-search-matches`, new Highlight(...ranges.flat()))
  }

  // reset form validation when required prop changes
  // https://github.com/janosh/svelte-multiselect/issues/285
  run(() => {
    required, form_input?.setCustomValidity(``)
  });
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
  class="multiselect {outerDivClass}"
  onmouseup={stopPropagation(open_dropdown)}
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
    {required}
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
  {#if expandIcon}{@render expandIcon({ open, })}{:else}
    <ExpandIcon width="15px" style="min-width: 1em; padding: 0 1pt; cursor: pointer;" />
  {/if}
  <ul
    class="selected {ulSelectedClass}"
    aria-label="selected options"
    style={ulSelectedStyle}
  >
    {#each selected as option, idx (duplicates ? [key(option), idx] : key(option))}
      <li
        class={liSelectedClass}
        role="option"
        aria-selected="true"
        animate:flip={{ duration: 100 }}
        draggable={selectedOptionsDraggable && !disabled && selected.length > 1}
        ondragstart={dragstart(idx)}
        ondrop={preventDefault(drop(idx))}
        ondragenter={() => (drag_idx = idx)}
        ondragover={preventDefault(bubble('dragover'))}
        class:active={drag_idx === idx}
        style="{get_style(option, `selected`)} {liSelectedStyle}"
      >
        <!-- on:dragover|preventDefault needed for the drop to succeed https://stackoverflow.com/a/31085796 -->
        {#if selectedItem}{@render selectedItem({ option, idx, })}{:else}
          {#if children}{@render children({ option, idx, })}{:else}
            {#if parseLabelsAsHtml}
              {@html get_label(option)}
            {:else}
              {get_label(option)}
            {/if}
          {/if}
        {/if}
        {#if !disabled && (minSelect === null || selected.length > minSelect)}
          <button
            onmouseup={stopPropagation(() => remove(option))}
            onkeydown={if_enter_or_space(() => remove(option))}
            type="button"
            title="{removeBtnTitle} {get_label(option)}"
            class="remove"
          >
            {#if removeIcon}{@render removeIcon()}{:else}
              <CrossIcon width="15px" />
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
      onmouseup={self(stopPropagation(open_dropdown))}
      onkeydown={handlers(stopPropagation(handle_keydown), bubble('keydown'))}
      onfocus={handlers(bubble('focus'), open_dropdown)}
      oninput={highlight_matching_options}
      {id}
      {disabled}
      {autocomplete}
      {inputmode}
      {pattern}
      placeholder={selected.length == 0 ? placeholder : null}
      aria-invalid={invalid ? `true` : null}
      ondrop={() => false}
      onblur={bubble('blur')}
      onchange={bubble('change')}
      onclick={bubble('click')}
      onkeyup={bubble('keyup')}
      onmousedown={bubble('mousedown')}
      onmouseenter={bubble('mouseenter')}
      onmouseleave={bubble('mouseleave')}
      ontouchcancel={bubble('touchcancel')}
      ontouchend={bubble('touchend')}
      ontouchmove={bubble('touchmove')}
      ontouchstart={bubble('touchstart')}
    />
    <!-- the above on:* lines forward potentially useful DOM events -->
    {@render afterInput?.({ selected, disabled, invalid, id, placeholder, open, required, })}
  </ul>
  {#if loading}
    {#if spinner}{@render spinner()}{:else}
      <CircleSpinner />
    {/if}
  {/if}
  {#if disabled}
    {#if disabledIcon}{@render disabledIcon()}{:else}
      <DisabledIcon width="14pt" style="margin: 0 2pt;" data-name="disabled-icon" />
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
        onmouseup={stopPropagation(remove_all)}
        onkeydown={if_enter_or_space(remove_all)}
      >
        {#if removeIcon}{@render removeIcon()}{:else}
          <CrossIcon width="15px" />
        {/if}
      </button>
    {/if}
  {/if}

  <!-- only render options dropdown if options or searchText is not empty (needed to avoid briefly flashing empty dropdown) -->
  {#if (searchText && noMatchingOptionsMsg) || options?.length > 0}
    <ul
      class:hidden={!open}
      class="options {ulOptionsClass}"
      role="listbox"
      aria-multiselectable={maxSelect === null || maxSelect > 1}
      aria-expanded={open}
      aria-disabled={disabled ? `true` : null}
      bind:this={ul_options}
      style={ulOptionsStyle}
    >
      {#each matchingOptions.slice(0, Math.max(0, maxOptions ?? 0) || Infinity) as option, idx}
        {@const {
          label,
          disabled = null,
          title = null,
          selectedTitle = null,
          disabledTitle = defaultDisabledTitle,
        } = option instanceof Object ? option : { label: option }}
        {@const active = activeIndex === idx}
        <li
          onmousedown={stopPropagation(bubble('mousedown'))}
          onmouseup={stopPropagation((event) => {
            if (!disabled) add(option, event)
          })}
          title={disabled
            ? disabledTitle
            : (is_selected(label) && selectedTitle) || title}
          class:selected={is_selected(label)}
          class:active
          class:disabled
          class="{liOptionClass} {active ? liActiveOptionClass : ``}"
          onmouseover={() => {
            if (!disabled) activeIndex = idx
          }}
          onfocus={() => {
            if (!disabled) activeIndex = idx
          }}
          onmouseout={() => (activeIndex = null)}
          onblur={() => (activeIndex = null)}
          role="option"
          aria-selected="false"
          style="{get_style(option, `option`)} {liOptionStyle}"
        >
          {#if optionItem}{@render optionItem({ option, idx, })}{:else}
            {#if children}{@render children({ option, idx, })}{:else}
              {#if parseLabelsAsHtml}
                {@html get_label(option)}
              {:else}
                {get_label(option)}
              {/if}
            {/if}
          {/if}
        </li>
      {/each}
      {#if searchText}
        {@const text_input_is_duplicate = selected.map(get_label).includes(searchText)}
        {@const is_dupe = !duplicates && text_input_is_duplicate && `dupe`}
        {@const can_create = Boolean(allowUserOptions && createOptionMsg) && `create`}
        {@const no_match =
          Boolean(matchingOptions?.length == 0 && noMatchingOptionsMsg) && `no-match`}
        {@const msgType = is_dupe || can_create || no_match}
        {#if msgType}
          {@const msg = {
            dupe: duplicateOptionMsg,
            create: createOptionMsg,
            'no-match': noMatchingOptionsMsg,
          }[msgType]}
          <li
            onmousedown={stopPropagation(bubble('mousedown'))}
            onmouseup={stopPropagation((event) => {
              if (allowUserOptions) add(searchText, event)
            })}
            title={createOptionMsg}
            class:active={option_msg_is_active}
            onmouseover={() => (option_msg_is_active = true)}
            onfocus={() => (option_msg_is_active = true)}
            onmouseout={() => (option_msg_is_active = false)}
            onblur={() => (option_msg_is_active = false)}
            role="option"
            aria-selected="false"
            class="user-msg {liUserMsgClass} {option_msg_is_active
              ? liActiveUserMsgClass
              : ``}"
            style:cursor={{
              dupe: `not-allowed`,
              create: `pointer`,
              'no-match': `default`,
            }[msgType]}
          >
            {#if userMsg}{@render userMsg({ searchText, msgType, msg, })}{:else}
              {msg}
            {/if}
          </li>
        {/if}
      {/if}
    </ul>
  {/if}
</div>

<style>
  :where(:global(div.multiselect)) {
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
  :where(:global(div.multiselect.open)) {
    /* increase z-index when open to ensure the dropdown of one <MultiSelect />
    displays above that of another slightly below it on the page */
    z-index: var(--sms-open-z-index, 4);
  }
  :where(:global(div.multiselect:focus-within)) {
    border: var(--sms-focus-border, 1pt solid var(--sms-active-color, cornflowerblue));
  }
  :where(:global(div.multiselect.disabled)) {
    background: var(--sms-disabled-bg, lightgray);
    cursor: not-allowed;
  }

  :where(:global(div.multiselect > ul.selected)) {
    display: flex;
    flex: 1;
    padding: 0;
    margin: 0;
    flex-wrap: wrap;
  }
  :where(:global(div.multiselect > ul.selected > li)) {
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
  :where(:global(div.multiselect > ul.selected > li[draggable='true'])) {
    cursor: grab;
  }
  :where(:global(div.multiselect > ul.selected > li.active)) {
    background: var(--sms-li-active-bg, var(--sms-active-color, rgba(0, 0, 0, 0.15)));
  }
  :where(:global(div.multiselect button)) {
    border-radius: 50%;
    display: flex;
    transition: 0.2s;
    color: inherit;
    background: transparent;
    border: none;
    cursor: pointer;
    outline: none;
    padding: 0;
    margin: 0 0 0 3pt; /* CSS reset */
  }
  :where(:global(div.multiselect button.remove-all)) {
    margin: 0 3pt;
  }
  :where(:global(ul.selected > li button:hover, button.remove-all:hover, button:focus)) {
    color: var(--sms-remove-btn-hover-color, lightskyblue);
    background: var(--sms-remove-btn-hover-bg, rgba(0, 0, 0, 0.2));
  }

  :where(:global(div.multiselect input)) {
    margin: auto 0; /* CSS reset */
    padding: 0; /* CSS reset */
  }
  :where(:global(div.multiselect > ul.selected > input)) {
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
  /* don't wrap ::placeholder rules in :where(:global()) as it seems to be overpowered by browser defaults i.t.o. specificity */
  div.multiselect > ul.selected > input::placeholder {
    padding-left: 5pt;
    color: var(--sms-placeholder-color);
    opacity: var(--sms-placeholder-opacity);
  }
  :where(:global(div.multiselect > input.form-control)) {
    width: 2em;
    position: absolute;
    background: transparent;
    border: none;
    outline: none;
    z-index: -1;
    opacity: 0;
    pointer-events: none;
  }

  :where(:global(div.multiselect > ul.options)) {
    list-style: none;
    top: 100%;
    left: 0;
    width: 100%;
    position: absolute;
    overflow: auto;
    transition: all 0.2s;
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
  :where(:global(div.multiselect > ul.options.hidden)) {
    visibility: hidden;
    opacity: 0;
    transform: translateY(50px);
  }
  :where(:global(div.multiselect > ul.options > li)) {
    padding: 3pt 2ex;
    cursor: pointer;
    scroll-margin: var(--sms-options-scroll-margin, 100px);
  }
  :where(:global(div.multiselect > ul.options .user-msg)) {
    /* block needed so vertical padding applies to span */
    display: block;
    padding: 3pt 2ex;
  }
  :where(:global(div.multiselect > ul.options > li.selected)) {
    background: var(--sms-li-selected-bg);
    color: var(--sms-li-selected-color);
  }
  :where(:global(div.multiselect > ul.options > li.active)) {
    background: var(--sms-li-active-bg, var(--sms-active-color, rgba(0, 0, 0, 0.15)));
  }
  :where(:global(div.multiselect > ul.options > li.disabled)) {
    cursor: not-allowed;
    background: var(--sms-li-disabled-bg, #f5f5f6);
    color: var(--sms-li-disabled-text, #b8b8b8);
  }

  :where(:global(span.max-select-msg)) {
    padding: 0 3pt;
  }
  ::highlight(sms-search-matches) {
    color: mediumaquamarine;
  }
</style>
