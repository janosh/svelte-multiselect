<h1 align="center">
  <img src="https://raw.githubusercontent.com/janosh/svelte-multiselect/main/static/favicon.svg" alt="Svelte MultiSelect" height="60" width="60">
  <br class="hide-in-docs">&ensp;Svelte MultiSelect
</h1>

<h4 align="center">

[![Tests](https://github.com/janosh/svelte-multiselect/actions/workflows/test.yml/badge.svg)](https://github.com/janosh/svelte-multiselect/actions/workflows/test.yml)
[![Netlify Status](https://api.netlify.com/api/v1/badges/a45b62c3-ea45-4cfd-9912-77ec4fc8d7e8/deploy-status)](https://app.netlify.com/sites/svelte-multiselect/deploys)
[![NPM version](https://img.shields.io/npm/v/svelte-multiselect?logo=NPM&color=purple)](https://npmjs.com/package/svelte-multiselect)
[![Needs Svelte version](https://img.shields.io/npm/dependency-version/svelte-multiselect/dev/svelte?color=teal)](https://github.com/sveltejs/svelte/blob/master/CHANGELOG.md)
[![REPL](https://img.shields.io/badge/Svelte-REPL-blue)](https://svelte.dev/repl/a5a14b8f15d64cb083b567292480db05)
[![Open in StackBlitz](https://img.shields.io/badge/Open%20in-StackBlitz-darkblue?logo=pytorchlightning)](https://stackblitz.com/github/janosh/svelte-multiselect)

</h4>

**Keyboard-friendly, accessible and highly customizable multi-select component.**
<span class="hide-in-docs">
<a href="https://svelte-multiselect.netlify.app">View the docs</a>
</span>

<slot name="examples" />

## Key features

- **Bindable:** `bind:selected` gives you an array of the currently selected options. Thanks to Svelte's 2-way binding, it can also control the component state externally through assignment `selected = ['foo', 42]`.
- **Keyboard friendly** for mouse-less form completion
- **No run-time deps:** needs only Svelte as dev dependency
- **Dropdowns:** scrollable lists for large numbers of options
- **Searchable:** start typing to filter options
- **Tagging:** selected options are listed as tags within the input
- **Single / multiple select:** pass `maxSelect={1, 2, 3, ...}` prop to restrict the number of selectable options
- **Configurable:** see [props](#props)

<slot name="nav" />

## Recent breaking changes

- v5.0.0 Supports both simple and object options. Previously strings and numbers were converted to `{ value, label }` objects internally and returned by `bind:selected`. Now, if you pass in `string[]`, that's exactly what you'll get from `bind:selected`.
- v6.0.0 The prop `showOptions` which controls whether the list of dropdown options is currently open or closed was renamed to just `open`.

## Installation

```sh
npm install -D svelte-multiselect
pnpm install -D svelte-multiselect
yarn add -D svelte-multiselect
```

## Usage

```svelte
<script>
  import MultiSelect from 'svelte-multiselect'

  const ui_libs = [`Svelte`, `React`, `Vue`, `Angular`, `...`]

  let selected = []
</script>

Favorite Frontend Frameworks?

<code>selected = {JSON.stringify(selected)}</code>

<MultiSelect bind:selected options={ui_libs} />
```

## Props

Full list of props/bindable variables for this component:

<div class="table">

<!-- prettier-ignore -->
| name                   | default                             | description                                                                                                                                                                                                                                                                                                                                                                                                                       |
| :--------------------- | :---------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `options`              | required prop                       | Array of strings/numbers or `Option` objects to be listed in the dropdown. The only required key on objects is `label` which must also be unique. An object's `value` defaults to `label` if `undefined`. You can add arbitrary additional keys to your option objects. MultiSelect  A few keys like `preselected` and `title` have special meaning though. See `src/lib/index.ts` for all special keys and their purpose.        |
| `showOptions`          | `false`                             | Bindable boolean that controls whether the options dropdown is visible.                                                                                                                                                                                                                                                                                                                                                           |
| `searchText`           | ``                                  | Text the user-entered to filter down on the list of options. Binds both ways, i.e. can also be used to set the input text.                                                                                                                                                                                                                                                                                                        |
| `activeOption`         | `null`                              | Currently active option, i.e. the one the user currently hovers or navigated to with arrow keys.                                                                                                                                                                                                                                                                                                                                  |
| `activeIndex`          | `null`                              | Zero-based index of currently active option in the array of currently matching options, i.e. if the user typed a search string into the input and only a subset of options match, this index refers to the array position of the matching subset of options                                                                                                                                                                       |
| `maxSelect`            | `null`                              | Positive integer to limit the number of options users can pick. `null` means no limit.                                                                                                                                                                                                                                                                                                                                            |
| `selected`             | `[]`                                | Array of currently selected options. Can be bound to `bind:selected={[1, 2, 3]}` to control component state externally or passed as prop to set pre-selected options that will already be populated when component mounts before any user interaction.                                                                                                                                                                            |
| `selectedLabels`       | `[]`                                | Labels of currently selected options. Exposed just for convenience, equivalent to `selected.map(op => op.label)` when options are objects. If options are simple strings, `selected === selectedLabels`. Supports binding but is read-only, i.e. since this value is reactive to `selected`, you cannot control `selected` by changing      `bind:selectedLabels`.                                                                |
| `selectedValues`       | `[]`                                | Values of currently selected options. Exposed just for convenience, equivalent to `selected.map(op => op.value)` when options are objects. If options are simple strings, `selected === selectedValues`. Supports binding but is read-only, i.e. since this value is reactive to `selected`, you cannot control `selected` by changing      `bind:selectedValues`.                                                                |
| `matchingOptions`      | `Option[]`                          | List of options currently displayed to the user. Same as `options` unless the user entered `searchText` in which case this array contains only those options for which `filterFunc = (op: Option, searchText: string) => boolean` returned `true` (see [exposed methods](#exposed-methods) below for details on `filterFunc`).                                                                                                    |
| `sortSelected`         | `boolean \| ((op1, op2) => number)` | Default behavior is to render selected items in the order they were chosen. `sortSelected={true}` uses default JS array sorting. A compare function enables custom logic for sorting selected options. See the [`/sort-selected`](https://svelte-multiselect.netlify.app/sort-selected) example.                                                                                                                                  |
| `noOptionsMsg`         | `'No matching options'`             | What message to show if no options match the user-entered search string.                                                                                                                                                                                                                                                                                                                                                          |
| `disabled`             | `false`                             | Disable the component. It will still be rendered but users won't be able to interact with it.                                                                                                                                                                                                                                                                                                                                     |
| `disabledTitle`        | `'This field is disabled'`          | Tooltip text to display on hover when the component is in `disabled` state.                                                                                                                                                                                                                                                                                                                                                       |
| `placeholder`          | `undefined`                         | String shown in the text input when no option is selected.                                                                                                                                                                                                                                                                                                                                                                        |
| `input`                | `null`                              | Handle to the `<input>` DOM node. Only available after component mounts (`null` before then).                                                                                                                                                                                                                                                                                                                                     |
| `outerDiv`             | `null`                              | Handle to outer `<div class="multiselect">` that wraps the whole component. Only available after component mounts (`null` before then).                                                                                                                                                                                                                                                                                           |
| `id`                   | `undefined`                         | Applied to the `<input>` element for associating HTML form `<label>`s with this component for accessibility. Also, clicking a `<label>` with same `for` attribute as `id` will focus this component.                                                                                                                                                                                                                              |
| `name`                 | `id`                                | Applied to the `<input>` element. If not provided, will be set to the value of `id`. Sets the key of this field in a submitted form data object. Not useful at the moment since the value is stored in Svelte state, not on the `<input>`.                                                                                                                                                                                        |
| `required`             | `false`                             | Whether forms can be submitted without selecting any options. Aborts submission, is scrolled into view and shows help "Please fill out" message when true and user tries to submit with no options selected.                                                                                                                                                                                                                      |
| `autoScroll`           | `true`                              | `false` disables keeping the active dropdown items in view when going up/down the list of options with arrow keys.                                                                                                                                                                                                                                                                                                                |
| `allowUserOptions`     | `false`                             | Whether users are allowed to enter values not in the dropdown list. `true` means add user-defined options to the selected list only, `'append'` means add to both options and selected.                                                                                                                                                                                                                                           |
| `parseLabelsAsHtml`    | `false`                             | Whether option labels should be passed to [Svelte's `@html` directive](https://svelte.dev/tutorial/html-tags) or inserted into the DOM as plain text. `true` will raise an error if `allowUserOptions` is also truthy as it makes your site susceptible to [cross-site scripting (XSS) attacks](https://wikipedia.org/wiki/Cross-site_scripting).                                                                                 |
| `addOptionMsg`         | `'Create this option...'`           | Message shown to users after entering text when no options match their query and `allowUserOptions` is truthy.                                                                                                                                                                                                                                                                                                                    |
| `loading`              | `false`                             | Whether the component should display a spinner to indicate it's in loading state. Use `<slot name='spinner'>` to specify a custom spinner.                                                                                                                                                                                                                                                                                        |
| `removeBtnTitle`       | `'Remove'`                          | Title text to display when user hovers over button to remove selected option (which defaults to a cross icon).                                                                                                                                                                                                                                                                                                                    |
| `removeAllTitle`       | `'Remove all'`                      | Title text to display when user hovers over remove-all button.                                                                                                                                                                                                                                                                                                                                                                    |
| `defaultDisabledTitle` | `'This option is disabled'`         | Title text to display when user hovers over a disabled option. Each option can override this through its `disabledTitle` attribute.                                                                                                                                                                                                                                                                                               |
| `autocomplete`         | `'off'`                             | Applied to the `<input>`. Specifies if browser is permitted to auto-fill this form field. See [MDN docs](https://developer.mozilla.org/docs/Web/HTML/Attributes/autocomplete) for other admissible values.                                                                                                                                                                                                                        |
| `invalid`              | `false`                             | If `required=true` and user tries to submit but `selected = []` is empty, `invalid` is automatically set to `true` and CSS class `invalid` applied to the top-level `div.multiselect`. `invalid` class is removed again as soon as the user selects an option. `invalid` can also be controlled externally by binding to it `<MultiSelect bind:invalid />` and setting it to `true` based on outside events or custom validation. |
| `focusInputOnSelect`   | `'desktop'`                         | Whether to set the cursor back to the input element after selecting an element. Defaults to desktop, meaning only do if current window width is larger than `breakpoint` (next prop).                                                                                                                                                                                                                                             |
| `breakpoint`           | `800`                               | Screens wider than `breakpoint` in pixels will be considered `'desktop'`, everything narrower as `'mobile'`.                                                                                                                                                                                                                                                                                                                      |

</div>

## Exposed methods

1. `filterFunc = (op: Option, searchText: string) => boolean`: Customize how dropdown options are filtered when user enters search string into `<MultiSelect />`. Defaults to:

   ```ts
   import type { Option } from 'svelte-multiselect'

   filterFunc = (op: Option, searchText: string) => {
     if (!searchText) return true
     return `${op.label}`.toLowerCase().includes(searchText.toLowerCase())
   }
   ```

2. `maxSelectMsg = (current: number, max: number) => string`: Inform users how many of the maximum allowed options they have already selected. Set `maxSelectMsg={null}` to not show a message. Defaults to `null` when `maxSelect={1}` or `maxSelect={null}`. Else if `maxSelect > 1`, defaults to:

   ```ts
   maxSelectMsg = (current: number, max: number) => `${current}/${max}`
   ```

## Slots

`MultiSelect.svelte` has 3 named slots:

- `slot="option"`: Customize rendering of dropdown options. Receives as props an `option` and the zero-indexed position (`idx`) it has in the dropdown.
- `slot="selected"`: Customize rendering of selected items. Receives as props an `option` and the zero-indexed position (`idx`) it has in the list of selected items.
- `slot="spinner"`: Custom spinner component to display when in `loading` state. Receives no props.
- `slot="disabled-icon"`: Custom icon to display inside the input when in `disabled` state. Receives no props. Use an empty `<span slot="disabled-icon" />` or `div` to remove the default disabled icon.
- `slot="remove-icon"`: Custom icon to display as remove button. Will be used both by buttons to remove individual selected options and the 'remove all' button that clears all options at once. Receives no props.

Example:

```svelte
<MultiSelect options={[`Red`, `Green`, `Blue`, `Yellow`, `Purple`]}>
  <span let:idx let:option slot="option">
    {idx + 1}
    {option.label}
    <span style:background={option.label} style=" width: 1em; height: 1em;" />
  </span>

  <span let:idx let:option slot="selected">
    {idx + 1}
    {option.label}
    <span style:background={option.label} style=" width: 1em; height: 1em;" />
  </span>

  <CustomSpinner slot="spinner">
  <strong slot="remove-icon">X</strong>
</MultiSelect>
```

## Events

`MultiSelect.svelte` dispatches the following events:

| name        | detail                                   | description                                                                                                                                             |
| ----------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `add`       | `{ option: Option }`                     | Triggers when a new option is selected.                                                                                                                 |
| `remove`    | `{ option: Option }`                     | Triggers when one selected option provided as `event.detail.option` is removed.                                                                         |
| `removeAll` | `options: Option[]`                      | Triggers when all selected options are removed. The payload `event.detail.options` gives the options that were previously selected.                     |
| `change`    | `type: 'add' \| 'remove' \| 'removeAll'` | Triggers when a option is either added or removed, or all options are removed at once. Payload will be a single or an array of `Option`s, respectively. |
| `blur`      | none                                     | Triggers when the input field looses focus.                                                                                                             |

Depending on the data passed to the component the `options(s)` payload will either be objects or simple strings/numbers.

### Examples

<!-- prettier-ignore -->
- `on:add={(event) => console.log(event.detail.option)}`
- `on:remove={(event) => console.log(event.detail.option)}`.
- ``on:change={(event) => console.log(`${event.detail.type}: '${event.detail.option}'`)}``
- `on:blur={myFunction}`

```svelte
<MultiSelect
  on:change={(e) => alert(`You ${e.detail.type}ed '${e.detail.option}'`)}
/>
```

## TypeScript

TypeScript users can import the types used for internal type safety:

```svelte
<script lang="ts">
  import MultiSelect, {
    Option,
    Primitive,
    ProtoOption,
  } from 'svelte-multiselect'

  const myOptions: Option[] = [
    { label: 'foo', value: 42 },
    { label: 'bar', value: 69 },
  ]
</script>
```

## Styling

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

If you only want to make small adjustments, you can pass the following CSS variables directly to the component as props or define them in a `:global()` CSS context.

- `div.multiselect`
  - `border: var(--sms-border, 1pt solid lightgray)`: Change this to e.g. to `1px solid red` to indicate this form field is in an invalid state.
  - `border-radius: var(--sms-border-radius, 3pt)`
  - `padding: var(--sms-padding, 0 3pt)`
  - `background: var(--sms-bg)`
  - `color: var(--sms-text-color)`
  - `min-height: var(--sms-min-height)`
  - `max-width: var(--sms-max-width)`
- `div.multiselect.open`
  - `z-index: var(--sms-open-z-index, 4)`: Increase this if needed to ensure the dropdown list is displayed atop all other page elements.
- `div.multiselect:focus-within`
  - `border: var(--sms-focus-border, 1pt solid var(--sms-active-color, cornflowerblue))`: Border when component has focus. Defaults to `--sms-active-color` if not set which defaults to `cornflowerblue`.
- `div.multiselect.disabled`
  - `background: var(--sms-disabled-bg, lightgray)`: Background when in disabled state.
- `div.multiselect input::placeholder`
  - `color: var(--sms-placeholder-color)`
  - `color: var(--sms-placeholder-opacity)`
- `div.multiselect > ul.selected > li`
  - `background: var(--sms-selected-bg, rgba(0, 0, 0, 0.15))`: Background of selected options.
  - `padding: var(--sms-selected-li-padding, 5pt 1pt)`: Height of selected options.
  - `color: var(--sms-selected-text-color, var(--sms-text-color))`: Text color for selected options.
- `ul.selected > li button:hover, button.remove-all:hover, button:focus`
  - `color: var(--sms-button-hover-color, lightskyblue)`: Color of the remove-icon buttons for removing all or individual selected options when in `:focus` or `:hover` state.
- `div.multiselect > ul.options`
  - `background: var(--sms-options-bg, white)`: Background of dropdown list.
  - `max-height: var(--sms-options-max-height, 50vh)`: Maximum height of options dropdown.
  - `overscroll-behavior: var(--sms-options-overscroll, none)`: Whether scroll events bubble to parent elements when reaching the top/bottom of the options dropdown. See [MDN](https://developer.mozilla.org/docs/Web/CSS/overscroll-behavior).
  - `box-shadow: var(--sms-options-shadow, 0 0 14pt -8pt black);`: Box shadow of dropdown list.
- `div.multiselect > ul.options > li`
  - `scroll-margin: var(--sms-options-scroll-margin, 100px)`: Top/bottom margin to keep between dropdown list items and top/bottom screen edge when auto-scrolling list to keep items in view.
- `div.multiselect > ul.options > li.selected`
  - `background: var(--sms-li-selected-bg)`: Background of selected list items in options pane.
  - `color: var(--sms-li-selected-color)`: Text color of selected list items in options pane.
- `div.multiselect > ul.options > li.active`
  - `background: var(--sms-li-active-bg, var(--sms-active-color, rgba(0, 0, 0, 0.15)))`: Background of active dropdown item. Items become active either by mouseover or by navigating to them with arrow keys.
- `div.multiselect > ul.options > li.disabled`
  - `background: var(--sms-li-disabled-bg, #f5f5f6)`: Background of disabled options in the dropdown list.
  - `color: var(--sms-li-disabled-text, #b8b8b8)`: Text color of disabled option in the dropdown list.

For example, to change the background color of the options dropdown:

```svelte
<MultiSelect --sms-options-bg="white" />
```

### With CSS frameworks

The second method allows you to pass in custom classes to the important DOM elements of this component to target them with frameworks like [Tailwind CSS](https://tailwindcss.com).

- `outerDivClass`
- `ulSelectedClass`
- `liSelectedClass`
- `ulOptionsClass`
- `liOptionClass`
- `liActiveOptionClass`

This simplified version of the DOM structure of the component shows where these classes are inserted:

```svelte
<div class="multiselect {outerDivClass}">
  <input class={inputClass} />
  <ul class="selected {ulSelectedClass}">
    <li class={liSelectedClass}>Selected 1</li>
    <li class={liSelectedClass}>Selected 2</li>
  </ul>
  <ul class="options {ulOptionsClass}">
    <li class={liOptionClass}>Option 1</li>
    <li class="{liOptionClass} {liActiveOptionClass}">
      Option 2 (currently active)
    </li>
  </ul>
</div>
```

### Granular control through global CSS

You can alternatively style every part of this component with more fine-grained control by using the following `:global()` CSS selectors. `ul.selected` is the list of currently selected options rendered inside the component's input whereas `ul.options` is the list of available options that slides out when the component has focus.

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
:global(div.multiselect > ul.selected > li > input) {
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

## Downstream testing

To test a Svelte component which imports `svelte-multiselect`, you need to configure your test runner to avoid [transpiling issues](https://github.com/janosh/svelte-multiselect/issues/48).

For Jest, exclude `svelte-multiselect` from `transformIgnorePatterns` in your `jest.config.json`:

```json
{
  "transformIgnorePatterns": ["node_modules/?!(svelte-multiselect)"],
  "transform": {
    "^.+\\.[t|j]s?$": "esbuild-jest",
    "^.+\\.svelte$": ["svelte-jester", { "preprocess": true }]
  }
}
```

For Vitest, include `svelte-multiselect` in `deps.inline`:

```ts
// vite.config.ts
import { svelte } from '@sveltejs/vite-plugin-svelte'

export default {
  plugins: [svelte({ hot: !process.env.VITEST })],
  test: {
    deps: {
      inline: [/svelte-multiselect/],
    },
  },
}
```

Here's a [Stackblitz example](https://stackblitz.com/fork/github/davipon/test-svelte-multiselect?initialPath=__vitest__) that also uses [`vitest-svelte-kit`](https://github.com/nickbreaton/vitest-svelte-kit).

## Want to contribute?

To submit a PR, clone the repo, install dependencies and start the dev server to try out your changes.

```sh
git clone https://github.com/janosh/svelte-multiselect
cd svelte-multiselect
npm install
npm run dev
```
