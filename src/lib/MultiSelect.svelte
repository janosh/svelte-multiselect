<script lang="ts">
  import { createEventDispatcher, tick } from 'svelte'
  import { flip } from 'svelte/animate'
  import { CircleSpinner, Wiggle } from '.'
  import type { DispatchEvents, MultiSelectEvents, Option as GenericOption } from './'
  import { CrossIcon, DisabledIcon, ExpandIcon } from './icons'
  type Option = $$Generic<GenericOption>

  export let activeIndex: number | null = null
  export let activeOption: Option | null = null
  export let createOptionMsg: string = `Create this option...`
  export let allowUserOptions: boolean | 'append' = false
  export let allowEmpty: boolean = false // added for https://github.com/janosh/svelte-multiselect/issues/192
  export let autocomplete: string = `off`
  export let autoScroll: boolean = true
  export let breakpoint: number = 800 // any screen with more horizontal pixels is considered desktop, below is mobile
  export let defaultDisabledTitle: string = `This option is disabled`
  export let disabled: boolean = false
  export let disabledInputTitle: string = `This input is disabled`
  // case-insensitive equality comparison after string coercion (looking only at the `label` key of object options)
  // prettier-ignore
  export let duplicateFunc: (op1: GenericOption, op2: GenericOption) => boolean = (op1, op2) =>
    `${get_label(op1)}`.toLowerCase() === `${get_label(op2)}`.toLowerCase()
  export let duplicateOptionMsg: string = `This option is already selected`
  export let duplicates: boolean = false // whether to allow duplicate options
  export let filterFunc = (op: Option, searchText: string): boolean => {
    if (!searchText) return true
    return `${get_label(op)}`.toLowerCase().includes(searchText.toLowerCase())
  }
  export let focusInputOnSelect: boolean | 'desktop' = `desktop`
  export let form_input: HTMLInputElement | null = null
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
  export let maxSelect: number | null = null // null means there is no upper limit for selected.length
  export let maxSelectMsg: ((current: number, max: number) => string) | null = (
    current: number,
    max: number
  ) => (max > 1 ? `${current}/${max}` : ``)
  export let maxSelectMsgClass: string = ``
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
  export let minSelect: number | null = null // null means there is no lower limit for selected.length
  export let required: boolean | number = false
  export let resetFilterOnAdd: boolean = true
  export let searchText: string = ``
  export let selected: Option[] =
    options
      ?.filter((op) => op instanceof Object && op?.preselected)
      .slice(0, maxSelect ?? undefined) ?? []
  export let sortSelected: boolean | ((op1: Option, op2: Option) => number) = false
  export let selectedOptionsDraggable: boolean = !sortSelected
  export let ulOptionsClass: string = ``
  export let ulSelectedClass: string = ``
  export let value: Option | Option[] | null = null

  // get the label key from an option object or the option itself if it's a string or number
  const get_label = (op: GenericOption) => {
    if (op instanceof Object) {
      if (op.label === undefined) {
        console.error(
          `MultiSelect option ${JSON.stringify(op)} is an object but has no label key`
        )
      }
      return op.label
    }
    return op
  }

  // if maxSelect=1, value is the single item in selected (or null if selected is empty)
  // this solves both https://github.com/janosh/svelte-multiselect/issues/86 and
  // https://github.com/janosh/svelte-multiselect/issues/136
  $: value = maxSelect === 1 ? selected[0] ?? null : selected

  let wiggle = false // controls wiggle animation when user tries to exceed maxSelect

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
      `MultiSelect's maxSelect must be null or positive integer, got ${maxSelect}`
    )
  }
  if (!Array.isArray(selected)) {
    console.error(
      `MultiSelect's selected prop should always be an array, got ${selected}`
    )
  }
  if (maxSelect && typeof required === `number` && required > maxSelect) {
    console.error(
      `MultiSelect maxSelect=${maxSelect} < required=${required}, makes it impossible for users to submit a valid form`
    )
  }
  if (parseLabelsAsHtml && allowUserOptions) {
    console.warn(
      `Don't combine parseLabelsAsHtml and allowUserOptions. It's susceptible to XSS attacks!`
    )
  }
  if (sortSelected && selectedOptionsDraggable) {
    console.warn(
      `MultiSelect's sortSelected and selectedOptionsDraggable should not be combined as any user re-orderings of selected options will be undone by sortSelected on component re-renders.`
    )
  }

  const dispatch = createEventDispatcher<DispatchEvents<Option>>()
  let add_option_msg_is_active: boolean = false // controls active state of <li>{createOptionMsg}</li>
  let window_width: number

  // options matching the current search text
  $: matchingOptions = options.filter(
    (op) => filterFunc(op, searchText) && !selected.map(get_label).includes(get_label(op)) // remove already selected options from dropdown list
  )
  // raise if matchingOptions[activeIndex] does not yield a value
  if (activeIndex !== null && !matchingOptions[activeIndex]) {
    throw `Run time error, activeIndex=${activeIndex} is out of bounds, matchingOptions.length=${matchingOptions.length}`
  }
  // update activeOption when activeIndex changes
  $: activeOption = matchingOptions[activeIndex ?? -1] ?? null

  // add an option to selected list
  function add(label: string | number, event: Event) {
    if (maxSelect && maxSelect > 1 && selected.length >= maxSelect) wiggle = true
    if (!isNaN(Number(label)) && typeof selected.map(get_label)[0] === `number`)
      label = Number(label) // convert to number if possible

    const is_duplicate = selected.some((option) => duplicateFunc(option, label))
    if (
      (maxSelect === null || maxSelect === 1 || selected.length < maxSelect) &&
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
          option = { label: searchText } as Option
        } else {
          if (
            [`number`, `undefined`].includes(typeof options[0]) &&
            !isNaN(Number(searchText))
          ) {
            // create new option as number if it parses to a number and 1st option is also number or missing
            option = Number(searchText) as Option
          } else option = searchText as Option // else create custom option as string
        }
        if (allowUserOptions === `append`) options = [...options, option]
      }
      if (option === undefined) {
        throw `Run time error, option with label ${label} not found in options list`
      }
      if (resetFilterOnAdd) searchText = `` // reset search string on selection
      if ([``, undefined, null].includes(option as string | null)) {
        console.error(
          `MultiSelect: encountered missing option with label ${label} (or option is poorly labeled)`
        )
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
      if (selected.length === maxSelect) close_dropdown(event)
      else if (
        focusInputOnSelect === true ||
        (focusInputOnSelect === `desktop` && window_width > breakpoint)
      ) {
        input?.focus()
      }
      dispatch(`add`, { option })
      dispatch(`change`, { option, type: `add` })

      invalid = false // reset error status whenever new items are selected
      form_input?.setCustomValidity(``)
    }
  }

  // remove an option from selected list
  function remove(label: string | number) {
    if (selected.length === 0) return

    let option = selected.find((op) => get_label(op) === label)

    if (option === undefined && allowUserOptions) {
      // if option with label could not be found but allowUserOptions is truthy,
      // assume it was created by user and create corresponding option object
      // on the fly for use as event payload
      option = (typeof options[0] == `object` ? { label } : label) as Option
    }
    if (option === undefined) {
      return console.error(
        `Multiselect can't remove selected option ${label}, not found in selected list`
      )
    }

    selected = selected.filter((op) => get_label(op) !== label) // remove option from selected list

    dispatch(`remove`, { option })
    dispatch(`change`, { option, type: `remove` })
    invalid = false // reset error status whenever items are removed
    form_input?.setCustomValidity(``)
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
        const label = get_label(activeOption)
        selected.map(get_label).includes(label) ? remove(label) : add(label, event)
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
        add_option_msg_is_active = !add_option_msg_is_active
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
      remove(selected.map(get_label).at(-1) as string | number)
    }
    // make first matching option active on any keypress (if none of the above special cases match)
    else if (matchingOptions.length > 0) {
      activeIndex = 0
    }
  }

  function remove_all() {
    selected = []
    searchText = ``
    dispatch(`removeAll`, { options: selected })
    dispatch(`change`, { options: selected, type: `removeAll` })
  }

  $: is_selected = (label: string | number) => selected.map(get_label).includes(label)

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

  let drag_idx: number | null = null
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
  class:invalid
  class="multiselect {outerDivClass}"
  on:mouseup|stopPropagation={open_dropdown}
  title={disabled ? disabledInputTitle : null}
  data-id={id}
