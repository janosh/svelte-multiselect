<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import { fly } from 'svelte/transition'
  import type { Option, _Option, Primitive } from './'
  import { CrossIcon, ExpandIcon, ReadOnlyIcon } from './icons'
  export let selected: Option[] = []
  export let selectedLabels: Primitive[] = []
  export let selectedValues: Primitive[] = []
  export let maxSelect: number | null = null // null means any number of options are selectable
  export let readonly = false
  export let placeholder = ``
  export let options: Option[]
  export let input: HTMLInputElement | null = null
  export let name = ``
  export let noOptionsMsg = `No matching options`
  export let activeOption: _Option | null = null

  export let outerDivClass = ``
  export let ulTokensClass = ``
  export let liTokenClass = ``
  export let ulOptionsClass = ``
  export let liOptionClass = ``

  export let removeBtnTitle = `Remove`
  export let removeAllTitle = `Remove all`
  export let defaultDisabledTitle = `This option is disabled`

  if (maxSelect !== null && maxSelect < 0) {
    console.error(`maxSelect must be null or positive integer, got ${maxSelect}`)
  }
  if (!(options?.length > 0)) console.error(`MultiSelect missing options`)
  if (!Array.isArray(selected)) console.error(`selected prop must be an array`)

  $: _options = options.map((option) => {
    if (!option.id) option.id = option.label
    if (!option.value) option.value = option.label
    if (!option.disabledTitle) option.disabledTitle = defaultDisabledTitle
    return option
  }) as _Option[]

  $: ids = _options.map((op) => op.id)

  $: if (new Set(ids).size !== options.length) {
    console.error(
      `Option IDs must be unique. Duplicate IDs found: ${ids.filter(
        (id, idx) => ids.indexOf(id) !== idx
      )}. May be due to duplicate option values being used as IDs. In that case, specify IDs explicitly.`
    )
  }

  $: selectedIds = selected.map((op) => op.id)
  $: selectedLabels = selected.map((op) => op.label)
  $: selectedValues = selected.map((op) => op.value)

  const dispatch = createEventDispatcher()
  let searchText = ``
  let showOptions = false

  $: matchingOptions = _options.filter((op) => {
    if (!searchText) return true
    return `${op.label}`.toLowerCase().includes(searchText.toLowerCase())
  })

  $: if (
    // if there was an active option but it's not in the filtered list of options
    (activeOption && !matchingOptions.map((op) => op.id).includes(activeOption.id)) ||
    // or there's no active option but the user entered search text
    (!activeOption && searchText)
  )
    // make the first filtered option active
    activeOption = matchingOptions[0]

  function add(id: Primitive) {
    if (
      !readonly &&
      !selectedIds.includes(id) &&
      // for maxselect = 1 we always replace current token with new selection
      (maxSelect == null || maxSelect == 1 || selected.length < maxSelect)
    ) {
      searchText = `` // reset search string on selection
      const token = options.find((op) => op.id === id)
      if (!token) {
        console.error(`MultiSelect: option with id ${id} not found`)
        return
      }
      selected = [token, ...selected]
      if (selected.length === maxSelect) setOptionsVisible(false)
      dispatch(`add`, { token })
      dispatch(`change`, { token, type: `add` })
    }
  }

  function remove(id: Primitive) {
    if (selected.length === 0 || readonly) return
    selected = selected.filter((token: Option) => id !== token.id)
    const token = options.find((option) => option.id === id)
    dispatch(`remove`, { token })
    dispatch(`change`, { token, type: `remove` })
  }

  function setOptionsVisible(show: boolean) {
    // nothing to do if visibility is already as intended
    if (readonly || show === showOptions) return
    showOptions = show
    if (show) input?.focus()
    else {
      input?.blur()
      activeOption = null
    }
  }

  // handle all keyboard events this component receives
  function handleKeydown(event: KeyboardEvent) {
    // on escape: dismiss options dropdown and reset search text
    if (event.key === `Escape`) {
      setOptionsVisible(false)
      searchText = ``
    }
    // on enter key: toggle active option and reset search text
    else if (event.key === `Enter`) {
      if (activeOption) {
        const { id, disabled } = activeOption
        if (disabled) return
        selectedIds.includes(id) ? remove(id) : add(id)
        searchText = ``
      } // no active option means the options dropdown is closed in which case enter means open it
      else setOptionsVisible(true)
    }
    // on up/down arrow keys: update active option
    else if ([`ArrowDown`, `ArrowUp`].includes(event.key)) {
      const increment = event.key === `ArrowUp` ? -1 : 1
      const newActiveIdx = matchingOptions.indexOf(activeOption) + increment

      if (newActiveIdx < 0) {
        // wrap around top
        activeOption = matchingOptions[matchingOptions.length - 1]
        // wrap around bottom
      } else if (newActiveIdx === matchingOptions.length) {
        activeOption = matchingOptions[0]
        // default case
      } else activeOption = matchingOptions[newActiveIdx]
    } else if (event.key === `Backspace`) {
      const id = selectedIds.pop()
      if (id && !searchText) remove(id)
    }
  }

  const removeAll = () => {
    dispatch(`remove`, { token: selected })
    dispatch(`change`, { token: selected, type: `remove` })
    selected = []
    searchText = ``
  }

  $: isSelected = (id: Primitive) => selectedIds.includes(id)

  const handleEnterAndSpaceKeys = (handler: () => void) => (event: KeyboardEvent) => {
    if ([`Enter`, `Space`].includes(event.code)) {
      event.preventDefault()
      handler()
    }
  }
