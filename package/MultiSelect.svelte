<script>
  import { createEventDispatcher } from 'svelte'
  import { fly } from 'svelte/transition'

  import CrossIcon from './icons/Cross.svelte'
  import ExpandIcon from './icons/ChevronExpand.svelte'
  import ReadOnlyIcon from './icons/ReadOnly.svelte'

  export let selected = []
  export let readonly = false
  export let placeholder = ``
  export let options
  export let single = false
  export let input = undefined

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
      (!readonly && !selected.includes(token) && !single) ||
      (single && selected.length !== 1)
    ) {
      filterValue = ``
      selected = single ? token : [token, ...selected]
      if (single) {
        setOptionsVisible(false)
        input.blur()
      }
    }
  }

  function remove(token) {
    if (readonly || single) return
    selected = selected.filter((str) => str !== token)
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
      const calcIndex = filtered.indexOf(activeOption) + increment
      if (calcIndex < 0) {
        activeOption = filtered[filtered.length - 1]
      } else {
        if (calcIndex === filtered.length) activeOption = filtered[0]
        else activeOption = filtered[calcIndex]
      }
    }
  }

  const removeAll = () => {
    selected = []
    filterValue = ``
  }
</script>

<div class="multiselect" class:readonly on:click|self={() => setOptionsVisible(true)}>
  <ExpandIcon height="18pt" style="padding-left: 4pt;" />
  {#if single}
    {selected}
  {:else}
    {#each selected as itm}
      <span class="token">
        {itm}
        {#if !readonly}
          <button
            on:click|stopPropagation={() => remove(itm)}
            type="button"
            title="Remove {itm}">
            <CrossIcon height="18pt" />
          </button>
        {/if}
      </span>
    {/each}
  {/if}
  {#if readonly}
    <ReadOnlyIcon height="18pt" />
  {:else}
    <input
      bind:this={input}
      on:click|self={() => setOptionsVisible(true)}
      on:blur={() => dispatch(`blur`)}
      autocomplete="off"
      bind:value={filterValue}
      on:keydown={handleKeydown}
      on:focus={() => setOptionsVisible(true)}
      on:blur={() => setOptionsVisible(false)}
      style="flex: 1;"
      placeholder={selected.length ? `` : placeholder} />
    <button
      type="button"
      class="remove-all"
      title="Remove All"
      on:click={removeAll}
      style={selected.length === 0 && `display: none;`}>
      <CrossIcon height="18pt" />
    </button>
  {/if}

  {#if showOptions}
    <ul transition:fly={{ duration: 200, y: 50 }}>
      {#each filtered as option}
        <li
          on:mousedown|preventDefault={() =>
            selected.includes(option) ? remove(option) : add(option)}
          class:selected={selected.includes(option)}
          class:active={activeOption === option}>
          {option}
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .multiselect {
    position: relative;
    border-radius: 5pt;
    margin: 1em 0;
    min-height: 2em;
    border: 1pt solid lightgray;
    align-items: center;
    display: flex;
    flex-wrap: wrap;
  }
  .multiselect:focus-within {
    border: 1pt solid var(--blue);
  }
  .multiselect.readonly {
    background: lightgray;
  }

  span.token {
    background-color: var(--blue);
    align-items: center;
    border-radius: 1ex;
    display: flex;
    margin: 3pt;
    padding: 0 0 0 1ex;
    transition: 0.3s;
    white-space: nowrap;
  }
  span.token button,
  .remove-all {
    align-items: center;
    border-radius: 50%;
    display: flex;
    cursor: pointer;
    transition: 0.2s;
  }
  span.token button:hover,
  .remove-all:hover {
    color: lightgray;
  }
  button {
    color: inherit;
    background: transparent;
    border: none;
    cursor: pointer;
    outline: none;
    padding: 0 3pt;
  }

  .multiselect input {
    border: none;
    outline: none;
    background: none;
    padding: 0;
    width: 1pt;
    padding: 1pt;
    /* needed to hide red shadow around required inputs in some browsers */
    box-shadow: none;
    color: inherit;
  }

  ul {
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
    background: white;
  }
  li {
    padding: 3pt 2ex;
  }
  li.selected {
    border-left: 3pt solid green;
  }
  li:not(.selected):hover {
    border-left: 3pt solid var(--blue);
  }
  li.active {
    background: var(--blue);
  }
</style>
