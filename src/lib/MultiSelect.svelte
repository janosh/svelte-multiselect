<script lang="ts">
  import { createEventDispatcher, tick } from 'svelte'
  import type { DispatchEvents, MultiSelectEvents, ObjectOption, Option } from './'
  import CircleSpinner from './CircleSpinner.svelte'
  import { CrossIcon, DisabledIcon, ExpandIcon } from './icons'
  import Wiggle from './Wiggle.svelte'

  export let activeIndex: number | null = null
  export let activeOption: Option | null = null
  export let addOptionMsg: string = `Create this option...`
  export let allowUserOptions: boolean | 'append' = false
  export let autocomplete: string = `off`
  export let autoScroll: boolean = true
  export let breakpoint: number = 800 // any screen with more horizontal pixels is considered desktop, below is mobile
  export let defaultDisabledTitle: string = `This option is disabled`
  export let disabled: boolean = false
  export let disabledInputTitle: string = `This input is disabled`
  // case-insensitive equality comparison after string coercion (looking only at the `label` key of object options)
  export let duplicateFunc: (op1: Option, op2: Option) => boolean = (op1, op2) =>
    `${get_label(op1)}`.toLowerCase() === `${get_label(op2)}`.toLowerCase()
  export let duplicateOptionMsg: string = `This option is already selected`
  export let duplicates: boolean = false // whether to allow duplicate options
  export let filterFunc = (op: Option, searchText: string): boolean => {
    if (!searchText) return true
    return `${get_label(op)}`.toLowerCase().includes(searchText.toLowerCase())
  }
  export let focusInputOnSelect: boolean | 'desktop' = `desktop`
  export let id: string | null = null
  export let input: HTMLInputElement | null = null
  export let inputClass: string = ``
  export let inputmode: string | null = null
  export let invalid: boolean = false
  export let liActiveOptionClass: string = ``
  export let liOptionClass: string = ``
  export let liSelectedClass: string = ``
  export let loading: boolean = false
  export let matchingOptions: Option[] = []
  export let maxSelect: number | null = null // null means any number of options are selectable
  export let maxSelectMsg: ((current: number, max: number) => string) | null = (
    current: number,
    max: number
  ) => (max > 1 ? `${current}/${max}` : ``)
  export let name: string | null = null
  export let noMatchingOptionsMsg: string = `No matching options`
  export let open: boolean = false
  export let options: Option[]
  export let outerDiv: HTMLDivElement | null = null
  export let outerDivClass: string = ``
  export let parseLabelsAsHtml: boolean = false // should not be combined with allowUserOptions!
  export let pattern: string | null = null
  export let placeholder: string | null = null
  export let removeAllTitle: string = `Remove all`
  export let removeBtnTitle: string = `Remove`
  export let required: boolean = false
  export let resetFilterOnAdd: boolean = true
  export let searchText: string = ``
  export let selected: Option[] | Option | null =
    options
      ?.filter((op) => (op as ObjectOption)?.preselected)
      .slice(0, maxSelect ?? undefined) ?? []
  export let selectedLabels: (string | number)[] | string | number | null = []
  export let selectedValues: unknown[] | unknown | null = []
  export let sortSelected: boolean | ((op1: Option, op2: Option) => number) = false
  export let ulOptionsClass: string = ``
  export let ulSelectedClass: string = ``

  // get the label key from an option object or the option itself if it's a string or number
  const get_label = (op: Option) => (op instanceof Object ? op.label : op)

  // fallback on label if option is object and value is undefined
  const get_value = (op: Option) => (op instanceof Object ? op.value ?? op.label : op)

  // selected and _selected are identical except if maxSelect=1, selected will be the single item (or null)
  // in _selected which will always be an array for easier component internals. selected then solves
  // https://github.com/janosh/svelte-multiselect/issues/86
  let _selected = (selected ?? []) as Option[]
  $: selected = maxSelect === 1 ? _selected[0] ?? null : _selected

  let wiggle = false // controls wiggle animation when user tries to exceed maxSelect
  $: _selectedLabels = _selected?.map(get_label) ?? []
  $: selectedLabels = maxSelect === 1 ? _selectedLabels[0] ?? null : _selectedLabels
  $: _selectedValues = _selected?.map(get_value) ?? []
  $: selectedValues = maxSelect === 1 ? _selectedValues[0] ?? null : _selectedValues

  type $$Events = MultiSelectEvents // for type-safe event listening on this component

  if (!(options?.length > 0)) {
    if (allowUserOptions) {
      options = [] // initializing as array avoids errors when component mounts
    } else {
      // only error for empty options if user is not allowed to create custom options
      console.error(`MultiSelect received no options`)
    }
  }
  if (parseLabelsAsHtml && allowUserOptions) {
    console.warn(
      `Don't combine parseLabelsAsHtml and allowUserOptions. It's susceptible to XSS attacks!`
    )
  }
  if (maxSelect !== null && maxSelect < 1) {
    console.error(`maxSelect must be null or positive integer, got ${maxSelect}`)
  }
  if (!Array.isArray(_selected)) {
    console.error(
      `internal variable _selected prop should always be an array, got ${_selected}`
    )
  }

  const dispatch = createEventDispatcher<DispatchEvents>()
  let add_option_msg_is_active: boolean = false // controls active state of <li>{addOptionMsg}</li>
  let window_width: number

  // options matching the current search text
  $: matchingOptions = options.filter(
    (op) => filterFunc(op, searchText) && !_selectedLabels.includes(get_label(op)) // remove already selected options from dropdown list
  )
  // raise if matchingOptions[activeIndex] does not yield a value
  if (activeIndex !== null && !matchingOptions[activeIndex]) {
    throw `Run time error, activeIndex=${activeIndex} is out of bounds, matchingOptions.length=${matchingOptions.length}`
  }
  // update activeOption when activeIndex changes
  $: activeOption = activeIndex !== null ? matchingOptions[activeIndex] : null

  // add an option to selected list
  function add(label: string | number, event: Event) {
    if (maxSelect && maxSelect > 1 && _selected.length >= maxSelect) wiggle = true
    if (!isNaN(Number(label)) && typeof _selectedLabels[0] === `number`)
      label = Number(label) // convert to number if possible

    const is_duplicate = _selected.some((option) => duplicateFunc(option, label))
    if (
      (maxSelect === null || maxSelect === 1 || _selected.length < maxSelect) &&
      (duplicates || !is_duplicate)
    ) {
      // first check if we find option in the options list

      let option = options.find((op) => get_label(op) === label)
      if (
        !option && // this has the side-effect of not allowing to user to add the same
        // custom option twice in append mode
        [true, `append`].includes(allowUserOptions) &&
        searchText.length > 0
      ) {
        // user entered text but no options match, so if allowUserOptions=true | 'append', we create
        // a new option from the user-entered text
        if (typeof options[0] === `object`) {
          // if 1st option is an object, we create new option as object to keep type homogeneity
          option = { label: searchText, value: searchText }
        } else {
          if (
            [`number`, `undefined`].includes(typeof options[0]) &&
            !isNaN(Number(searchText))
          ) {
            // create new option as number if it parses to a number and 1st option is also number or missing
            option = Number(searchText)
          } else option = searchText // else create custom option as string
        }
        if (allowUserOptions === `append`) options = [...options, option]
      }
      if (option === undefined) {
        throw `Run time error, option with label ${label} not found in options list`
      }
      if (resetFilterOnAdd) searchText = `` // reset search string on selection
      if ([``, undefined, null].includes(option)) {
        console.error(
          `MultiSelect: encountered missing option with label ${label} (or option is poorly labeled)`
        )
        return
      }
      if (maxSelect === 1) {
        // for maxselect = 1 we always replace current option with new one
        _selected = [option]
      } else {
        _selected = [..._selected, option]
        if (sortSelected === true) {
          _selected = _selected.sort((op1: Option, op2: Option) => {
            const [label1, label2] = [get_label(op1), get_label(op2)]
            // coerce to string if labels are numbers
            return `${label1}`.localeCompare(`${label2}`)
          })
        } else if (typeof sortSelected === `function`) {
          _selected = _selected.sort(sortSelected)
        }
      }
      if (_selected.length === maxSelect) close_dropdown(event)
      else if (
        focusInputOnSelect === true ||
        (focusInputOnSelect === `desktop` && window_width > breakpoint)
      ) {
        input?.focus()
      }
      dispatch(`add`, { option })
      dispatch(`change`, { option, type: `add` })

      invalid = false // reset error status whenever new items are selected
    }
  }

  // remove an option from selected list
  function remove(label: string | number) {
    if (_selected.length === 0) return

    _selected.splice(_selectedLabels.lastIndexOf(label), 1)
    _selected = _selected // Svelte rerender after in-place splice

    const option =
      options.find((option) => get_label(option) === label) ??
      // if option with label could not be found but allowUserOptions is truthy,
      // assume it was created by user and create correspondidng option object
      // on the fly for use as event payload
      (allowUserOptions && { label, value: label })

    if (!option) {
      return console.error(`MultiSelect: option with label ${label} not found`)
    }

    dispatch(`remove`, { option })
    dispatch(`change`, { option, type: `remove` })
    invalid = false // reset error status whenever items are removed
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
    activeOption = null
    dispatch(`close`, { event })
  }

  // handle all keyboard events this component receives
  async function handle_keydown(event: KeyboardEvent) {
    // on escape or tab out of input: dismiss options dropdown and reset search text
    if (event.key === `Escape` || event.key === `Tab`) {
      close_dropdown(event)
      searchText = ``
    }
    // on enter key: toggle active option and reset search text
    else if (event.key === `Enter`) {
      event.preventDefault() // prevent enter key from triggering form submission

      if (activeOption) {
        const label = get_label(activeOption)
        selectedLabels?.includes(label) ? remove(label) : add(label, event)
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
      } else if (allowUserOptions && searchText.length > 0) {
        // if allowUserOptions is truthy and user entered text but no options match, we make
        // <li>{addUserMsg}</li> active on keydown (or toggle it if already active)
        add_option_msg_is_active = !add_option_msg_is_active
        return
      } else if (activeIndex === null) {
        // if no option is active and no options are matching, do nothing
        return
      }
      const increment = event.key === `ArrowUp` ? -1 : 1

      activeIndex = (activeIndex + increment) % matchingOptions.length
      // % in JS behaves like remainder operator, not real modulo, so negative numbers stay negative
      // need to do manual wrap around at 0
      if (activeIndex < 0) activeIndex = matchingOptions.length - 1

      if (autoScroll) {
        // TODO This ugly timeout hack is needed to properly scroll element into view when wrapping
        // around start/end of option list. Find a better solution than waiting 10 ms.
        await tick()
        const li = document.querySelector(`ul.options > li.active`)
        if (li) {
          li.parentNode?.scrollIntoView?.({ block: `center` })
          li.scrollIntoViewIfNeeded?.()
        }
      }
    }
    // on backspace key: remove last selected option
    else if (event.key === `Backspace` && _selectedLabels.length > 0 && !searchText) {
      remove(_selectedLabels.at(-1) as string | number)
    }
  }

  function remove_all() {
    dispatch(`removeAll`, { options: _selected })
    dispatch(`change`, { options: _selected, type: `removeAll` })
    _selected = []
    searchText = ``
  }

  $: is_selected = (label: string | number) => _selectedLabels.includes(label)

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
</script>

