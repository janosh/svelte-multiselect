<h1 align="center">
  <img src="https://raw.githubusercontent.com/janosh/svelte-multiselect/main/static/favicon.svg" alt="Svelte MultiSelect" height="60" width="60">
  <br class="hide-in-docs">&ensp;Svelte MultiSelect
</h1>

<h4 align="center">

[![Tests](https://github.com/janosh/svelte-multiselect/actions/workflows/test.yml/badge.svg)](https://github.com/janosh/svelte-multiselect/actions/workflows/test.yml)
[![GitHub Pages](https://github.com/janosh/svelte-multiselect/actions/workflows/gh-pages.yml/badge.svg)](https://github.com/janosh/svelte-multiselect/actions/workflows/gh-pages.yml)
[![NPM version](https://img.shields.io/npm/v/svelte-multiselect?logo=NPM&color=purple)](https://npmjs.com/package/svelte-multiselect)
[![Needs Svelte version](https://img.shields.io/npm/dependency-version/svelte-multiselect/svelte?color=teal&logo=Svelte&label=Svelte)](https://github.com/sveltejs/svelte/blob/master/packages/svelte/CHANGELOG.md)
[![REPL](https://img.shields.io/badge/Svelte-REPL-blue?label=Try%20it!)](https://svelte.dev/repl/a5a14b8f15d64cb083b567292480db05)
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

<slot name="nav" />

## 🧪 &thinsp; Coverage

| Statements                                                                                 | Branches                                                                       | Lines                                                                            |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| ![Statements](https://img.shields.io/badge/statements-97.94%25-brightgreen.svg?style=flat) | ![Branches](https://img.shields.io/badge/branches-79.39%25-red.svg?style=flat) | ![Lines](https://img.shields.io/badge/lines-97.94%25-brightgreen.svg?style=flat) |

## 📜 &thinsp; Breaking changes

- **8.0.0** (2022-10-22)&nbsp;
  - Props `selectedLabels` and `selectedValues` were removed. If you were using them, they were equivalent to assigning `bind:selected` to a local variable and then running `selectedLabels = selected.map(option => option.label)` and `selectedValues = selected.map(option => option.value)` if your options were objects with `label` and `value` keys. If they were simple strings/numbers, there was no point in using `selected{Labels,Values}` anyway. [PR 138](https://github.com/janosh/svelte-multiselect/pull/138)
  - Prop `noOptionsMsg` was renamed to `noMatchingOptionsMsg`. [PR 133](https://github.com/janosh/svelte-multiselect/pull/133).
- **v8.3.0** (2023-01-25)&nbsp; `addOptionMsg` was renamed to `createOptionMsg` (no major since version since it's rarely used) [sha](https://github.com/janosh/svelte-multiselect/commits).
- **v9.0.0** (2023-06-01)&nbsp; Svelte bumped from v3 to v4. Also, not breaking but noteworthy: MultiSelect received a default slot that functions as both `"option"` and `"selected"`. If you previously had two identical slots for `"option"` and `"selected"`, you can now remove the `name` from one of them and drop the other:

  ```diff
  <MultiSelect
    {options}
  + let:option
  >
  - <SlotComponent let:option {option} slot="selected" />
  - <SlotComponent let:option {option} slot="option" />
  + <SlotComponent {option} />
  </MultiSelect>
  ```

- **v10.0.0** (2023-06-23)&nbsp; `duplicateFunc()` renamed to `key` in [#238](https://github.com/janosh/svelte-multiselect/pull/238). Signature changed:

  ```diff
  - duplicateFunc: (op1: T, op2: T) => boolean = (op1, op2) => `${get_label(op1)}`.toLowerCase() === `${get_label(op2)}`.toLowerCase()
  + key: (opt: T) => unknown = (opt) => `${get_label(opt)}`.toLowerCase()
  ```

  Rather than implementing custom equality in `duplicateFunc`, the `key` function is now expected to map options to a unique identifier. `key(op1) === key(op2)` should mean `op1` and `op2` are the same option. `key` can return any type but usually best to return primitives (`string`, `number`, ...) for Svelte keyed each blocks (see [#217](https://github.com/janosh/svelte-multiselect/pull/217)).

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

  let selected = []
</script>

Favorite Frontend Tools?

<code>selected = {JSON.stringify(selected)}</code>

<MultiSelect bind:selected options={ui_libs} />
```

## 🔣 &thinsp; Props

Full list of props/bindable variables for this component. The `Option` type you see below is defined in [`src/lib/index.ts`](https://github.com/janosh/svelte-multiselect/blob/main/src/lib/index.ts) and can be imported as `import { type Option } from 'svelte-multiselect'`.

1. ```ts
   activeIndex: number | null = null
   ```

   Zero-based index of currently active option in the array of currently matching options, i.e. if the user typed a search string into the input and only a subset of options match, this index refers to the array position of the matching subset of options

1. ```ts
   activeOption: Option | null = null
   ```

   Currently active option, i.e. the one the user currently hovers or navigated to with arrow keys.

1. ```ts
   createOptionMsg: string | null = `Create this option...`
   ```

   The message shown to users when `allowUserOptions` is truthy and they entered text that doesn't match any existing options to suggest creating a new option from the entered text. Emits `console.error` if `allowUserOptions` is `true` or `'append'` and `createOptionMsg=''` to since users might be unaware they can create new option. The error can be silenced by setting `createOptionMsg=null` indicating developer intent is to e.g. use MultiSelect as a tagging component where a user message might be unwanted.

1. ```ts
   allowEmpty: boolean = false
   ```

   Whether to `console.error` if dropdown list of options is empty. `allowEmpty={false}` will suppress errors. `allowEmpty={true}` will report a console error if component is not `disabled`, not in `loading` state and doesn't `allowUserOptions`.

1. ```ts
   allowUserOptions: boolean | 'append' = false
   ```

   Whether users can enter values that are not in the dropdown list. `true` means add user-defined options to the selected list only, `'append'` means add to both options and selected.
   If `allowUserOptions` is `true` or `'append'` then the type `object | number | string` of entered value is determined by `typeof options[0]` (i.e. the first option in the dropdown list) to keep type homogeneity.

1. ```ts
   autocomplete: string = `off`
   ```

   Applied to the `<input>`. Specifies if browser is permitted to auto-fill this form field. Should usually be one of `'on'` or `'off'` but see [MDN docs](https://developer.mozilla.org/docs/Web/HTML/Attributes/autocomplete) for other admissible values.

1. ```ts
   autoScroll: boolean = true
   ```

   `false` disables keeping the active dropdown items in view when going up/down the list of options with arrow keys.

1. ```ts
   breakpoint: number = 800
   ```

   Screens wider than `breakpoint` in pixels will be considered `'desktop'`, everything narrower as `'mobile'`.

1. ```ts
   defaultDisabledTitle: string = `This option is disabled`
   ```

   Title text to display when user hovers over a disabled option. Each option can override this through its `disabledTitle` attribute.

1. ```ts
   disabled: boolean = false
   ```

   Disable the component. It will still be rendered but users won't be able to interact with it.

1. ```ts
   disabledInputTitle: string = `This input is disabled`
   ```

   Tooltip text to display on hover when the component is in `disabled` state.

1. ```ts
   duplicates: boolean = false
   ```

   Whether to allow users to select duplicate options. Applies only to the selected item list, not the options dropdown. Keeping that free of duplicates is left to developer. The selected item list can have duplicates if `allowUserOptions` is truthy, `duplicates` is `true` and users create the same option multiple times. Use `duplicateOptionMsg` to customize the message shown to user if `duplicates` is `false` and users attempt this and `key` to customize when a pair of options is considered equal.

1. ```ts
   duplicateOptionMsg: string = `This option is already selected`
   ```

   Text to display to users when `allowUserOptions` is truthy and they try to create a new option that's already selected.

<!-- prettier-ignore -->
1. ```ts
   key: (opt: T) => unknown = (opt) => `${get_label(opt)}`.toLowerCase()
   ```

   A function that maps options to a value by which equality of options is determined. Defaults to mapping options to their lower-cased label. E.g. by default ``const opt1 = { label: `foo`, id: 1 }`` and ``const opt2 = { label: `foo`, id: 2 }`` are considered equal. If you want to consider them different, you can set `key` to e.g. `key={(opt) => opt.id}` or ``key={(opt) => `${opt.label}-${opt.id}}`` or even `key={JSON.stringify}`.

1. ```ts
   filterFunc = (opt: Option, searchText: string): boolean => {
     if (!searchText) return true
     return `${get_label(opt)}`.toLowerCase().includes(searchText.toLowerCase())
   }
   ```

   Customize how dropdown options are filtered when user enters search string into `<MultiSelect />`. Defaults to:

1. ```ts
   focusInputOnSelect: boolean | 'desktop' = `desktop`
   ```

   One of `true`, `false` or `'desktop'`. Whether to set the cursor back to the input element after selecting an element. 'desktop' means only do so if current window width is larger than the current value of `breakpoint` prop (default 800).

1. ```ts
   form_input: HTMLInputElement | null = null
   ```

   Handle to the `<input>` DOM node that's responsible for form validity checks and passing selected options to form submission handlers. Only available after component mounts (`null` before then).

1. ```ts
   highlightMatches: boolean = true
   ```

   Whether to highlight text in the dropdown options that matches the current user-entered search query. Uses the [CSS Custom Highlight API](https://developer.mozilla.org/docs/Web/API/CSS_Custom_Highlight_API) with [limited browser support](https://caniuse.com/mdn-api_css_highlights) (70% as of May 2023) and [styling options](https://developer.mozilla.org/docs/Web/CSS/::highlight). See `::highlight(sms-search-matches)` below for available CSS variables.

1. ```ts
   id: string | null = null
   ```

   Applied to the `<input>` element for associating HTML form `<label>`s with this component for accessibility. Also, clicking a `<label>` with same `for` attribute as `id` will focus this component.

1. ```ts
   input: HTMLInputElement | null = null
   ```

   Handle to the `<input>` DOM node. Only available after component mounts (`null` before then).

1. ```ts
   inputmode: string | null = null
   ```

   The `inputmode` attribute hints at the type of data the user may enter. Values like `'numeric' | 'tel' | 'email'` allow mobile browsers to display an appropriate virtual on-screen keyboard. See [MDN](https://developer.mozilla.org/docs/Web/HTML/Global_attributes/inputmode) for details. If you want to suppress the on-screen keyboard to leave full-screen real estate for the dropdown list of options, set `inputmode="none"`.

1. ```ts
   invalid: boolean = false
   ```

   If `required = true, 1, 2, ...` and user tries to submit form but `selected = []` is empty/`selected.length < required`, `invalid` is automatically set to `true` and CSS class `invalid` applied to the top-level `div.multiselect`. `invalid` class is removed as soon as any change to `selected` is registered. `invalid` can also be controlled externally by binding to it `<MultiSelect bind:invalid />` and setting it to `true` based on outside events or custom validation.

1. ```ts
   loading: boolean = false
   ```

   Whether the component should display a spinner to indicate it's in loading state. Use `<slot name='spinner'>` to specify a custom spinner.

1. ```ts
   matchingOptions: Option[] = []
   ```

   List of options currently displayed to the user. Same as `options` unless the user entered `searchText` in which case this array contains only those options for which `filterFunc = (op: Option, searchText: string) => boolean` returned `true`.

1. ```ts
   maxOptions: number | undefined = undefined
   ```

   Positive integer to limit the number of options displayed in the dropdown. `undefined` and 0 mean no limit.

1. ```ts
   maxSelect: number | null = null
   ```

   Positive integer to limit the number of options users can pick. `null` means no limit. `maxSelect={1}` will change the type of `selected` to be a single `Option` (or `null`) (not a length-1 array). Likewise, the type of `selectedLabels` changes from `(string | number)[]` to `string | number | null` and `selectedValues` from `unknown[]` to `unknown | null`. `maxSelect={1}` will also give `div.multiselect` a class of `single`. I.e. you can target the selector `div.multiselect.single` to give single selects a different appearance from multi selects.

1. ```ts
   maxSelectMsg: ((current: number, max: number) => string) | null = (
     current: number,
     max: number
   ) => (max > 1 ? `${current}/${max}` : ``)
   ```

   Inform users how many of the maximum allowed options they have already selected. Set `maxSelectMsg={null}` to not show a message. Defaults to `null` when `maxSelect={1}` or `maxSelect={null}`. Else if `maxSelect > 1`, defaults to:

   ```ts
   maxSelectMsg = (current: number, max: number) => `${current}/${max}`
   ```

   Use CSS selector `span.max-select-msg` (or prop `maxSelectMsgClass` if you're using a CSS framework like Tailwind) to customize appearance of the message container.

1. ```ts
   minSelect: number | null = null
   ```

   Conditionally render the `x` button which removes a selected option depending on the number of selected options. Meaning all remove buttons disappear if `selected.length <= minSelect`. E.g. if 2 options are selected and `minSelect={3}`, users will not be able to remove any selections until they selected more than 3 options.

   Note: Prop `required={3}` should be used instead if you only care about the component state at form submission time. `minSelect={3}` should be used if you want to place constraints on component state at all times.

1. ```ts
   name: string | null = null
   ```

   Applied to the `<input>` element. Sets the key of this field in a submitted form data object. See [form example](https://janosh.github.io/svelte-multiselect/form).

1. ```ts
   noMatchingOptionsMsg: string = `No matching options`
   ```

   What message to show if no options match the user-entered search string.

1. ```ts
   open: boolean = false
   ```

   Whether the dropdown list is currently visible. Is two-way bindable, i.e. can be used for external control of when the options are visible.

1. ```ts
   options: Option[]
   ```

   **The only required prop** (no default). Array of strings/numbers or `Option` objects to be listed in the dropdown. The only required key on objects is `label` which must also be unique. An object's `value` defaults to `label` if `undefined`. You can add arbitrary additional keys to your option objects. A few keys like `preselected` and `title` have special meaning though. See type `ObjectOption` in [`src/lib/index.ts`](https://github.com/janosh/svelte-multiselect/blob/main/src/lib/index.ts) for all special keys and their purpose.

1. ```ts
   outerDiv: HTMLDivElement | null = null
   ```

   Handle to outer `<div class="multiselect">` that wraps the whole component. Only available after component mounts (`null` before then).

1. ```ts
   parseLabelsAsHtml: boolean = false
   ```

   Whether option labels should be passed to [Svelte's `@html` directive](https://svelte.dev/tutorial/html-tags) or inserted into the DOM as plain text. `true` will raise an error if `allowUserOptions` is also truthy as it makes your site susceptible to [cross-site scripting (XSS) attacks](https://wikipedia.org/wiki/Cross-site_scripting).

1. ```ts
   pattern: string | null = null
   ```

   The pattern attribute specifies a regular expression which the input's value must match. If a non-null value doesn't match the `pattern` regex, the read-only `patternMismatch` property will be `true`. See [MDN](https://developer.mozilla.org/docs/Web/HTML/Attributes/pattern) for details.

1. ```ts
   placeholder: string | null = null
   ```

   String shown in the text input when no option is selected.

1. ```ts
   removeAllTitle: string = `Remove all`
   ```

   Title text to display when user hovers over remove-all button.

1. ```ts
   removeBtnTitle: string = `Remove`
   ```

   Title text to display when user hovers over button to remove selected option (which defaults to a cross icon).

1. ```ts
   required: boolean | number = false
   ```

   If `required = true, 1, 2, ...` forms can't be submitted without selecting given number of options. `true` means 1. `false` means even empty MultiSelect will pass form validity check. If user tries to submit a form containing MultiSelect with less than the required number of options, submission is aborted, MultiSelect scrolls into view and shows message "Please select at least `required` options".

1. ```ts
   resetFilterOnAdd: boolean = true
   ```

   Whether text entered into the input to filter options in the dropdown list is reset to empty string when user selects an option.

1. ```ts
   searchText: string = ``
   ```

   Text the user-entered to filter down on the list of options. Binds both ways, i.e. can also be used to set the input text.

1. ```ts
   selected: Option[] =
    options
      ?.filter((op) => (op as ObjectOption)?.preselected)
      .slice(0, maxSelect ?? undefined) ?? []
   ```

   Array of currently selected options. Supports 2-way binding `bind:selected={[1, 2, 3]}` to control component state externally. Can be passed as prop to set pre-selected options that will already be populated when component mounts before any user interaction.

1. ```ts
   sortSelected: boolean | ((op1: Option, op2: Option) => number) = false
   ```

   Default behavior is to render selected items in the order they were chosen. `sortSelected={true}` uses default JS array sorting. A compare function enables custom logic for sorting selected options. See the [`/sort-selected`](https://janosh.github.io/svelte-multiselect/sort-selected) example.

1. ```ts
   selectedOptionsDraggable: boolean = !sortSelected
   ```

   Whether selected options are draggable so users can change their order.

1. ```ts
   value: Option | Option[] | null = null
   ```

   If `maxSelect={1}`, `value` will be the single item in `selected` (or `null` if `selected` is empty). If `maxSelect != 1`, `maxSelect` and `selected` are equal. Warning: Setting `value` does not rendered state on initial mount, meaning `bind:value` will update local variable `value` whenever internal component state changes but passing a `value` when component first mounts won't be reflected in UI. This is because the source of truth for rendering is `bind:selected`. `selected` is reactive to `value` internally but only on reassignment from initial value. Suggestions for better solutions than [#249](https://github.com/janosh/svelte-multiselect/issues/249) welcome!

## 🎰 &thinsp; Slots

`MultiSelect.svelte` accepts the following named slots:

1. `slot="option"`: Customize rendering of dropdown options. Receives as props an `option` and the zero-indexed position (`idx`) it has in the dropdown.
1. `slot="selected"`: Customize rendering of selected items. Receives as props an `option` and the zero-indexed position (`idx`) it has in the list of selected items.
1. `slot="spinner"`: Custom spinner component to display when in `loading` state. Receives no props.
1. `slot="disabled-icon"`: Custom icon to display inside the input when in `disabled` state. Receives no props. Use an empty `<span slot="disabled-icon" />` or `div` to remove the default disabled icon.
1. `slot="expand-icon"`: Allows setting a custom icon to indicate to users that the Multiselect text input field is expandable into a dropdown list. Receives prop `open: boolean` which is true if the Multiselect dropdown is visible and false if it's hidden.
1. `slot="remove-icon"`: Custom icon to display as remove button. Will be used both by buttons to remove individual selected options and the 'remove all' button that clears all options at once. Receives no props.
1. `slot="user-msg"`: Displayed like a dropdown item when the list is empty and user is allowed to create custom options based on text input (or if the user's text input clashes with an existing option). `let:props`:
   - `duplicateOptionMsg: string`: See [props](#🔣-props).
   - `createOptionMsg: string`: See [props](#🔣-props).
   - `textInputIsDuplicate: boolean`: Whether user has typed text that matches an already existing option.
   - `searchText: string`: The text user typed into search input.
   - `msg: string`: `duplicateOptionMsg` if user input is a duplicate else `createOptionMsg`.
1. `slot='after-input'`: ForPlaced after the search input. For arbitrary content like icons or temporary messages. Receives props `selected`, `disabled`, `invalid`, `id`, `placeholder`, `open`, `required`.

Example using several slots:

```svelte
<MultiSelect options={[`Red`, `Green`, `Blue`, `Yellow`, `Purple`]} let:idx let:option>
   <!-- default slot overrides rendering of both dropdown-listed and selected options -->
  <span>
    {idx + 1}
    {option.label}
    <span style:background={option.label} style=" width: 1em; height: 1em;" />
  </span>

  <CustomSpinner slot="spinner">
  <strong slot="remove-icon">X</strong>
</MultiSelect>
```

## 🎬 &thinsp; Events

`MultiSelect.svelte` dispatches the following events:

1. ```ts
   on:add={(event) => console.log(event.detail.option)}
   ```

   Triggers when a new option is selected.

1. ```ts
   on:remove={(event) => console.log(event.detail.option)}`
   ```

   Triggers when one selected option provided as `event.detail.option` is removed.

1. ```ts
   on:removeAll={(event) => console.log(event.detail.options)}`
   ```

   Triggers when all selected options are removed. The payload `event.detail.options` gives the options that were previously selected.

1. ```ts
   on:change={(event) => console.log(`${event.detail.type}: '${event.detail.option}'`)}
   ```

   Triggers when an option is either added or removed, or all options are removed at once. `type` is one of `'add' | 'remove' | 'removeAll'` and payload will be `option: Option` or `options: Option[]`, respectively.

1. ```ts
   on:open={(event) => console.log(`Multiselect dropdown was opened by ${event}`)}
   ```

   Triggers when the dropdown list of options appears. Event is the DOM's `FocusEvent`,`KeyboardEvent` or `ClickEvent` that initiated this Svelte `dispatch` event.

1. ```ts
   on:close={(event) => console.log(`Multiselect dropdown was closed by ${event}`)}
   ```

   Triggers when the dropdown list of options disappears. Event is the DOM's `FocusEvent`, `KeyboardEvent` or `ClickEvent` that initiated this Svelte `dispatch` event.

For example, here's how you might annoy your users with an alert every time one or more options are added or removed:

```svelte
<MultiSelect
  on:change={(e) => {
    if (e.detail.type === 'add') alert(`You added ${e.detail.option}`)
    if (e.detail.type === 'remove') alert(`You removed ${e.detail.option}`)
    if (e.detail.type === 'removeAll') alert(`You removed ${e.detail.options}`)
  }}
/>
```

> Note: Depending on the data passed to the component the `options(s)` payload will either be objects or simple strings/numbers.

The above list of events are [Svelte `dispatch` events](https://svelte.dev/tutorial/component-events). This component also forwards many DOM events from the `<input>` node: `blur`, `change`, `click`, `keydown`, `keyup`, `mousedown`, `mouseenter`, `mouseleave`, `touchcancel`, `touchend`, `touchmove`, `touchstart`. Registering listeners for these events works the same:

```svelte
<MultiSelect
  options={[1, 2, 3]}
  on:keyup={(event) => console.log('key', event.target.value)}
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

The inferred type of `Option` is used to enforce type-safety on derived props like `selected` as well as slot components. E.g. you'll get an error when trying to use a slot component that expects a string if your options are objects (see [this comment](https://github.com/janosh/svelte-multiselect/pull/189/files#r1058853697) for example screenshots).

You can also import [the types this component uses](https://github.com/janosh/svelte-multiselect/blob/main/src/lib/index.ts) for downstream applications:

```ts
import {
  Option,
  ObjectOption,
  DispatchEvents,
  MultiSelectEvents,
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
