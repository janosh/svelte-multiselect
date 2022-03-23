<script lang="ts">
  import { createEventDispatcher, onMount, tick } from 'svelte'
  import { fly } from 'svelte/transition'
  import type { Option, Primitive, ProtoOption, DispatchEvents } from './'
  import CircleSpinner from './CircleSpinner.svelte'
  import { CrossIcon, ExpandIcon, DisabledIcon } from './icons'
  import Wiggle from './Wiggle.svelte'

  export let selected: Option[] = []
  export let selectedLabels: Primitive[] = []
  export let selectedValues: Primitive[] = []
  export let searchText = ``
  export let showOptions = false
  export let maxSelect: number | null = null // null means any number of options are selectable
  export let maxSelectMsg: ((current: number, max: number) => string) | null = null
  export let disabled = false
  export let disabledTitle = `This field is disabled`
  export let options: ProtoOption[]
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

  export let removeBtnTitle = `Remove`
  export let removeAllTitle = `Remove all`
  export let defaultDisabledTitle = `This option is disabled`
  export let allowUserOptions: boolean | 'append' = false
  export let autoScroll = true
  export let loading = false
  export let required = false
  export let autocomplete = `off`
  export let invalid = false

  if (maxSelect !== null && maxSelect < 0) {
    console.error(`maxSelect must be null or positive integer, got ${maxSelect}`)
  }
  if (!(options?.length > 0)) console.error(`MultiSelect missing options`)
  if (!Array.isArray(selected)) console.error(`selected prop must be an array`)

  onMount(() => {
    selected = _options.filter((op) => op?.preselected) ?? []
  })

  const dispatch = createEventDispatcher<DispatchEvents>()

  function isObject(item: unknown) {
    return typeof item === `object` && !Array.isArray(item) && item !== null
  }

  // process proto options to full ones with mandatory labels
  $: _options = options.map((rawOp) => {
    // convert to objects internally if user passed list of strings or numbers as options
    if (isObject(rawOp)) {
      const op = { ...(rawOp as Option) }
      if (!op.value) op.value = op.label
      return op
    } else {
      if (![`string`, `number`].includes(typeof rawOp)) {
        console.error(
          `MultiSelect options must be objects, strings or numbers, got ${typeof rawOp}`
        )
      }
      // even if we logged error above, try to proceed hoping user knows what they're doing
      return { label: rawOp, value: rawOp }
    }
  }) as Option[]

  $: labels = _options.map((op) => op.label)

  $: if (new Set(labels).size !== options.length) {
    console.error(
      `Option labels must be unique. Duplicates found: ${labels.filter(
        (label, idx) => labels.indexOf(label) !== idx
      )}`
    )
  }

  let wiggle = false
  $: selectedLabels = selected.map((op) => op.label)
  $: selectedValues = selected.map((op) => op.value)
  // formValue binds to input.form-control to prevent form submission if required
  // prop is true and no options are selected
  $: formValue = selectedValues.join(`,`)
  $: if (formValue) invalid = false // reset error status whenever component state changes

  // options matching the current search text
  $: matchingOptions = _options.filter(
    (op) => filterFunc(op, searchText) && !selectedLabels.includes(op.label)
  )
  $: matchingEnabledOptions = matchingOptions.filter((op) => !op.disabled)

  function add(label: Primitive) {
    if (maxSelect && maxSelect > 1 && selected.length >= maxSelect) wiggle = true
    if (
      !selectedLabels.includes(label) &&
      // for maxselect = 1 we always replace current option with new selection
      (maxSelect === null || maxSelect === 1 || selected.length < maxSelect)
    ) {
      searchText = `` // reset search string on selection
      const option = _options.find((op) => op.label === label)
      if (!option) {
        console.error(`MultiSelect: option with label ${label} not found`)
        return
      }
      if (maxSelect === 1) {
        selected = [option]
      } else {
        selected = [option, ...selected]
      }
      if (selected.length === maxSelect) setOptionsVisible(false)
      dispatch(`add`, { option })
      dispatch(`change`, { option, type: `add` })
    }
  }

  function remove(label: Primitive) {
    if (selected.length === 0) return
    const option = _options.find((option) => option.label === label)
    if (!option) {
      return console.error(`MultiSelect: option with label ${label} not found`)
    }
    selected = selected.filter((option) => label !== option.label)
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
      if (activeOption) {
        const { label } = activeOption
        selectedLabels.includes(label) ? remove(label) : add(label)
        searchText = ``
      } else if ([true, `append`].includes(allowUserOptions)) {
        selected = [...selected, { label: searchText, value: searchText }]
        if (allowUserOptions === `append`)
          options = [...options, { label: searchText, value: searchText }]
        searchText = ``
      }
      // no active option and no search text means the options dropdown is closed
      // in which case enter means open it
      else setOptionsVisible(true)
    }
    // on up/down arrow keys: update active option
    else if ([`ArrowDown`, `ArrowUp`].includes(event.key)) {
      if (activeOption === null) {
        // if no option is active yet, make first one active
        activeOption = matchingEnabledOptions[0]
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
    else if (event.key === `Backspace`) {
      const label = selectedLabels.pop()
      if (label && !searchText) remove(label)
    }
  }

  const removeAll = () => {
    dispatch(`removeAll`, { options: selected })
    dispatch(`change`, { options: selected, type: `removeAll` })
    selected = []
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
    {#each selected as option, idx}
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
  {:else if selected.length > 0}
    {#if maxSelect && (maxSelect > 1 || maxSelectMsg)}
      <Wiggle bind:wiggle angle={20}>
        <span style="padding: 0 3pt;">
          {maxSelectMsg?.(selected.length, maxSelect) ??
            (maxSelect > 1 ? `${selected.length}/${maxSelect}` : ``)}
        </span>
      </Wiggle>
    {/if}
    {#if maxSelect !== 1 && selected.length > 1}
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

  {#key showOptions}
    <ul
      class:hidden={!showOptions}
      class="options {ulOptionsClass}"
      transition:fly|local={{ duration: 300, y: 40 }}
    >
      {#each matchingOptions as option, idx}
        {@const { label, disabled, title = null, selectedTitle } = option}
        {@const { disabledTitle = defaultDisabledTitle } = option}
        {@const active = activeOption?.label === label}
        <li
          on:mouseup|preventDefault|stopPropagation
          on:mousedown|preventDefault|stopPropagation={() => {
            if (disabled) return
            isSelected(label) ? remove(label) : add(label)
          }}
          title={disabled ? disabledTitle : (isSelected(label) && selectedTitle) || title}
          class:selected={isSelected(label)}
          class:active
          class:disabled
          class="{liOptionClass} {active ? liActiveOptionClass : ``}"
          on:mouseover={() => {
            if (disabled) return
            activeOption = option
          }}
          on:focus={() => {
            if (disabled) return
            activeOption = option
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
        <span>{noOptionsMsg}</span>
      {/each}
    </ul>
  {/key}
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
  }
  :where(div.multiselect > ul.options.hidden) {
    visibility: hidden;
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
