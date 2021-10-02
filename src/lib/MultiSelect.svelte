<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import { fly } from 'svelte/transition'

  import CrossIcon from './icons/Cross.svelte'
  import ExpandIcon from './icons/ChevronExpand.svelte'
  import ReadOnlyIcon from './icons/ReadOnly.svelte'

  export let selected: string[] | string
  export let maxSelect: number | null = null // null means any number of options are selectable
  export let readonly = false
  export let placeholder = ``
  export let options: string[]
  export let input: HTMLInputElement | null = null
  export let noOptionsMsg = `No matching options`

  export let outerDivClass = ``
  export let ulTokensClass = ``
  export let liTokenClass = ``
  export let ulOptionsClass = ``
  export let liOptionClass = ``

  export let removeBtnTitle = `Remove`
  export let removeAllTitle = `Remove all`

  if (maxSelect !== null && maxSelect < 0) {
    throw new TypeError(`maxSelect must be null or positive integer, got ${maxSelect}`)
  }
  $: single = maxSelect === 1
  if (!selected) selected = single ? `` : []

  if (!(options?.length > 0)) console.error(`MultiSelect missing options`)

  const dispatch = createEventDispatcher()
  let activeOption: string, searchText: string
  let showOptions = false

  $: filteredOptions = searchText
    ? options.filter((option) => option.toLowerCase().includes(searchText.toLowerCase()))
    : options
  $: if (
    (activeOption && !filteredOptions.includes(activeOption)) ||
    (!activeOption && searchText)
  )
    activeOption = filteredOptions[0]

  function add(token: string) {
    if (
      !readonly &&
      !selected.includes(token) &&
      // (... || single) because in single mode, we always replace current token with new selection
      (maxSelect === null || selected.length < maxSelect || single)
    ) {
      searchText = `` // reset search string on selection
      selected = single ? token : [token, ...selected]
      if (
        (Array.isArray(selected) && selected.length === maxSelect) ||
        typeof selected === `string`
      ) {
        setOptionsVisible(false)
        input?.blur()
      }
      dispatch(`add`, { token })
      dispatch(`change`, { token, type: `add` })
    }
  }

  function remove(token: string) {
    if (readonly || typeof selected === `string`) return
    selected = selected.filter((item: string) => item !== token)
    dispatch(`remove`, { token })
    dispatch(`change`, { token, type: `remove` })
  }

  function setOptionsVisible(show: boolean) {
    // nothing to do if visibility is already as intended
    if (readonly || show === showOptions) return
    showOptions = show
    if (show) input?.focus()
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === `Escape`) {
      setOptionsVisible(false)
      searchText = ``
    } else if (event.key === `Enter`) {
      if (activeOption) {
        selected.includes(activeOption) ? remove(activeOption) : add(activeOption)
        searchText = ``
      } // no active option means the options are closed in which case enter means open
      else setOptionsVisible(true)
    } else if ([`ArrowDown`, `ArrowUp`].includes(event.key)) {
      const increment = event.key === `ArrowUp` ? -1 : 1
      const newActiveIdx = filteredOptions.indexOf(activeOption) + increment

      if (newActiveIdx < 0) {
        activeOption = filteredOptions[filteredOptions.length - 1]
      } else {
        if (newActiveIdx === filteredOptions.length) activeOption = filteredOptions[0]
        else activeOption = filteredOptions[newActiveIdx]
      }
    } else if (event.key === `Backspace`) {
      // only remove selected tags on backspace if if there are any and no searchText characters remain
      if (selected.length > 0 && searchText.length === 0) {
        selected = selected.slice(0, selected.length - 1)
      }
    }
  }

  const removeAll = () => {
    dispatch(`remove`, { token: selected })
    dispatch(`change`, { token: selected, type: `remove` })
    selected = single ? `` : []
    searchText = ``
  }

  $: isSelected = (option: string) => {
    if (!(selected?.length > 0)) return false // nothing is selected if `selected` is the empty array or string
    if (single) return selected === option
    else return selected.includes(option)
  }
</script>