</script>

<!-- z-index: 2 when showOptions is true ensures the ul.tokens of one <MultiSelect />
display above those of another following shortly after it -->
<div
  class="multiselect {outerDivClass}"
  class:readonly
  class:single={maxSelect == 1}
  style={showOptions ? `z-index: 2;` : ``}
  on:mouseup|stopPropagation={() => setOptionsVisible(true)}
>
  <ExpandIcon height="14pt" style="padding-left: 1pt;" />
  <ul class="tokens {ulTokensClass}">
    {#if maxSelect == 1 && selected[0]?.label}
      <span on:mouseup|self|stopPropagation={() => setOptionsVisible(true)}>
        {selected[0].label}
      </span>
    {:else}
      {#each selected as { label, id }}
        <li
          class={liTokenClass}
          on:mouseup|self|stopPropagation={() => setOptionsVisible(true)}
        >
          {label}
          {#if !readonly}
            <button
              on:mouseup|stopPropagation={() => remove(id)}
              on:keydown={handleEnterAndSpaceKeys(() => remove(id))}
              type="button"
              title="{removeBtnTitle} {id}"
            >
              <CrossIcon height="12pt" />
            </button>
          {/if}
        </li>
      {/each}
    {/if}
    <input
      bind:this={input}
      autocomplete="off"
      bind:value={searchText}
      on:mouseup|self|stopPropagation={() => setOptionsVisible(true)}
      on:keydown={handleKeydown}
      on:focus={() => setOptionsVisible(true)}
      on:blur={() => dispatch(`blur`)}
      on:blur={() => setOptionsVisible(false)}
      {name}
      placeholder={selectedIds.length ? `` : placeholder}
    />
  </ul>
  {#if readonly}
    <ReadOnlyIcon height="14pt" />
  {:else if selected.length > 0}
    <button
      type="button"
      class="remove-all"
      title={removeAllTitle}
      on:mouseup|stopPropagation={removeAll}
      on:keydown={handleEnterAndSpaceKeys(removeAll)}
    >
      <CrossIcon height="14pt" />
    </button>
  {/if}

  {#key showOptions}
    <ul
      class="options {ulOptionsClass}"
      class:hidden={!showOptions}
      transition:fly|local={{ duration: 300, y: 40 }}
    >
      {#each matchingOptions as { label, id, disabled, title = '', selectedTitle, disabledTitle }}
        <li
          on:mouseup|preventDefault|stopPropagation
          on:mousedown|preventDefault|stopPropagation={() => {
            if (disabled) return
            isSelected(id) ? remove(id) : add(id)
          }}
          class:selected={isSelected(id)}
          class:active={activeOption?.id === id}
          class:disabled
          title={disabled ? disabledTitle : (isSelected(id) && selectedTitle) || title}
          class={liOptionClass}
        >
          {label}
        </li>
      {:else}
        {noOptionsMsg}
      {/each}
    </ul>
  {/key}
</div>

<style>
  :where(.multiselect) {
    position: relative;
    margin: 1em 0;
    border: var(--sms-border, 1pt solid lightgray);
    border-radius: var(--sms-border-radius, 5pt);
    align-items: center;
    min-height: 18pt;
    display: flex;
    cursor: text;
  }
  :where(.multiselect:focus-within) {
    border: var(--sms-focus-border, 1pt solid var(--sms-active-color, cornflowerblue));
  }
  :where(.multiselect.readonly) {
    background: var(--sms-readonly-bg, lightgray);
  }

  :where(ul.tokens > li) {
    background: var(--sms-token-bg, var(--sms-active-color, cornflowerblue));
    align-items: center;
    border-radius: 4pt;
    display: flex;
    margin: 2pt;
    padding: 0 0 0 1ex;
    transition: 0.3s;
    white-space: nowrap;
    height: 16pt;
  }
  :where(ul.tokens > li button, button.remove-all) {
    align-items: center;
    border-radius: 50%;
    display: flex;
    cursor: pointer;
    transition: 0.2s;
  }
  :where(button) {
    color: inherit;
    background: transparent;
    border: none;
    cursor: pointer;
    outline: none;
    padding: 0 2pt;
  }
  :where(ul.tokens > li button:hover, button.remove-all:hover) {
    color: var(--sms-remove-x-hover-focus-color, lightskyblue);
  }
  :where(button:focus) {
    color: var(--sms-remove-x-hover-focus-color, lightskyblue);
    transform: scale(1.04);
  }

  :where(.multiselect input) {
    border: none;
    outline: none;
    background: none;
    color: var(--sms-text-color, inherit);
    flex: 1; /* this + next line fix issue #12 https://git.io/JiDe3 */
    min-width: 2em;
  }

  :where(ul.tokens) {
    display: flex;
    padding: 0;
    margin: 0;
    flex-wrap: wrap;
    flex: 1;
  }

  :where(ul.options) {
    list-style: none;
    max-height: 50vh;
    padding: 0;
    top: 100%;
    width: 100%;
    position: absolute;
    border-radius: 1ex;
    overflow: auto;
    background: var(--sms-options-bg, white);
  }
  :where(ul.options.hidden) {
    visibility: hidden;
  }
  :where(ul.options li) {
    padding: 3pt 2ex;
    cursor: pointer;
  }
  :where(ul.options li.selected) {
    border-left: var(
      --sms-li-selected-border-left,
      3pt solid var(--sms-selected-color, green)
    );
    background: var(--sms-li-selected-bg, inherit);
    color: var(--sms-li-selected-color, inherit);
  }
  :where(ul.options li:not(.selected):hover) {
    border-left: var(
      --sms-li-not-selected-hover-border-left,
      3pt solid var(--sms-active-color, cornflowerblue)
    );
    border-left: 3pt solid var(--blue);
  }
  :where(ul.options li.active) {
    background: var(--sms-li-active-bg, var(--sms-active-color, cornflowerblue));
  }
  :where(ul.options li.disabled) {
    background: var(--sms-li-disabled-bg, #f5f5f6);
    color: var(--sms-li-disabled-text, #b8b8b8);
    cursor: not-allowed;
  }
  :where(ul.options li.disabled:hover) {
    border-left: unset;
  }
</style>
