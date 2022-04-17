<script lang="ts">
  import { createEventDispatcher, tick } from 'svelte'
  import { Option, Primitive, ProtoOption, DispatchEvents, SourceOfTruth } from './'
  import CircleSpinner from './CircleSpinner.svelte'
  import { CrossIcon, ExpandIcon, DisabledIcon } from './icons'
  import Wiggle from './Wiggle.svelte'

  export let searchText = ``
  export let showOptions = false
  export let maxSelect: number | null = null // null means any number of options are selectable
  export let maxSelectMsg: ((current: number, max: number) => string) | null = null
  export let disabled = false
  export let disabledTitle = `This field is disabled`
  export let options: ProtoOption[]

  export let selectedLabels: Primitive[] = []
  export let selectedValues: Primitive[] = []
  export let selectedOptions: Option[] = []

  export let sourceOfTruth: SourceOfTruth = SourceOfTruth.options
  switch (sourceOfTruth) {
    case SourceOfTruth.options:
      selectedOptions = (options as Option[]).filter((op) => op?.preselected) ?? []
      break
    case SourceOfTruth.labels:
      break
    case SourceOfTruth.values:
      // selectedOptions =
      break
  }

  export let input: HTMLInputElement | null = null
  export let outerDiv: HTMLDivElement | null = null
  export let placeholder: string | undefined = undefined
  export let id: string | undefined = undefined
  export let name: string | undefined = id
  export let noOptionsMsg = `No matching options`
  export let activeOption: Option | null = null
  export let filterFunc = (op: Option, searchText: string) => {
    if (!searchText) return true
    return `${op.label}`.toLowerCase().includes(searchText.toLowerCase())
  }

  export let outerDivClass = ``
  export let ulSelectedClass = ``
  export let liSelectedClass = ``
  export let ulOptionsClass = ``
  export let liOptionClass = ``
  export let liActiveOptionClass = ``
  export let inputClass = ``

  export let removeBtnTitle = `Remove`
  export let removeAllTitle = `Remove all`
  export let defaultDisabledTitle = `This option is disabled`
  export let allowUserOptions: boolean | 'append' = false
  export let addOptionMsg = `Create this option...`
  export let autoScroll = true
  export let loading = false
  export let required = false
  export let autocomplete = `off`
  export let invalid = false

  if (maxSelect !== null && maxSelect < 0) {
    console.error(`maxSelect must be null or positive integer, got ${maxSelect}`)
  }
  if (!(options?.length > 0)) console.error(`MultiSelect missing options`)
  if (!Array.isArray(selectedOptions)) console.error(`selected prop must be an array`)

  const dispatch = createEventDispatcher<DispatchEvents>()
  let activeMsg = false // controls active state of <li>{addOptionMsg}</li>

  function is_object(item: unknown) {
    return typeof item === `object` && !Array.isArray(item) && item !== null
  }

  // process proto options to full ones with mandatory labels
  $: _options = options.map((raw_op) => {
    if (is_object(raw_op)) {
      const option = { ...(raw_op as Option) }
      if (option.value === undefined) option.value = option.label
      return option
    } else {
      if (![`string`, `number`].includes(typeof raw_op)) {
        console.warn(
          `MultiSelect options must be objects, strings or numbers, got ${typeof raw_op}`
        )
      }
      // even if we logged error above, try to proceed hoping user knows what they're doing
      return { label: raw_op, value: raw_op }
    }
  }) as Option[]

  let wiggle = false

  $: {
    selectedOptions, selectedLabels, selectedValues

    switch (sourceOfTruth) {
      case SourceOfTruth.options:
        selectedLabels = selectedOptions.map((op) => op.label)
        selectedValues = selectedOptions.map((op) => op.value)
        break

      case SourceOfTruth.labels:
        selectedOptions = selectedLabels.map((label) =>
          _options.find((op) => {
            return op.label === label
          })
        ) as Option[]

        selectedValues = selectedLabels.map(
          (label) =>
            _options.find((op) => {
              return op.label === label
            })?.value
        ) as Primitive[]
        break

      case SourceOfTruth.values:
        selectedOptions = selectedValues.map((value) =>
          _options.find((op) => {
            return op.value === value
          })
        ) as Option[]

        selectedLabels = selectedValues.map(
          (value) => _options.find((op) => op.value === value)?.label
        ) as Primitive[]
        break
    }
  }

  // formValue binds to input.form-control to prevent form submission if required
  // prop is true and no options are selected
  $: formValue = selectedValues.join(`,`)
  $: if (formValue) invalid = false // reset error status whenever component state changes

  // options matching the current search text
  $: matchingOptions = _options.filter(
    (op) => filterFunc(op, searchText) && !selectedLabels.includes(op.label)
  )
  $: matchingEnabledOptions = matchingOptions.filter((op) => !op.disabled)

  // add an option to selected list
  function add(label: Primitive) {
    if (maxSelect && maxSelect > 1 && selectedOptions.length >= maxSelect) wiggle = true
    // to prevent duplicate selection, we could add `&& !selectedLabels.includes(label)`
    if (maxSelect === null || maxSelect === 1 || selectedOptions.length < maxSelect) {
      // first check if we find option in the options list

      let option = _options.find((op) => op.label === label)
      if (
        !option && // this has the side-effect of not allowing to user to add the same
        // custom option twice in append mode
        [true, `append`].includes(allowUserOptions) &&
        searchText.length > 0
      ) {
        // user entered text but no options match, so if allowUserOptions=true | 'append', we create new option
        option = { label: searchText, value: searchText }
        if (allowUserOptions === `append`) _options = [..._options, option]
      }
      searchText = `` // reset search string on selection
      if (!option) {
        console.error(`MultiSelect: option with label ${label} not found`)
        return
      }
      if (maxSelect === 1) {
        // for maxselect = 1 we always replace current option with new one

        switch (sourceOfTruth) {
          case SourceOfTruth.options:
            selectedOptions = [option]
            break
          case SourceOfTruth.labels:
            selectedLabels = [option.label]
            break
          case SourceOfTruth.values:
            selectedValues = [option.value]
            break
        }
      } else {
        switch (sourceOfTruth) {
          case SourceOfTruth.options:
            selectedOptions = [...selectedOptions, option]
            break
          case SourceOfTruth.labels:
            selectedLabels = [...selectedLabels, option.label]
            break
          case SourceOfTruth.values:
            selectedValues = [...selectedValues, option.value]
            break
        }
      }
      if (selectedOptions.length === maxSelect) setOptionsVisible(false)
      else input?.focus()
      dispatch(`add`, { option })
      dispatch(`change`, { option, type: `add` })
    }
  }

  // remove an option from selected list
  function remove(label: Primitive) {
    if (selectedOptions.length === 0) return

    const option =
      _options.find((option) => option.label === label) ??
      // if option with label could not be found but allowUserOptions is truthy,
      // assume it was created by user and create correspondidng option object
      // on the fly for use as event payload
      (allowUserOptions && { label, value: label })

    if (!option) {
      return console.error(`MultiSelect: option with label ${label} not found`)
    }

    switch (sourceOfTruth) {
      case SourceOfTruth.options:
        selectedOptions.splice(selectedLabels.lastIndexOf(label), 1)
        selectedOptions = selectedOptions
        break
      case SourceOfTruth.labels:
        selectedLabels.splice(selectedLabels.lastIndexOf(label), 1)
        selectedLabels = selectedLabels
        break
      case SourceOfTruth.values:
        selectedValues.splice(selectedLabels.lastIndexOf(label), 1)
        selectedValues = selectedValues
        break
    }

    dispatch(`remove`, { option })
    dispatch(`change`, { option, type: `remove` })
  }

  function setOptionsVisible(show: boolean) {
    if (disabled) return
    showOptions = show
    if (show) {
      input?.focus()
      dispatch(`focus`)
    } else {
      input?.blur()
      activeOption = null
      dispatch(`blur`)
    }
  }

  // handle all keyboard events this component receives
  async function handleKeydown(event: KeyboardEvent) {
    // on escape or tab out of input: dismiss options dropdown and reset search text
    if (event.key === `Escape` || event.key === `Tab`) {
      setOptionsVisible(false)
      searchText = ``
    }
    // on enter key: toggle active option and reset search text
    else if (event.key === `Enter`) {
      event.preventDefault() // prevent enter key from triggering form submission

      if (activeOption) {
        const { label } = activeOption
        selectedLabels.includes(label) ? remove(label) : add(label)
        searchText = ``
      } else if (allowUserOptions && searchText.length > 0) {
        // user entered text but no options match, so if allowUserOptions is truthy, we create new option
        add(searchText)
      }
      // no active option and no search text means the options dropdown is closed
      // in which case enter means open it
      else setOptionsVisible(true)
    }
    // on up/down arrow keys: update active option
    else if ([`ArrowDown`, `ArrowUp`].includes(event.key)) {
      // if no option is active yet, but there are matching options, make first one active
      if (activeOption === null && matchingEnabledOptions.length > 0) {
        activeOption = matchingEnabledOptions[0]
        return
      } else if (allowUserOptions && searchText.length > 0) {
        // if allowUserOptions is truthy and user entered text but no options match, we make
        // <li>{addUserMsg}</li> active on keydown (or toggle it if already active)
        activeMsg = !activeMsg
        return
      }
      const increment = event.key === `ArrowUp` ? -1 : 1
      const newActiveIdx = matchingEnabledOptions.indexOf(activeOption) + increment

      if (newActiveIdx < 0) {
        // wrap around top
        activeOption = matchingEnabledOptions[matchingEnabledOptions.length - 1]
      } else if (newActiveIdx === matchingEnabledOptions.length) {
        // wrap around bottom
        activeOption = matchingEnabledOptions[0]
      } else {
        // default case: select next/previous in item list
        activeOption = matchingEnabledOptions[newActiveIdx]
      }
      if (autoScroll) {
        await tick()
        const li = document.querySelector(`ul.options > li.active`)
        li?.scrollIntoViewIfNeeded()
      }
    }
    // on backspace key: remove last selected option
    else if (event.key === `Backspace` && selectedLabels.length > 0 && !searchText) {
      remove(selectedLabels.at(-1) as Primitive)
    }
  }

  const removeAll = () => {
    dispatch(`removeAll`, { options: selectedOptions })
    dispatch(`change`, { options: selectedOptions, type: `removeAll` })
    selectedOptions = []
    searchText = ``
  }

  $: isSelected = (label: Primitive) => selectedLabels.includes(label)

  const handleEnterAndSpaceKeys = (handler: () => void) => (event: KeyboardEvent) => {
    if ([`Enter`, `Space`].includes(event.code)) {
      event.preventDefault()
      handler()
    }
  }