>
  <!-- bind:value={selected} prevents form submission if required prop is true and no options are selected -->
  <input
    {name}
    required={Boolean(required)}
    value={selected.length >= required ? JSON.stringify(selected) : null}
    tabindex="-1"
    aria-hidden="true"
    aria-label="ignore this, used only to prevent form submission if select is required but empty"
    class="form-control"
    bind:this={form_input}
    on:invalid={() => {
      invalid = true
      let msg
      if (maxSelect && maxSelect > 1 && required > 1) {
        msg = `Please select between ${required} and ${maxSelect} options`
      } else if (required > 1) {
        msg = `Please select at least ${required} options`
      } else {
        msg = `Please select an option`
      }
      form_input?.setCustomValidity(msg)
    }}
  />
  <slot name="expand-icon" {open}>
    <ExpandIcon width="15px" style="min-width: 1em; padding: 0 1pt; cursor: pointer;" />
  </slot>
  <ul
    class="selected {ulSelectedClass}"
    role="listbox"
    aria-multiselectable={maxSelect === null || maxSelect > 1}
    aria-label="selected options"
  >
    {#each selected as option, idx (get_label(option))}
      <li
        class={liSelectedClass}
        role="option"
        aria-selected="true"
        animate:flip={{ duration: 100 }}
        draggable={selectedOptionsDraggable && !disabled && selected.length > 1}
        on:dragstart={dragstart(idx)}
        on:drop|preventDefault={drop(idx)}
        on:dragenter={() => (drag_idx = idx)}
        on:dragover|preventDefault
        class:active={drag_idx === idx}
      >
        <!-- on:dragover|preventDefault needed for the drop to succeed https://stackoverflow.com/a/31085796 -->
        <slot name="selected" {option} {idx}>
          {#if parseLabelsAsHtml}
            {@html get_label(option)}
          {:else}
            {get_label(option)}
          {/if}
        </slot>
        {#if !disabled && (minSelect === null || selected.length > minSelect)}
          <button
            on:mouseup|stopPropagation={() => remove(get_label(option))}
            on:keydown={if_enter_or_space(() => remove(get_label(option)))}
            type="button"
            title="{removeBtnTitle} {get_label(option)}"
            class="remove"
          >
            <slot name="remove-icon">
              <CrossIcon width="15px" />
            </slot>
          </button>
        {/if}
      </li>
    {/each}
    <!-- the above on:* lines forward potentially useful DOM events -->
  </ul>
  <input
    class={inputClass}
    bind:this={input}
    bind:value={searchText}
    on:mouseup|self|stopPropagation={open_dropdown}
    on:keydown|stopPropagation={handle_keydown}
    on:focus
    on:focus={open_dropdown}
    {id}
    {disabled}
    {autocomplete}
    {inputmode}
    {pattern}
    placeholder={selected.length == 0 ? placeholder : null}
    aria-invalid={invalid ? `true` : null}
    ondrop="return false"
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
  {#if loading}
    <slot name="spinner">
      <CircleSpinner />
    </slot>
  {/if}
  {#if disabled}
    <slot name="disabled-icon">
      <DisabledIcon width="14pt" style="margin: 0 2pt;" data-name="disabled-icon" />
    </slot>
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
  {#if (searchText && noMatchingOptionsMsg) || options?.length > 0}
    <ul
      class:hidden={!open}
      class="options {ulOptionsClass}"
      role="listbox"
      aria-multiselectable={maxSelect === null || maxSelect > 1}
      aria-expanded={open}
      aria-disabled={disabled ? `true` : null}
    >
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
          role="option"
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
            title={createOptionMsg}
            class:active={add_option_msg_is_active}
            on:mouseover={() => (add_option_msg_is_active = true)}
            on:focus={() => (add_option_msg_is_active = true)}
            on:mouseout={() => (add_option_msg_is_active = false)}
            on:blur={() => (add_option_msg_is_active = false)}
            aria-selected="false"
          >
            {!duplicates && selected.some((option) => duplicateFunc(option, searchText))
              ? duplicateOptionMsg
              : createOptionMsg}
          </li>
        {:else}
          <span>{noMatchingOptionsMsg}</span>
        {/if}
      {/each}
    </ul>
  {/if}
</div>

<style>
  :where(div.multiselect) {
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
  :where(div.multiselect.open) {
    /* increase z-index when open to ensure the dropdown of one <MultiSelect />
    displays above that of another slightly below it on the page */
    z-index: var(--sms-open-z-index, 4);
  }
  :where(div.multiselect:focus-within) {
    border: var(--sms-focus-border, 1pt solid var(--sms-active-color, cornflowerblue));
  }
  :where(div.multiselect.disabled) {
    background: var(--sms-disabled-bg, lightgray);
    cursor: not-allowed;
  }

  :where(div.multiselect > ul.selected) {
    display: inline-flex;
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
    background: var(--sms-selected-bg, rgba(0, 0, 0, 0.15));
    padding: var(--sms-selected-li-padding, 1pt 5pt);
    color: var(--sms-selected-text-color, var(--sms-text-color));
  }
  :where(div.multiselect > ul.selected > li[draggable='true']) {
    cursor: grab;
  }
  :where(div.multiselect > ul.selected > li.active) {
    background: var(--sms-li-active-bg, var(--sms-active-color, rgba(0, 0, 0, 0.15)));
  }
  :where(div.multiselect button) {
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
  :where(div.multiselect button.remove-all) {
    margin: 0 3pt;
  }
  :where(ul.selected > li button:hover, button.remove-all:hover, button:focus) {
    color: var(--sms-remove-btn-hover-color, lightskyblue);
    background: var(--sms-remove-btn-hover-bg, rgba(0, 0, 0, 0.2));
  }

  :where(div.multiselect input) {
    margin: auto 0; /* CSS reset */
    padding: 0; /* CSS reset */
  }
  :where(div.multiselect > input) {
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
  /* don't wrap ::placeholder rules in :where() as it seems to be overpowered by browser defaults i.t.o. specificity */
  div.multiselect > input::placeholder {
    padding-left: 5pt;
    color: var(--sms-placeholder-color);
    opacity: var(--sms-placeholder-opacity);
  }
  :where(div.multiselect > input.form-control) {
    width: 2em;
    position: absolute;
    background: transparent;
    border: none;
    outline: none;
    z-index: -1;
    opacity: 0;
    pointer-events: none;
  }

  :where(div.multiselect > ul.options) {
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
  :where(div.multiselect > ul.options.hidden) {
    visibility: hidden;
    opacity: 0;
    transform: translateY(50px);
  }
  :where(div.multiselect > ul.options > li) {
    padding: 3pt 2ex;
    cursor: pointer;
    scroll-margin: var(--sms-options-scroll-margin, 100px);
  }
  /* for noOptionsMsg */
  :where(div.multiselect > ul.options span) {
    padding: 3pt 2ex;
  }
  :where(div.multiselect > ul.options > li.selected) {
    background: var(--sms-li-selected-bg);
    color: var(--sms-li-selected-color);
  }
  :where(div.multiselect > ul.options > li.active) {
    background: var(--sms-li-active-bg, var(--sms-active-color, rgba(0, 0, 0, 0.15)));
  }
  :where(div.multiselect > ul.options > li.disabled) {
    cursor: not-allowed;
    background: var(--sms-li-disabled-bg, #f5f5f6);
    color: var(--sms-li-disabled-text, #b8b8b8);
  }

  :where(span.max-select-msg) {
    padding: 0 3pt;
  }
</style>
