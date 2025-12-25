<h1 align="center">
  <img src="https://raw.githubusercontent.com/janosh/svelte-multiselect/main/static/favicon.svg" alt="Svelte MultiSelect" height="60" width="60">
  <br class="hide-in-docs">&ensp;Svelte MultiSelect
</h1>

<h4 align="center">

[![Tests](https://github.com/janosh/svelte-multiselect/actions/workflows/test.yml/badge.svg)](https://github.com/janosh/svelte-multiselect/actions/workflows/test.yml)
[![GitHub Pages](https://github.com/janosh/svelte-multiselect/actions/workflows/gh-pages.yml/badge.svg)](https://github.com/janosh/svelte-multiselect/actions/workflows/gh-pages.yml)
[![NPM version](https://img.shields.io/npm/v/svelte-multiselect?logo=NPM&color=purple)](https://npmjs.com/package/svelte-multiselect)
[![Needs Svelte version](https://img.shields.io/npm/dependency-version/svelte-multiselect/peer/svelte?color=teal&logo=Svelte&label=Svelte)](https://github.com/sveltejs/svelte/blob/master/packages/svelte/CHANGELOG.md)
[![Playground](https://img.shields.io/badge/Svelte-Playground-blue?label=Try%20it!)](https://svelte.dev/playground/a5a14b8f15d64cb083b567292480db05)
[![Open in StackBlitz](https://img.shields.io/badge/Open%20in-StackBlitz-darkblue?logo=stackblitz)](https://stackblitz.com/github/janosh/svelte-multiselect)

</h4>

<p align="center"><strong>
  Keyboard-friendly, accessible and highly customizable multi-select component.
  <a class="hide-in-docs" href="https://janosh.github.io/svelte-multiselect">View the docs</a>
</strong></p>

<slot name="examples" />

## 💡 &thinsp; Features

- **Bindable:** `bind:selected` gives you an array of the currently selected options. Thanks to Svelte's 2-way binding, it can also control the component state externally through assignment `selected = ['foo', 42]`.
- **Keyboard friendly** for mouse-less form completion
- **No run-time deps:** needs only Svelte as dev dependency
- **Dropdowns:** scrollable lists for large numbers of options
- **Searchable:** start typing to filter options
- **Tagging:** selected options are listed as tags within the input
- **Single / multiple select:** pass `maxSelect={1, 2, 3, ...}` prop to restrict the number of selectable options
- **Configurable:** see props

## 🧪 &thinsp; Coverage

| Statements                                                                                 | Branches                                                                          | Lines                                                                            |
| ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| ![Statements](https://img.shields.io/badge/statements-92.81%25-brightgreen.svg?style=flat) | ![Branches](https://img.shields.io/badge/branches-81.57%25-yellow.svg?style=flat) | ![Lines](https://img.shields.io/badge/lines-92.81%25-brightgreen.svg?style=flat) |

## 🔨 &thinsp; Installation

```sh
npm install --dev svelte-multiselect
pnpm add -D svelte-multiselect
yarn add --dev svelte-multiselect
```

## 📙 &thinsp; Usage

```svelte
<script>
  import MultiSelect from 'svelte-multiselect'

  const ui_libs = [`Svelte`, `React`, `Vue`, `Angular`, `...`]

  let selected = $state([])
</script>

Favorite Frontend Tools?

<code>selected = {JSON.stringify(selected)}</code>

<MultiSelect bind:selected options={ui_libs} />
```

## 🧠 &thinsp; Mental Model

| Prop            | Purpose                                                | Value                                                                               |
| --------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| `options`       | What users can choose from                             | Array of strings, numbers, or objects with `label` property                         |
| `bind:selected` | Which options users have chosen                        | Always an array: `[]`, `['Apple']` or `['Apple', 'Banana']`                         |
| `bind:value`    | Single-select convenience for the user-selected option | Single item: `'Apple'` (or `null`) if `maxSelect={1}`, otherwise same as `selected` |

### Common Patterns

```svelte
<!-- Multi-select -->
<MultiSelect bind:selected options={['A', 'B', 'C']} />

<!-- Single-select -->
<MultiSelect bind:value options={colors} maxSelect={1} />

<!-- Object options (need 'label' property, can have arbitrary other keys, some like `value`, `disabled`, `preselected`, `style` have special meaning, see type ObjectOption) -->
<MultiSelect
  bind:selected
  options={[
    { label: 'Red', value: '#ff0000' },
    { label: 'Blue', value: '#0000ff' },
  ]}
/>
```

### Troubleshooting

- **Object options not working?** → Add `label` property
- **Dropdown not showing?** → Check you have `options` and not `disabled={true}`
- **Want single item not array?** → Use `bind:value` with `maxSelect={1}`
- **Types confusing?** → Component auto-infers type of `selected` and `value` from your `options` array

## 🔣 &thinsp; Props

Complete reference of all props. Props are organized by importance - **Essential Props** are what you'll use most often.

> **💡 Tip:** The `Option` type is automatically inferred from your `options` array, or you can import it: `import { type Option } from 'svelte-multiselect'`

### Essential Props

These are the core props you'll use in most cases:

1. ```ts
   options: Option[]  // REQUIRED
   ```

   **The only required prop.** Array of strings, numbers, or objects that users can select from. Objects must have a `label` property that will be displayed in the dropdown.

   ```svelte
   <!-- Simple options -->
   <MultiSelect options={['Red', 'Green', 'Blue']} />

   <!-- Object options -->
   <MultiSelect
     options={[
       { label: 'Red', value: '#ff0000', hex: true },
       { label: 'Green', value: '#00ff00', hex: true },
     ]}
   />
   ```

1. ```ts
   selected: Option[] = []  // bindable
   ```

   **Your main state variable.** Array of currently selected options. Use `bind:selected` for two-way binding.

   ```svelte
   <script>
     let selected = $state(['Red']) // Pre-select Red
   </script>
   <MultiSelect bind:selected options={colors} />
   ```

1. ```ts
   value: Option | Option[] | null = null  // bindable
   ```

   **Alternative to `selected`.** When `maxSelect={1}`, `value` is the single selected item (not an array). Otherwise, `value` equals `selected`.

   ```svelte
   <!-- Single-select: value = 'Red' (not ['Red']) -->
   <MultiSelect bind:value options={colors} maxSelect={1} />

   <!-- Multi-select: value = ['Red', 'Blue'] (same as selected) -->
   <MultiSelect bind:value options={colors} />
   ```

1. ```ts
   maxSelect: number | null = null
   ```

   **Controls selection behavior.** `null` = unlimited, `1` = single select, `2+` = limited multi-select.

   ```svelte
   <!-- Unlimited selection -->
   <MultiSelect options={colors} />

   <!-- Single selection -->
   <MultiSelect options={colors} maxSelect={1} />

   <!-- Max 3 selections -->
   <MultiSelect options={colors} maxSelect={3} />
   ```

1. ```ts
   placeholder: string | { text: string; persistent?: boolean } | null = null
   ```

   Text shown when no options are selected. Can be a simple string or an object with extended options:

   ```svelte
   <!-- Simple string -->
   <MultiSelect placeholder="Choose..." />

   <!-- Object with persistent option (stays visible even when options selected) -->
   <MultiSelect placeholder={{ text: 'Add items...', persistent: true }} />
   ```

1. ```ts
   disabled: boolean = false
   ```

   Disables the component. Users can't interact with it, but it's still rendered.

1. ```ts
   required: boolean | number = false
   ```

   For form validation. `true` means at least 1 option required, numbers specify exact minimum.

### Commonly Used Props

1. ```ts
   searchText: string = `` // bindable
   ```

   The text user entered to filter options. Bindable for external control.

1. ```ts
   open: boolean = false // bindable
   ```

   Whether the dropdown is visible. Bindable for external control.

1. ```ts
   allowUserOptions: boolean | `append` = false
   ```

   Whether users can create new options by typing. `true` = add to selected only, `'append'` = add to both options and selected.

1. ```ts
   allowEmpty: boolean = false
   ```

   Whether to allow the component to exist with no options. If `false`, shows console error when no options provided (unless `loading`, `disabled`, or `allowUserOptions` is `true`).

1. ```ts
   loading: boolean = false
   ```

   Shows a loading spinner. Useful when fetching options asynchronously.

1. ```ts
   invalid: boolean = false // bindable
   ```

   Marks the component as invalid (adds CSS class). Automatically set during form validation.

### Advanced Props

1. ```ts
   loadOptions: LoadOptionsFn | LoadOptionsConfig = undefined
   ```

   **Dynamic loading for large datasets.** Enables lazy loading / infinite scroll instead of passing static `options`. Pass either a function or an object with config:

   ```svelte
   <!-- Simple: just a function -->
   <MultiSelect loadOptions={myFetchFn} />

   <!-- With config -->
   <MultiSelect loadOptions={{ fetch: myFetchFn, debounceMs: 500, batchSize: 20 }} />
   ```

   The function receives `{ search, offset, limit }` and must return `{ options, hasMore }`:

   ```ts
   async function load_options({ search, offset, limit }) {
     const response = await fetch(`/api/items?q=${search}&skip=${offset}&take=${limit}`)
     const { items, total } = await response.json()
     return { options: items, hasMore: offset + limit < total }
   }
   ```

   Config options (when passing an object):

   | Key          | Type      | Default | Description                                 |
   | ------------ | --------- | ------- | ------------------------------------------- |
   | `fetch`      | `fn`      | —       | Async function to load options (required)   |
   | `debounceMs` | `number`  | `300`   | Debounce delay for search queries           |
   | `batchSize`  | `number`  | `50`    | Number of options to load per batch         |
   | `onOpen`     | `boolean` | `true`  | Whether to load options when dropdown opens |

   Features automatic state management, debounced search, infinite scroll pagination, and loading indicators. See the [infinite-scroll demo](https://janosh.github.io/svelte-multiselect/infinite-scroll) for live examples.

1. ```ts
   activeIndex: number | null = null  // bindable
   ```

   Zero-based index of currently active option in the filtered list.

1. ```ts
   activeOption: Option | null = null  // bindable
   ```

   Currently active option (hovered or navigated to with arrow keys).

1. ```ts
   createOptionMsg: string | null = `Create this option...`
   ```

   Message shown when `allowUserOptions` is enabled and user can create a new option.

1. ```ts
   duplicates: boolean = false
   ```

   Whether to allow selecting the same option multiple times.

<!-- deno-fmt-ignore -->
1. ```ts
   filterFunc: (opt: Option, searchText: string) => boolean
   ```

   Custom function to filter options based on search text. Default filters by label.

<!-- deno-fmt-ignore -->
1. ```ts
   key: (opt: Option) => unknown
   ```

   Function to determine option equality. Default compares by lowercased label.

1. ```ts
   closeDropdownOnSelect: boolean | 'if-mobile' | 'retain-focus' = false
   ```

   Whether to close dropdown after selection. `false` (default) keeps dropdown open for rapid multi-selection. `true` closes after each selection. `'if-mobile'` closes on mobile devices only (screen width below `breakpoint`). `'retain-focus'` closes dropdown but keeps input focused for rapid typing to create custom options from text input (see `allowUserOptions`).

1. ```ts
   resetFilterOnAdd: boolean = true
   ```

   Whether to clear search text when an option is selected.

1. ```ts
   sortSelected: boolean | ((a: Option, b: Option) => number) = false
   ```

   Whether/how to sort selected options. `true` uses default sort, function enables custom sorting.

1. ```ts
   portal: { target_node?: HTMLElement; active?: boolean } = {}
   ```

   Configuration for portal rendering. When `active: true`, the dropdown is rendered at document.body level with fixed positioning. Useful for avoiding z-index and overflow issues.

### Form & Accessibility Props

1. ```ts
   id: string | null = null
   ```

   Applied to the `<input>` for associating with `<label>` elements.

1. ```ts
   name: string | null = null
   ```

   Form field name for form submission.

1. ```ts
   autocomplete: string = 'off'
   ```

   Browser autocomplete behavior. Usually `'on'` or `'off'`.

1. ```ts
   inputmode: string | null = null
   ```

   Hint for mobile keyboard type (`'numeric'`, `'tel'`, `'email'`, etc.). Set to `'none'` to hide keyboard.

1. ```ts
   pattern: string | null = null
   ```

   Regex pattern for input validation.

### UI & Behavior Props

1. ```ts
   maxOptions: number | undefined = undefined
   ```

   Limit number of options shown in dropdown. `undefined` = no limit.

1. ```ts
   minSelect: number | null = null
   ```

   Minimum selections required before remove buttons appear.

1. ```ts
   autoScroll: boolean = true
   ```

   Whether to keep active option in view when navigating with arrow keys.

1. ```ts
   breakpoint: number = 800
   ```

   Screen width (px) that separates 'mobile' from 'desktop' behavior.

1. ```ts
   fuzzy: boolean = true
   ```

   Whether to use fuzzy matching for filtering options. When `true` (default), matches non-consecutive characters (e.g., "ga" matches "Grapes" and "Green Apple"). When `false`, uses substring matching only.

1. ```ts
   highlightMatches: boolean = true
   ```

   Whether to highlight matching text in dropdown options.

1. ```ts
   keepSelectedInDropdown: false | 'plain' | 'checkboxes' = false
   ```

   Controls whether selected options remain visible in dropdown. `false` (default) hides selected options. `'plain'` shows them with visual distinction. `'checkboxes'` prefixes each option with a checkbox.

1. ```ts
   selectAllOption: boolean | string = false
   ```

   Adds a "Select All" option at the top of the dropdown. `true` shows default label, or pass a custom string label.

1. ```ts
   liSelectAllClass: string = ''
   ```

   CSS class applied to the "Select All" `<li>` element.

1. ```ts
   parseLabelsAsHtml: boolean = false
   ```

   Whether to render option labels as HTML. **Warning:** Don't combine with `allowUserOptions` (XSS risk).

1. ```ts
   selectedOptionsDraggable: boolean = !sortSelected
   ```

   Whether selected options can be reordered by dragging.

1. ```ts
   selectedFlipParams: FlipParams = { duration: 100 }
   ```

   Animation parameters for the [Svelte flip animation](https://svelte.dev/docs/svelte/svelte-animate) when reordering selected options via drag-and-drop. Set `{ duration: 0 }` to disable animation. Accepts `duration`, `delay`, and `easing` properties.

### Message Props

1. ```ts
   noMatchingOptionsMsg: string = 'No matching options'
   ```

   Message when search yields no results.

1. ```ts
   duplicateOptionMsg: string = 'This option is already selected'
   ```

   Message when user tries to create duplicate option.

1. ```ts
   defaultDisabledTitle: string = 'This option is disabled'
   ```

   Tooltip for disabled options.

1. ```ts
   disabledInputTitle: string = 'This input is disabled'
   ```

   Tooltip when component is disabled.

1. ```ts
   removeAllTitle: string = 'Remove all'
   ```

   Tooltip for remove-all button.

1. ```ts
   removeBtnTitle: string = 'Remove'
   ```

   Tooltip for individual remove buttons.

<!-- deno-fmt-ignore -->
1. ```ts
   maxSelectMsg: ((current: number, max: number) => string) | null
   ```

   Function to generate "X of Y selected" message. `null` = no message.

### DOM Element References (bindable)

These give you access to DOM elements after the component mounts:

1. ```ts
   input: HTMLInputElement | null = null  // bindable
   ```

   Handle to the main `<input>` DOM element.

1. ```ts
   form_input: HTMLInputElement | null = null  // bindable
   ```

   Handle to the hidden form input used for validation.

1. ```ts
   outerDiv: HTMLDivElement | null = null  // bindable
   ```

   Handle to the outer wrapper `<div>` element.

### Styling Props

For custom styling with CSS frameworks or one-off styles:

1. ```ts
   style: string | null = null
   ```

   CSS rules for the outer wrapper div.

1. ```ts
   inputStyle: string | null = null
   ```

   CSS rules for the main input element.

1. ```ts
   ulSelectedStyle: string | null = null
   ```

   CSS rules for the selected options list.

1. ```ts
   ulOptionsStyle: string | null = null
   ```

   CSS rules for the dropdown options list.

1. ```ts
   liSelectedStyle: string | null = null
   ```

   CSS rules for selected option list items.

1. ```ts
   liOptionStyle: string | null = null
   ```

   CSS rules for dropdown option list items.

### CSS Class Props

For use with CSS frameworks like Tailwind:

1. ```ts
   outerDivClass: string = ''
   ```

   CSS class for outer wrapper div.

1. ```ts
   inputClass: string = ''
   ```

   CSS class for main input element.

1. ```ts
   ulSelectedClass: string = ''
   ```

   CSS class for selected options list.

1. ```ts
   ulOptionsClass: string = ''
   ```

   CSS class for dropdown options list.

1. ```ts
   liSelectedClass: string = ''
   ```

   CSS class for selected option items.

1. ```ts
   liOptionClass: string = ''
   ```

   CSS class for dropdown option items.

1. ```ts
   liActiveOptionClass: string = ''
   ```

   CSS class for the currently active dropdown option.

1. ```ts
   liUserMsgClass: string = ''
   ```

   CSS class for user messages (no matches, create option, etc.).

1. ```ts
   liActiveUserMsgClass: string = ''
   ```

   CSS class for active user messages.

1. ```ts
   maxSelectMsgClass: string = ''
   ```

   CSS class for the "X of Y selected" message.

### Read-only Props (bindable)

These reflect internal component state:

1. ```ts
   matchingOptions: Option[] = []  // bindable
   ```

   Currently filtered options based on search text.

### Bindable Props

`selected`, `value`, `searchText`, `open`, `activeIndex`, `activeOption`, `invalid`, `input`, `outerDiv`, `form_input`, `options`, `matchingOptions`

## 🎰 &thinsp; Snippets

`MultiSelect.svelte` accepts the following named snippets:

1. `#snippet option({ option, idx })`: Customize rendering of dropdown options. Receives as props an `option` and the zero-indexed position (`idx`) it has in the dropdown.
1. `#snippet selectedItem({ option, idx })`: Customize rendering of selected items. Receives as props an `option` and the zero-indexed position (`idx`) it has in the list of selected items.
1. `#snippet spinner()`: Custom spinner component to display when in `loading` state. Receives no props.
1. `#snippet disabledIcon()`: Custom icon to display inside the input when in `disabled` state. Receives no props. Use an empty `{#snippet disabledIcon()}{/snippet}` to remove the default disabled icon.
1. `#snippet expandIcon()`: Allows setting a custom icon to indicate to users that the Multiselect text input field is expandable into a dropdown list. Receives prop `open: boolean` which is true if the Multiselect dropdown is visible and false if it's hidden.
1. `#snippet removeIcon()`: Custom icon to display as remove button. Will be used both by buttons to remove individual selected options and the 'remove all' button that clears all options at once. Receives no props.
1. `#snippet userMsg({ searchText, msgType, msg })`: Displayed like a dropdown item when the list is empty and user is allowed to create custom options based on text input (or if the user's text input clashes with an existing option). Receives props:
   - `searchText`: The text user typed into search input.
   - `msgType: false | 'create' | 'dupe' | 'no-match'`: `'dupe'` means user input is a duplicate of an existing option. `'create'` means user is allowed to convert their input into a new option not previously in the dropdown. `'no-match'` means user input doesn't match any dropdown items and users are not allowed to create new options. `false` means none of the above.
   - `msg`: Will be `duplicateOptionMsg` or `createOptionMsg` (see [props](#🔣-props)) based on whether user input is a duplicate or can be created as new option. Note this snippet replaces the default UI for displaying these messages so the snippet needs to render them instead (unless purposely not showing a message).
1. `snippet='after-input'`: Placed after the search input. For arbitrary content like icons or temporary messages. Receives props `selected: Option[]`, `disabled: boolean`, `invalid: boolean`, `id: string | null`, `placeholder: string`, `open: boolean`, `required: boolean`. Can serve as a more dynamic, more customizable alternative to the `placeholder` prop.

Example using several snippets:

```svelte
<MultiSelect options={[`Red`, `Green`, `Blue`, `Yellow`, `Purple`]}>
  {#snippet children({ idx, option })}
    <span style="display: flex; align-items: center; gap: 6pt">
      <span
        style:background={`${option}`}
        style="border-radius: 50%; width: 1em; height: 1em"
      ></span>
      {idx + 1}
      {option}
    </span>
  {/snippet}
  {#snippet spinner()}
    <CustomSpinner />
  {/snippet}
  {#snippet removeIcon()}
    <strong>X</strong>
  {/snippet}
</MultiSelect>
```

## 🎬 &thinsp; Events

`MultiSelect.svelte` dispatches the following events:

1. ```ts
   onadd={(event) => console.log(event.detail.option)}
   ```

   Triggers when a new option is selected. The newly selected option is provided as `event.detail.option`.

1. ```ts
   oncreate={(event) => console.log(event.detail.option)}
   ```

   Triggers when a user creates a new option (when `allowUserOptions` is enabled). The created option is provided as `event.detail.option`.

1. ```ts
   onremove={(event) => console.log(event.detail.option)}`
   ```

   Triggers when a single selected option is removed. The removed option is provided as `event.detail.option`.

1. ```ts
   onremoveAll={(event) => console.log(event.detail.options)}`
   ```

   Triggers when all selected options are removed. The payload `event.detail.options` gives the options that were removed (might not be all if `minSelect` is set).

1. ```ts
   onchange={(event) => console.log(`${event.detail.type}: '${event.detail.option}'`)}
   ```

   Triggers when an option is either added (selected) or removed from selected, or all selected options are removed at once. `type` is one of `'add' | 'remove' | 'removeAll'` and payload will be `option: Option` or `options: Option[]`, respectively.

1. ```ts
   onopen={(event) => console.log(`Multiselect dropdown was opened by ${event}`)}
   ```

   Triggers when the dropdown list of options appears. Event is the DOM's `FocusEvent`,`KeyboardEvent` or `ClickEvent` that initiated this Svelte `dispatch` event.

1. ```ts
   onclose={(event) => console.log(`Multiselect dropdown was closed by ${event}`)}
   ```

   Triggers when the dropdown list of options disappears. Event is the DOM's `FocusEvent`, `KeyboardEvent` or `ClickEvent` that initiated this Svelte `dispatch` event.

For example, here's how you might annoy your users with an alert every time one or more options are added or removed:

```svelte
<MultiSelect
  onchange={(event) => {
    if (event.detail.type === 'add') alert(`You added ${event.detail.option}`)
    if (event.detail.type === 'remove') alert(`You removed ${event.detail.option}`)
    if (event.detail.type === 'removeAll') alert(`You removed ${event.detail.options}`)
  }}
/>
```

> Note: Depending on the data passed to the component the `options(s)` payload will either be objects or simple strings/numbers.

The above list of events are [Svelte `dispatch` events](https://svelte.dev/tutorial/svelte/component-events). This component also forwards many DOM events from the `<input>` node: `blur`, `change`, `click`, `keydown`, `keyup`, `mousedown`, `mouseenter`, `mouseleave`, `touchcancel`, `touchend`, `touchmove`, `touchstart`. Registering listeners for these events works the same:

```svelte
<MultiSelect
  options={[1, 2, 3]}
  onkeyup={(event) => console.log('key', event.target.value)}
/>
```

## 🦺 &thinsp; TypeScript

The type of `options` is inferred automatically from the data you pass. E.g.

```ts
const options = [
   { label: `foo`, value: 42 }
   { label: `bar`, value: 69 }
]
// type Option = { label: string, value: number }
const options = [`foo`, `bar`]
// type Option = string
const options = [42, 69]
// type Option = number
```

The inferred type of `Option` is used to enforce type-safety on derived props like `selected` as well as snippets. E.g. you'll get an error when trying to use a snippet that expects a string if your options are objects (see [this comment](https://github.com/janosh/svelte-multiselect/pull/189/files#r1058853697) for example screenshots).

You can also import [the types this component uses](https://github.com/janosh/svelte-multiselect/blob/main/src/lib/index.ts) for downstream applications:

```ts
import {
  LoadOptions, // Dynamic option loading callback
  LoadOptionsConfig,
  LoadOptionsFn,
  LoadOptionsParams,
  LoadOptionsResult,
  MultiSelectEvents,
  MultiSelectEvents,
  ObjectOption,
  Option,
} from 'svelte-multiselect'
```

## ✨ &thinsp; Styling

There are 3 ways to style this component. To understand which options do what, it helps to keep in mind this simplified DOM structure of the component:

```svelte
<div class="multiselect">
  <ul class="selected">
    <li>Selected 1</li>
    <li>Selected 2</li>
  </ul>
  <ul class="options">
    <li>Option 1</li>
    <li>Option 2</li>
  </ul>
</div>
```

### With CSS variables

If you only want to make small adjustments, you can pass the following CSS variables directly to the component as props or define them in a `:global()` CSS context. See [`app.css`](https://github.com/janosh/svelte-multiselect/blob/main/src/app.css) for how these variables are set on the demo site of this component.

Minimal example that changes the background color of the options dropdown:

```svelte
<MultiSelect --sms-options-bg="white" />
```

- `div.multiselect`
  - `border: var(--sms-border, 1pt solid lightgray)`: Change this to e.g. to `1px solid red` to indicate this form field is in an invalid state.
  - `border-radius: var(--sms-border-radius, 3pt)`
  - `padding: var(--sms-padding, 0 3pt)`
  - `background: var(--sms-bg)`
  - `color: var(--sms-text-color)`
  - `min-height: var(--sms-min-height, 22pt)`
  - `width: var(--sms-width)`
  - `max-width: var(--sms-max-width)`
  - `margin: var(--sms-margin)`
  - `font-size: var(--sms-font-size, inherit)`
- `div.multiselect.open`
  - `z-index: var(--sms-open-z-index, 4)`: Increase this if needed to ensure the dropdown list is displayed atop all other page elements.
- `div.multiselect:focus-within`
  - `border: var(--sms-focus-border, 1pt solid var(--sms-active-color, cornflowerblue))`: Border when component has focus. Defaults to `--sms-active-color` which in turn defaults to `cornflowerblue`.
- `div.multiselect.disabled`
  - `background: var(--sms-disabled-bg, lightgray)`: Background when in disabled state.
- `div.multiselect input::placeholder`
  - `color: var(--sms-placeholder-color)`
  - `opacity: var(--sms-placeholder-opacity)`
- `div.multiselect > ul.selected > li`
  - `background: var(--sms-selected-bg, rgba(0, 0, 0, 0.15))`: Background of selected options.
  - `padding: var(--sms-selected-li-padding, 1pt 5pt)`: Height of selected options.
  - `color: var(--sms-selected-text-color, var(--sms-text-color))`: Text color for selected options.
- `ul.selected > li button:hover, button.remove-all:hover, button:focus`
  - `color: var(--sms-remove-btn-hover-color, lightskyblue)`: Color of the remove-icon buttons for removing all or individual selected options when in `:focus` or `:hover` state.
  - `background: var(--sms-remove-btn-hover-bg, rgba(0, 0, 0, 0.2))`: Background for hovered remove buttons.
- `div.multiselect > ul.options`
  - `background: var(--sms-options-bg, white)`: Background of dropdown list.
  - `max-height: var(--sms-options-max-height, 50vh)`: Maximum height of options dropdown.
  - `overscroll-behavior: var(--sms-options-overscroll, none)`: Whether scroll events bubble to parent elements when reaching the top/bottom of the options dropdown. See [MDN](https://developer.mozilla.org/docs/Web/CSS/overscroll-behavior).
  - `z-index: var(--sms-options-z-index, 3)`: Z-index for the dropdown options list.
  - `box-shadow: var(--sms-options-shadow, 0 0 14pt -8pt black)`: Box shadow of dropdown list.
  - `border: var(--sms-options-border)`
  - `border-width: var(--sms-options-border-width)`
  - `border-radius: var(--sms-options-border-radius, 1ex)`
  - `padding: var(--sms-options-padding)`
  - `margin: var(--sms-options-margin, inherit)`
- `div.multiselect > ul.options > li`
  - `scroll-margin: var(--sms-options-scroll-margin, 100px)`: Top/bottom margin to keep between dropdown list items and top/bottom screen edge when auto-scrolling list to keep items in view.
- `div.multiselect > ul.options > li.selected`
  - `background: var(--sms-li-selected-bg)`: Background of selected list items in options pane.
  - `color: var(--sms-li-selected-color)`: Text color of selected list items in options pane.
- `div.multiselect > ul.options > li.active`
  - `background: var(--sms-li-active-bg, var(--sms-active-color, rgba(0, 0, 0, 0.15)))`: Background of active options. Options in the dropdown list become active either by mouseover or by navigating to them with arrow keys. Selected options become active when `selectedOptionsDraggable=true` and an option is being dragged to a new position. Note the active option in that case is not the dragged option but the option under it whose place it will take on drag end.
- `div.multiselect > ul.options > li.disabled`
  - `background: var(--sms-li-disabled-bg, #f5f5f6)`: Background of disabled options in the dropdown list.
  - `color: var(--sms-li-disabled-text, #b8b8b8)`: Text color of disabled option in the dropdown list.
- `::highlight(sms-search-matches)`: applies to search results in dropdown list that match the current search query if `highlightMatches=true`. These styles [cannot be set via CSS variables](https://stackoverflow.com/a/56799215). Instead, use a new rule set. For example:

  ```css
  ::highlight(sms-search-matches) {
    color: orange;
    background: rgba(0, 0, 0, 0.15);
    text-decoration: underline;
  }
  ```

### With CSS frameworks

The second method allows you to pass in custom classes to the important DOM elements of this component to target them with frameworks like [Tailwind CSS](https://tailwindcss.com).

- `outerDivClass`: wrapper `div` enclosing the whole component
- `ulSelectedClass`: list of selected options
- `liSelectedClass`: selected list items
- `ulOptionsClass`: available options listed in the dropdown when component is in `open` state
- `liOptionClass`: list items selectable from dropdown list
- `liActiveOptionClass`: the currently active dropdown list item (i.e. hovered or navigated to with arrow keys)
- `liUserMsgClass`: user message (last child of dropdown list when no options match user input)
- `liActiveUserMsgClass`: user message when active (i.e. hovered or navigated to with arrow keys)
- `maxSelectMsgClass`: small span towards the right end of the input field displaying to the user how many of the allowed number of options they've already selected

This simplified version of the DOM structure of the component shows where these classes are inserted:

```svelte
<div class="multiselect {outerDivClass}">
  <input class={inputClass} />
  <ul class="selected {ulSelectedClass}">
    <li class={liSelectedClass}>Selected 1</li>
    <li class={liSelectedClass}>Selected 2</li>
  </ul>
  <span class="maxSelectMsgClass">2/5 selected</span>
  <ul class="options {ulOptionsClass}">
    <li class={liOptionClass}>Option 1</li>
    <li class="{liOptionClass} {liActiveOptionClass}">
      Option 2 (currently active)
    </li>
    ...
    <li class="{liUserMsgClass} {liActiveUserMsgClass}">
      Create this option...
    </li>
  </ul>
</div>
```

### With global CSS

Odd as it may seem, you get the most fine-grained control over the styling of every part of this component by using the following `:global()` CSS selectors. `ul.selected` is the list of currently selected options rendered inside the component's input whereas `ul.options` is the list of available options that slides out when the component is in its `open` state. See also [simplified DOM structure](#--styling).

```css
:global(div.multiselect) {
  /* top-level wrapper div */
}
:global(div.multiselect.open) {
  /* top-level wrapper div when dropdown open */
}
:global(div.multiselect.disabled) {
  /* top-level wrapper div when in disabled state */
}
:global(div.multiselect > ul.selected) {
  /* selected list */
}
:global(div.multiselect > ul.selected > li) {
  /* selected list items */
}
:global(div.multiselect button) {
  /* target all buttons in this component */
}
:global(div.multiselect > ul.selected > li button, button.remove-all) {
  /* buttons to remove a single or all selected options at once */
}
:global(div.multiselect > input[autocomplete]) {
  /* input inside the top-level wrapper div */
}
:global(div.multiselect > ul.options) {
  /* dropdown options */
}
:global(div.multiselect > ul.options > li) {
  /* dropdown list items */
}
:global(div.multiselect > ul.options > li.selected) {
  /* selected options in the dropdown list */
}
:global(div.multiselect > ul.options > li:not(.selected):hover) {
  /* unselected but hovered options in the dropdown list */
}
:global(div.multiselect > ul.options > li.active) {
  /* active means item was navigated to with up/down arrow keys */
  /* ready to be selected by pressing enter */
}
:global(div.multiselect > ul.options > li.disabled) {
  /* options with disabled key set to true (see props above) */
}
```

## 🆕 &thinsp; Changelog

[View the changelog](changelog.md).

## 🙏 &thinsp; Contributing

Here are some steps to [get you started](contributing.md) if you'd like to contribute to this project!