<svelte:window
  on:click={on_click_outside}
  on:touchstart={on_click_outside}
  bind:innerWidth={window_width}
/>

<div
  bind:this={outerDiv}
  class:disabled
  class:single={maxSelect === 1}
  class:open
  aria-expanded={open}
  aria-multiselectable={maxSelect === null || maxSelect > 1}
  class:invalid
  class="multiselect {outerDivClass}"
  on:mouseup|stopPropagation={open_dropdown}
  title={disabled ? disabledInputTitle : null}
  aria-disabled={disabled ? `true` : null}
>
  <!-- bind:value={_selected} prevents form submission if required prop is true and no options are selected -->
  <input
    {required}
    bind:value={_selected}
    tabindex="-1"
    aria-hidden="true"
    aria-label="ignore this, used only to prevent form submission if select is required but empty"
    class="form-control"
    on:invalid={() => (invalid = true)}
  />
  <ExpandIcon width="15px" style="min-width: 1em; padding: 0 1pt;" />
  <ul class="selected {ulSelectedClass}">
    {#each _selected as option, idx}
      <li class={liSelectedClass} aria-selected="true">
        <slot name="selected" {option} {idx}>
          {#if parseLabelsAsHtml}
            {@html get_label(option)}
          {:else}
            {get_label(option)}
          {/if}
        </slot>
        {#if !disabled}
          <button
            on:mouseup|stopPropagation={() => remove(get_label(option))}
            on:keydown={if_enter_or_space(() => remove(get_label(option)))}
            type="button"
            title="{removeBtnTitle} {get_label(option)}"
          >
            <slot name="remove-icon">
              <CrossIcon width="15px" />
            </slot>
          </button>
        {/if}
      </li>
    {/each}
    <li style="display: contents;">
      <input
        class={inputClass}
        bind:this={input}
        {autocomplete}
        bind:value={searchText}
        on:mouseup|self|stopPropagation={open_dropdown}
        on:keydown|stopPropagation={handle_keydown}
        on:focus
        on:focus={open_dropdown}
        {id}
        {name}
        {disabled}
        {inputmode}
        {pattern}
        placeholder={_selected.length == 0 ? placeholder : null}
        aria-invalid={invalid ? `true` : null}
        on:blur
        on:change
        on:click
        on:keydown
        on:keyup
        on:mousedown
        on:mouseenter
        on:mouseleave
        on:touchcancel
        on:touchend
        on:touchmove
        on:touchstart
      />
      <!-- the above on:* lines forward potentially useful DOM events -->
    </li>
  </ul>
  {#if loading}
    <slot name="spinner">
      <CircleSpinner />
    </slot>
  {/if}
  {#if disabled}
    <slot name="disabled-icon">
      <DisabledIcon width="15px" />
    </slot>
  {:else if _selected.length > 0}
    {#if maxSelect && (maxSelect > 1 || maxSelectMsg)}
      <Wiggle bind:wiggle angle={20}>
        <span style="padding: 0 3pt;">
          {maxSelectMsg?.(_selected.length, maxSelect)}
        </span>
      </Wiggle>
    {/if}
    {#if maxSelect !== 1 && _selected.length > 1}
      <button
        type="button"
        class="remove-all"
        title={removeAllTitle}
        on:mouseup|stopPropagation={remove_all}
        on:keydown={if_enter_or_space(remove_all)}
      >
        <slot name="remove-icon">
          <CrossIcon width="15px" />
        </slot>
      </button>
    {/if}
  {/if}

  <!-- only render options dropdown if options or searchText is not empty needed to avoid briefly flashing empty dropdown -->
  {#if searchText || options?.length > 0}
    <ul class:hidden={!open} class="options {ulOptionsClass}">
      {#each matchingOptions as option, idx}
        {@const {
          label,
          disabled = null,
          title = null,
          selectedTitle = null,
          disabledTitle = defaultDisabledTitle,
        } = option instanceof Object ? option : { label: option }}
        {@const active = activeIndex === idx}
        <li
          on:mousedown|stopPropagation
          on:mouseup|stopPropagation={(event) => {
            if (!disabled) add(label, event)
          }}
          title={disabled
            ? disabledTitle
            : (is_selected(label) && selectedTitle) || title}
          class:selected={is_selected(label)}
          class:active
          class:disabled
          class="{liOptionClass} {active ? liActiveOptionClass : ``}"
          on:mouseover={() => {
            if (!disabled) activeIndex = idx
          }}
          on:focus={() => {
            if (!disabled) activeIndex = idx
          }}
          on:mouseout={() => (activeIndex = null)}
          on:blur={() => (activeIndex = null)}
          aria-selected="false"
        >
          <slot name="option" {option} {idx}>
            {#if parseLabelsAsHtml}
              {@html get_label(option)}
            {:else}
              {get_label(option)}
            {/if}
          </slot>
        </li>
      {:else}
        {#if allowUserOptions && searchText}
          <li
            on:mousedown|stopPropagation
            on:mouseup|stopPropagation={(event) => add(searchText, event)}
            title={addOptionMsg}
            class:active={add_option_msg_is_active}
            on:mouseover={() => (add_option_msg_is_active = true)}
            on:focus={() => (add_option_msg_is_active = true)}
            on:mouseout={() => (add_option_msg_is_active = false)}
            on:blur={() => (add_option_msg_is_active = false)}
            aria-selected="false"
          >
            {!duplicates && _selected.some((option) => duplicateFunc(option, searchText))
              ? duplicateOptionMsg
              : addOptionMsg}
          </li>
        {:else}
          <span>{noMatchingOptionsMsg}</span>
        {/if}
      {/each}
    </ul>
  {/if}
</div>

<style lang="scss">
  @mixin default_styles() {
    & {
      position: relative;
      align-items: center;
      display: flex;
      cursor: text;
      border: var(--sms-border, 1pt solid lightgray);
      border-radius: var(--sms-border-radius, 3pt);
      background: var(--sms-bg);
      max-width: var(--sms-max-width);
      padding: var(--sms-padding, 0 3pt);
      color: var(--sms-text-color);
      font-size: var(--sms-font-size, inherit);
      min-height: var(--sms-min-height, 19pt);
      margin: var(--sms-margin);
    }
    &.open {
      /* increase z-index when open to ensure the dropdown of one <MultiSelect />
    displays above that of another slightly below it on the page */
      z-index: var(--sms-open-z-index, 4);
    }
    &:focus-within {
      border: var(--sms-focus-border, 1pt solid var(--sms-active-color, cornflowerblue));
    }
    &.disabled {
      background: var(--sms-disabled-bg, lightgray);
      cursor: not-allowed;
    }

    & > ul.selected {
      display: flex;
      flex: 1;
      padding: 0;
      margin: 0;
      flex-wrap: wrap;
    }
    & > ul.selected > li {
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
    & button {
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
    & button.remove-all {
      margin: 0 3pt;
    }
    ul.selected > li button:hover,
    button.remove-all:hover,
    button:focus {
      color: var(--sms-remove-btn-hover-color, lightskyblue);
      background: var(--sms-remove-btn-hover-bg, rgba(0, 0, 0, 0.2));
    }

    & input {
      margin: auto 0; /* CSS reset */
      padding: 0; /* CSS reset */
    }
    & > ul.selected > li > input {
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
    & > ul.selected > li > input::placeholder {
      padding-left: 5pt;
      color: var(--sms-placeholder-color);
      opacity: var(--sms-placeholder-opacity);
    }
    & > input.form-control {
      width: 2em;
      position: absolute;
      background: transparent;
      border: none;
      outline: none;
      z-index: -1;
      opacity: 0;
      pointer-events: none;
    }

    & > ul.options {
      list-style: none;
      padding: 4pt 0;
      top: 100%;
      left: 0;
      width: 100%;
      position: absolute;
      border-radius: 1ex;
      overflow: auto;
      background: var(--sms-options-bg, white);
      max-height: var(--sms-options-max-height, 50vh);
      overscroll-behavior: var(--sms-options-overscroll, none);
      box-shadow: var(--sms-options-shadow, 0 0 14pt -8pt black);
      transition: all 0.2s;
    }
    & > ul.options.hidden {
      visibility: hidden;
      opacity: 0;
      transform: translateY(50px);
    }
    & > ul.options > li {
      padding: 3pt 2ex;
      cursor: pointer;
      scroll-margin: var(--sms-options-scroll-margin, 100px);
    }
    & > ul.options span {
      // for noMatchingOptionsMsg
      padding: 3pt 2ex;
    }
    & > ul.options > li.selected {
      background: var(--sms-li-selected-bg);
      color: var(--sms-li-selected-color);
    }
    & > ul.options > li.active {
      background: var(--sms-li-active-bg, var(--sms-active-color, rgba(0, 0, 0, 0.15)));
    }
    & > ul.options > li.disabled {
      cursor: not-allowed;
      background: var(--sms-li-disabled-bg, #f5f5f6);
      color: var(--sms-li-disabled-text, #b8b8b8);
    }
  }

  :where(div.multiselect) {
    @include default_styles();
  }

  // https://github.com/janosh/svelte-multiselect/issues/117
  @supports not selector(:where(div.multiselect)) {
    div.multiselect {
      @include default_styles();
    }
  }
</style>
