<h1 align="center">
  <img src="https://raw.githubusercontent.com/janosh/svelte-toc/main/static/favicon.svg" alt="Svelte MultiSelect" height=60>
  <br>&ensp;Svelte MultiSelect
</h1>

<h4 align="center">

[![Tests](https://github.com/janosh/svelte-multiselect/actions/workflows/test.yml/badge.svg)](https://github.com/janosh/svelte-multiselect/actions/workflows/test.yml)
[![Netlify Status](https://api.netlify.com/api/v1/badges/a45b62c3-ea45-4cfd-9912-77ec4fc8d7e8/deploy-status)](https://app.netlify.com/sites/svelte-multiselect/deploys)
[![NPM version](https://img.shields.io/npm/v/svelte-multiselect?color=blue&logo=NPM)](https://npmjs.com/package/svelte-multiselect)
[![pre-commit.ci status](https://results.pre-commit.ci/badge/github/janosh/svelte-multiselect/main.svg)](https://results.pre-commit.ci/latest/github/janosh/svelte-multiselect/main)
![Needs Svelte version](https://img.shields.io/npm/dependency-version/svelte-multiselect/dev/svelte)

</h4>

<div class="hide-in-docs">

**[Live demo](https://svelte-multiselect.netlify.app)**.

</div>

**Keyboard-friendly, zero-dependency multi-select Svelte component.**

<slot />

## Key features

- **Single / multiple select:** pass `maxSelect={1}` prop to only allow one selection
- **Dropdowns:** scrollable lists for large numbers of options
- **Searchable:** start typing to filter options
- **Tagging:** selected options are recorded as tags in the input
- **Server-side rendering:** no reliance on browser objects like `window` or `document`
- **Configurable:** see [props](#props)
- **No dependencies:** needs only Svelte as dev dependency
- **Keyboard friendly** for mouse-less form completion

## Recent breaking changes

- v3.0.0 changed the `event.detail` payload for `'add'`, `'remove'` and `'change'` events from `token` to `option`, e.g.

  ```js
  on:add={(e) => console.log(e.detail.token.label)} // v2
  on:add={(e) => console.log(e.detail.option.label)} // v3
  ```

  It also added a separate event type `removeAll` for when the user removes all currently selected options at once which previously fired a normal `remove`. The props `ulTokensClass` and `liTokenClass` were renamed to `ulSelectedClass` and `liSelectedClass`. Similarly, the CSS variable `--sms-token-bg` changed to `--sms-selected-bg`.

- v4.0.0 renamed the slots for customizing how selected options and dropdown list items are rendered:

  - old: `<slot name="renderOptions" />`, new: `<slot name="option" />`
  - old: `<slot name="renderSelected" />`, new: `<slot name="selected" />`

- v4.0.1 renamed the `readonly` prop to `disabled` which now prevents all form or user interaction with this component including opening the dropdown list which was still possible before. See [#45](https://github.com/janosh/svelte-multiselect/issues/45) for details. The associated CSS class applied to the outer `div` was likewise renamed to `div.multiselect.{readonly=>disabled}`.

## Installation

```sh
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
| name                   | default                     | description                                                                                                                                                                                                                                                                                                                                                                                                                       |
| :--------------------- | :-------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `options`              | required prop               | Array of strings/numbers or `Option` objects that will be listed in the dropdown. See `src/lib/index.ts` for admissible fields. The `label` is the only mandatory one. It must also be unique.                                                                                                                                                                                                                                    |
| `showOptions`          | `false`                     | Bindable boolean that controls whether the options dropdown is visible.                                                                                                                                                                                                                                                                                                                                                           |
| `searchText`           | ``                          | Text the user-entered to filter down on the list of options. Binds both ways, i.e. can also be used to set the input text.                                                                                                                                                                                                                                                                                                        |
| `activeOption`         | `null`                      | Currently active option, i.e. the one the user currently hovers or navigated to with arrow keys.                                                                                                                                                                                                                                                                                                                                  |
| `maxSelect`            | `null`                      | Positive integer to limit the number of options users can pick. `null` means no limit.                                                                                                                                                                                                                                                                                                                                            |
| `selected`             | `[]`                        | Array of currently/pre-selected options when binding/passing as props respectively.                                                                                                                                                                                                                                                                                                                                               |
| `selectedLabels`       | `[]`                        | Labels of currently selected options.                                                                                                                                                                                                                                                                                                                                                                                             |
| `selectedValues`       | `[]`                        | Values of currently selected options.                                                                                                                                                                                                                                                                                                                                                                                             |
| `noOptionsMsg`         | `'No matching options'`     | What message to show if no options match the user-entered search string.                                                                                                                                                                                                                                                                                                                                                          |
| `disabled`             | `false`                     | Disable the component. It will still be rendered but users won't be able to interact with it.                                                                                                                                                                                                                                                                                                                                     |
| `disabledTitle`        | `This field is disabled`    | Tooltip text to display on hover when the component is in `disabled` state.                                                                                                                                                                                                                                                                                                                                                       |
| `placeholder`          | `undefined`                 | String shown in the text input when no option is selected.                                                                                                                                                                                                                                                                                                                                                                        |
| `input`                | `undefined`                 | Handle to the `<input>` DOM node.                                                                                                                                                                                                                                                                                                                                                                                                 |
| `id`                   | `undefined`                 | Applied to the `<input>` element for associating HTML form `<label>`s with this component for accessibility. Also, clicking a `<label>` with same `for` attribute as `id` will focus this component.                                                                                                                                                                                                                              |
| `name`                 | `id`                        | Applied to the `<input>` element. If not provided, will be set to the value of `id`. Sets the key of this field in a submitted form data object. Not useful at the moment since the value is stored in Svelte state, not on the `<input>`.                                                                                                                                                                                        |
| `required`             | `false`                     | Whether forms can be submitted without selecting any options. Aborts submission, is scrolled into view and shows help "Please fill out" message when true and user tries to submit with no options selected.                                                                                                                                                                                                                      |
| `autoScroll`           | `true`                      | `false` disables keeping the active dropdown items in view when going up/down the list of options with arrow keys.                                                                                                                                                                                                                                                                                                                |
| `allowUserOptions`     | `false`                     | Whether users are allowed to enter values not in the dropdown list. `true` means add user-defined options to the selected list only, `'append'` means add to both options and selected.                                                                                                                                                                                                                                           |
| `loading`              | `false`                     | Whether the component should display a spinner to indicate it's in loading state. Use `<slot name='spinner'>` to specify a custom spinner.                                                                                                                                                                                                                                                                                        |
| `removeBtnTitle`       | `'Remove'`                  | Title text to display when user hovers over button (cross icon) to remove selected option.                                                                                                                                                                                                                                                                                                                                        |
| `removeAllTitle`       | `'Remove all'`              | Title text to display when user hovers over remove-all button.                                                                                                                                                                                                                                                                                                                                                                    |
| `defaultDisabledTitle` | `'This option is disabled'` | Title text to display when user hovers over a disabled option. Each option can override this through its `disabledTitle` attribute.                                                                                                                                                                                                                                                                                               |
| `autocomplete`         | `'off'`                     | Applied to the `<input>`. Specifies if browser is permitted to auto-fill this form field. See [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/autocomplete) for other admissible values.                                                                                                                                                                                                                  |
| `invalid`              | `false`                     | If `required=true` and user tries to submit but `selected = []` is empty, `invalid` is automatically set to `true` and CSS class `invalid` applied to the top-level `div.multiselect`. `invalid` class is removed again as soon as the user selects an option. `invalid` can also be controlled externally by binding to it `<MultiSelect bind:invalid />` and setting it to `true` based on outside events or custom validation. |

</div>

## Exposed methods

1. `filterFunc = (op: Option, searchText: string) => boolean`: Determine what options are shown when user enters search string to filter dropdown list. Defaults to:

   ```ts
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

- `slot="option"`: Customize rendering of dropdown options. Receives as props the `option` object and the zero-indexed position (`idx`) it has in the dropdown.
- `slot="selected"`: Customize rendering selected tags. Receives as props the `option` object and the zero-indexed position (`idx`) it has in the list of selected items.
- `slot="spinner"`: Custom spinner component to display when in `loading` state. Receives no props.
- `slot="disabled-icon"`: Custom icon to display inside the input when in `disabled` state. Receives no props. Use an empty `<span slot="disabled-icon" />` or `div` to remove the default disabled icon.

Example:

```svelte
<MultiSelect options={[`Banana`, `Apple`, `Mango`]}>
  <span let:idx let:option slot="option">
    {idx + 1}. {option.label}
    {option.label === `Mango` ? `🎉` : ``}
  </span>

  <span let:idx let:option slot="selected">
    #{idx + 1}
    {option.label}
  </span>

  <CustomSpinner slot="spinner">
</MultiSelect>
```

## Events

`MultiSelect.svelte` dispatches the following events:

| name        | detail                                                                              | description                                                                                                                         |
| ----------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `add`       | `{ option: Option }`                                                                | Triggers when a new option is selected.                                                                                             |
| `remove`    | `{ option: Option }`                                                                | Triggers when one selected option provided as `event.detail.option` is removed.                                                     |
| `removeAll` | `options: Option[]`                                                                 | Triggers when all selected options are removed. The payload `event.detail.options` gives the options that were previously selected. |
| `change`    | `{ option?: Option, options?: Option[] }`, `type: 'add' \| 'remove' \| 'removeAll'` | Triggers when a option is either added or removed, or all options are removed at once.                                              |
| `blur`      | none                                                                                | Triggers when the input field looses focus.                                                                                         |

### Examples

<!-- prettier-ignore -->
- `on:add={(event) => console.log(event.detail.option.label)}`
- `on:remove={(event) => console.log(event.detail.option.label)}`.
- ``on:change={(event) => console.log(`${event.detail.type}: '${event.detail.option.label}'`)}``
- `on:blur={yourFunctionHere}`

```svelte
<MultiSelect
  on:change={(e) => alert(`You ${e.detail.type}ed '${e.detail.option.label}'`)}
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
  - `background: var(--sms-input-bg)`
  - `height: var(--sms-input-height, 2em)`
  - `color: var(--sms-text-color)`
- `div.multiselect.open`
  - `z-index: var(--sms-open-z-index, 4)`: Increase this if needed to ensure the dropdown list is displayed atop all other page elements.
- `div.multiselect:focus-within`
  - `border: var(--sms-focus-border, 1pt solid var(--sms-active-color, cornflowerblue))`: Border when component has focus. Defaults to `--sms-active-color` if not set which defaults to `cornflowerblue`.
- `div.multiselect.disabled`
  - `background: var(--sms-disabled-bg, lightgray)`: Background when in disabled state.
- `div.multiselect > ul.selected > li`
  - `background: var(--sms-selected-bg, rgba(0, 0, 0, 0.15))`: Background of selected options.
  - `height: var(--sms-selected-li-height)`: Height of selected options.
  - `color: var(--sms-selected-text-color, var(--sms-text-color))`: Text color for selected options.
- `ul.selected > li button:hover, button.remove-all:hover, button:focus`
  - `color: var(--sms-remove-x-hover-focus-color, lightskyblue)`: Color of the cross-icon buttons for removing all or individual selected options when in `:focus` or `:hover` state.
- `div.multiselect > ul.options`
  - `background: var(--sms-options-bg, white)`: Background of dropdown list.
  - `max-height: var(--sms-options-max-height, 50vh)`: Maximum height of options dropdown.
  - `overscroll-behavior: var(--sms-options-overscroll, none)`: Whether scroll events bubble to parent elements when reaching the top/bottom of the options dropdown. See [MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/overscroll-behavior).
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

This simplified version of the DOM structure of this component shows where these classes are inserted:

```svelte
<div class="multiselect {outerDivClass}">
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

To test a Svelte component which imports `svelte-multiselect`, you need to configure your test runner to avoid [transpiling issues](https://github.com/EmilTholin/svelte-routing/issues/140#issuecomment-661682571).

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

Here's a [Stackblitz example](https://stackblitz.com/fork/github/davipon/test-svelte-multiselect?initialPath=__vitest__) that also uses [`'vitest-svelte-kit'`](https://github.com/nickbreaton/vitest-svelte-kit).

## Want to contribute?

To submit a PR, clone the repo, install dependencies and start the dev server to try out your changes.

```sh
git clone https://github.com/janosh/svelte-multiselect
cd svelte-multiselect
yarn
yarn dev
```
