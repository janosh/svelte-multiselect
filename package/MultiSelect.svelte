<script>
  import { createEventDispatcher } from 'svelte'
  import { fly } from 'svelte/transition'

  import CrossIcon from './icons/Cross.svelte'
  import ExpandIcon from './icons/ChevronExpand.svelte'
  import ReadOnlyIcon from './icons/ReadOnly.svelte'

  export let selected
  export let maxSelect = null
  export let readonly = false
  export let placeholder = ``
  export let options
  export let input = undefined
  export let noOptionsMsg = `No matching options`

  if (maxSelect !== null && maxSelect < 0) {
    throw new TypeError(`maxSelect must be null or positive integer, got ${maxSelect}`)
  }
  $: single = maxSelect === 1
  $: selected = single ? `` : []

  if (!options?.length > 0) console.error(`MultiSelect missing options`)

  const dispatch = createEventDispatcher()
  let activeOption, filterValue
  let showOptions = false

  $: filtered = options.filter((option) =>
    filterValue ? option.toLowerCase().includes(filterValue.toLowerCase()) : option
  )
  $: if (
    (activeOption && !filtered.includes(activeOption)) ||
    (!activeOption && filterValue)
  )
    activeOption = filtered[0]

  function add(token) {
    if (
      !readonly &&
      !selected.includes(token) &&
      (maxSelect === null || selected.length < maxSelect)
    ) {
      filterValue = ``
      selected = single ? token : [token, ...selected]
      if (selected.length === maxSelect) {
        setOptionsVisible(false)
        input.blur()
      }
      dispatch(`add`, { token })
    }
  }

  function remove(token) {
    if (readonly || single) return
    selected = selected.filter((item) => item !== token)
    dispatch(`remove`, { token })
  }

  function setOptionsVisible(show) {
    if (readonly) return
    showOptions = show
    if (show) input.focus()
    else activeOption = undefined
  }

  function handleKeydown(event) {
    if (event.key === `Escape`) {
      setOptionsVisible(false)
      filterValue = ``
    } else if (event.key === `Enter`) {
      if (activeOption) {
        selected.includes(activeOption) ? remove(activeOption) : add(activeOption)
        filterValue = ``
      } // no active option means the options are closed in which case enter means open
      else setOptionsVisible(true)
    } else if ([`ArrowDown`, `ArrowUp`].includes(event.key)) {
      const increment = event.key === `ArrowUp` ? -1 : 1
      const newActiveIdx = filtered.indexOf(activeOption) + increment

      if (newActiveIdx < 0) {
        activeOption = filtered[filtered.length - 1]
      } else {
        if (newActiveIdx === filtered.length) activeOption = filtered[0]
        else activeOption = filtered[newActiveIdx]
      }
    } else if (event.key === `Backspace`) {
      if (selected.length > 0) selected = selected.slice(0, selected.length - 1)
    }
  }

  const removeAll = () => {
    selected = single ? `` : []
    filterValue = ``
  }
</script>

<div
  class="multiselect"
  class:readonly
  class:single
  on:click|self={() => setOptionsVisible(true)}>
  <ExpandIcon height="14pt" style="padding-left: 1pt;" />
  <ul class="tokens">
    {#if single}
      {selected}
    {:else}
      {#each selected as itm}
        <li class="token">
          {itm}
          {#if !readonly}
            <button
              on:click|stopPropagation={() => remove(itm)}
              type="button"
              title="Remove {itm}">
              <CrossIcon height="11pt" />
            </button>
          {/if}
        </li>
      {/each}
    {/if}
    <input
      bind:this={input}
      autocomplete="off"
      bind:value={filterValue}
      on:click|self={() => setOptionsVisible(true)}
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
      title="Remove All"
      on:click={removeAll}
      style={selected.length === 0 ? `display: none;` : ``}>
      <CrossIcon height="14pt" />
    </button>
  {/if}

  {#if showOptions}
    <ul class="options" transition:fly={{ duration: 200, y: 25 }}>
      {#each filtered as option}
        <li
          on:mousedown|preventDefault={() =>
            selected.includes(option) ? remove(option) : add(option)}
          class:selected={selected.includes(option)}
          class:active={activeOption === option}>
          {option}
        </li>
      {:else}
        {noOptionsMsg}
      {/each}
    </ul>
  {/if}
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

  li.token {
    background: var(--sms-token-bg, var(--sms-active-color, cornflowerblue));
    align-items: center;
    border-radius: 4pt;
    display: flex;
    margin: 2pt;
    padding: 0 0 0 1ex;
    transition: 0.3s;
    white-space: nowrap;
    line-height: 16pt;
  }
  li.token button,
  button.remove-all {
    align-items: center;
    border-radius: 50%;
    display: flex;
    cursor: pointer;
    transition: 0.2s;
  }
  li.token button:hover,
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
    width: 1pt;
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
    z-index: 1;
    cursor: pointer;
    position: absolute;
    border-radius: 1ex;
    overflow: auto;
    background: var(--sms-options-bg, white);
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