<!-- z-index: 2 when showOptions is ture ensures the ul.tokens of one <MultiSelect /> display above those of another following shortly after it -->
<div
  class="multiselect {outerDivClass}"
  class:readonly
  class:single
  style={showOptions ? `z-index: 2;` : ``}
  on:mouseup|stopPropagation={() => setOptionsVisible(true)}>
  <ExpandIcon height="14pt" style="padding-left: 1pt;" />
  <ul class="tokens {ulTokensClass}">
    {#if single}
      <span on:mouseup|self|stopPropagation={() => setOptionsVisible(true)}>
        {selected}
      </span>
    {:else if selected?.length > 0}
      {#each selected as tag}
        <li
          class={liTokenClass}
          on:mouseup|self|stopPropagation={() => setOptionsVisible(true)}>
          {tag}
          {#if !readonly}
            <button
              on:mouseup|stopPropagation={() => remove(tag)}
              type="button"
              title="{removeBtnTitle} {tag}">
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
      placeholder={selected.length ? `` : placeholder} />
  </ul>
  {#if readonly}
    <ReadOnlyIcon height="14pt" />
  {:else}
    <button
      type="button"
      class="remove-all"
      title={removeAllTitle}
      on:mouseup|stopPropagation={removeAll}
      style={selected.length === 0 ? `display: none;` : ``}>
      <CrossIcon height="14pt" />
    </button>
  {/if}

  {#key showOptions}
    <ul
      class="options {ulOptionsClass}"
      class:hidden={!showOptions}
      transition:fly={{ duration: 300, y: 40 }}>
      {#each filteredOptions as option}
        <li
          on:mouseup|preventDefault|stopPropagation
          on:mousedown|preventDefault|stopPropagation={() =>
            isSelected(option) ? remove(option) : add(option)}
          class:selected={isSelected(option)}
          class:active={activeOption === option}
          class={liOptionClass}>
          {option}
        </li>
      {:else}
        {noOptionsMsg}
      {/each}
    </ul>
  {/key}
</div>

<style>
  .multiselect {
    position: relative;
    margin: 1em 0;
    border: var(--sms-border, 1pt solid lightgray);
    border-radius: var(--sms-border-radius, 5pt);
    align-items: center;
    min-height: 18pt;
    display: flex;
    cursor: text;
  }
  .multiselect:focus-within {
    border: var(--sms-focus-border, 1pt solid var(--sms-active-color, cornflowerblue));
  }
  .multiselect.readonly {
    background: var(--sms-readonly-bg, lightgray);
  }

  ul.tokens > li {
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
  ul.tokens > li button,
  button.remove-all {
    align-items: center;
    border-radius: 50%;
    display: flex;
    cursor: pointer;
    transition: 0.2s;
  }
  ul.tokens > li button:hover,
  button.remove-all:hover {
    color: var(--sms-remove-x-hover-color, lightgray);
  }
  button {
    color: inherit;
    background: transparent;
    border: none;
    cursor: pointer;
    outline: none;
    padding: 0 2pt;
  }

  .multiselect input {
    border: none;
    outline: none;
    background: none;
    /* needed to hide red shadow around required inputs in some browsers */
    box-shadow: none;
    color: var(--sms-text-color, inherit);
    flex: 1;
  }

  ul.tokens {
    display: flex;
    padding: 0;
    margin: 0;
    flex-wrap: wrap;
    flex: 1;
  }

  ul.options {
    list-style: none;
    max-height: 50vh;
    padding: 0;
    top: 100%;
    width: 100%;
    cursor: pointer;
    position: absolute;
    border-radius: 1ex;
    overflow: auto;
    background: var(--sms-options-bg, white);
  }
  ul.options.hidden {
    visibility: hidden;
  }
  ul.options li {
    padding: 3pt 2ex;
  }
  ul.options li.selected {
    border-left: var(
      --sms-li-selected-border-left,
      3pt solid var(--sms-selected-color, green)
    );
    background: var(--sms-li-selected-bg, inherit);
    color: var(--sms-li-selected-color, inherit);
  }
  ul.options li:not(.selected):hover {
    border-left: var(
      --sms-li-not-selected-hover-border-left,
      3pt solid var(--sms-active-color, cornflowerblue)
    );
    border-left: 3pt solid var(--blue);
  }
  ul.options li.active {
    background: var(--sms-li-active-bg, var(--sms-active-color, cornflowerblue));
  }
</style>