</script>

<svelte:window
  on:click={(event) => {
    if (outerDiv && !outerDiv.contains(event.target)) {
      setOptionsVisible(false)
    }
  }}
/>

<!-- z-index: 2 when showOptions is true ensures the ul.selected of one <MultiSelect />
display above those of another following shortly after it -->
<div
  bind:this={outerDiv}
  class:disabled
  class:single={maxSelect === 1}
  class:open={showOptions}
  aria-expanded={showOptions}
  aria-multiselectable={maxSelect === null || maxSelect > 1}
  class:invalid
  class="multiselect {outerDivClass}"
  on:mouseup|stopPropagation={() => setOptionsVisible(true)}
  title={disabled ? disabledTitle : null}
  aria-disabled={disabled ? `true` : null}
>
  <input
    {required}
    bind:value={formValue}
    tabindex="-1"
    aria-hidden="true"
    aria-label="ignore this, used only to prevent form submission if select is required but empty"
    class="form-control"
    on:invalid={() => (invalid = true)}
  />
  <ExpandIcon width="15px" style="min-width: 1em; padding: 0 1pt;" />
  <ul class="selected {ulSelectedClass}">
    {#each selectedOptions as option, idx}
      <li class={liSelectedClass} aria-selected="true">
        <slot name="selected" {option} {idx}>
          {option.label}
        </slot>
        {#if !disabled}
          <button
            on:mouseup|stopPropagation={() => remove(option.label)}
            on:keydown={handleEnterAndSpaceKeys(() => remove(option.label))}
            type="button"
            title="{removeBtnTitle} {option.label}"
          >
            <CrossIcon width="15px" />
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
        on:mouseup|self|stopPropagation={() => setOptionsVisible(true)}
        on:keydown={handleKeydown}
        on:focus={() => setOptionsVisible(true)}
        {id}
        {name}
        {disabled}
        placeholder={selectedLabels.length ? `` : placeholder}
        aria-invalid={invalid ? `true` : null}
      />
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
  {:else if selectedOptions.length > 0}
    {#if maxSelect && (maxSelect > 1 || maxSelectMsg)}
      <Wiggle bind:wiggle angle={20}>
        <span style="padding: 0 3pt;">
          {maxSelectMsg?.(selectedOptions.length, maxSelect) ??
            (maxSelect > 1 ? `${selectedOptions.length}/${maxSelect}` : ``)}
        </span>
      </Wiggle>
    {/if}
    {#if maxSelect !== 1 && selectedOptions.length > 1}
      <button
        type="button"
        class="remove-all"
        title={removeAllTitle}
        on:mouseup|stopPropagation={removeAll}
        on:keydown={handleEnterAndSpaceKeys(removeAll)}
      >
        <CrossIcon width="15px" />
      </button>
    {/if}
  {/if}

  <ul class:hidden={!showOptions} class="options {ulOptionsClass}">
    {#each matchingOptions as option, idx}
      {@const { label, disabled, title = null, selectedTitle } = option}
      {@const { disabledTitle = defaultDisabledTitle } = option}
      {@const active = activeOption?.label === label}
      <li
        on:mousedown|stopPropagation
        on:mouseup|stopPropagation={() => {
          if (!disabled) isSelected(label) ? remove(label) : add(label)
        }}
        title={disabled ? disabledTitle : (isSelected(label) && selectedTitle) || title}
        class:selected={isSelected(label)}
        class:active
        class:disabled
        class="{liOptionClass} {active ? liActiveOptionClass : ``}"
        on:mouseover={() => {
          if (!disabled) activeOption = option
        }}
        on:focus={() => {
          if (!disabled) activeOption = option
        }}
        on:mouseout={() => (activeOption = null)}
        on:blur={() => (activeOption = null)}
        aria-selected="false"
      >
        <slot name="option" {option} {idx}>
          {option.label}
        </slot>
      </li>
    {:else}
      {#if allowUserOptions && searchText}
        <li
          on:mousedown|stopPropagation
          on:mouseup|stopPropagation={() => add(searchText)}
          title={addOptionMsg}
          class:active={activeMsg}
          on:mouseover={() => (activeMsg = true)}
          on:focus={() => (activeMsg = true)}
          on:mouseout={() => (activeMsg = false)}
          on:blur={() => (activeMsg = false)}
          aria-selected="false"
        >
          {addOptionMsg}
        </li>
      {:else}
        <span>{noOptionsMsg}</span>
      {/if}
    {/each}
  </ul>
</div>

<style>
  :where(div.multiselect) {
    position: relative;
    margin: 1em 0;
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
  }
  :where(div.multiselect.open) {
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
    background: var(--sms-selected-bg, rgba(0, 0, 0, 0.15));
    padding: var(--sms-selected-li-padding, 1pt 5pt);
    color: var(--sms-selected-text-color, var(--sms-text-color));
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
    color: var(--sms-button-hover-color, lightskyblue);
  }

  :where(div.multiselect input) {
    margin: auto 0; /* CSS reset */
    padding: 0; /* CSS reset */
  }
  :where(div.multiselect > ul.selected > li > input) {
    border: none;
    outline: none;
    background: none;
    flex: 1; /* this + next line fix issue #12 https://git.io/JiDe3 */
    min-width: 2em;
    color: inherit;
    font-size: inherit;
    cursor: inherit; /* needed for disabled state */
  }
  :where(div.multiselect > ul.selected > li > input)::placeholder {
    color: var(--sms-placeholder-color);
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
    padding: 0;
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
    opacity: 1;
    transform: translateY(0);
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
</style>
