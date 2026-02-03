# Changelog

## [v11.6.1](https://github.com/janosh/svelte-multiselect/compare/v11.6.0...v11.6.1)

> 3 February 2026

- fix: use value field for key function to prevent case-variant crashes by @davidamacey in https://github.com/janosh/svelte-multiselect/pull/392
- Add dropdown cooldown and CSS custom properties to Nav by @janosh in https://github.com/janosh/svelte-multiselect/pull/393
- Add tooltip shrink-to-fit algorithm and fix reactive content updates by @janosh in https://github.com/janosh/svelte-multiselect/pull/394
- Simplify syntax highlighting with starry-night common bundle by @janosh in https://github.com/janosh/svelte-multiselect/pull/395

## New Contributors

- @davidamacey made their first contribution in https://github.com/janosh/svelte-multiselect/pull/392

## [v11.6.0](https://github.com/janosh/svelte-multiselect/compare/v11.5.2...v11.6.0)

> 25 January 2026

- Add fallback for crypto.randomUUID to prevent crash in non-secure contexts by @AlessioBugetti in https://github.com/janosh/svelte-multiselect/pull/386
- Add pinned dropdown feature to Nav component by @janosh in https://github.com/janosh/svelte-multiselect/pull/387
- Add selection history with undo/redo support by @janosh in https://github.com/janosh/svelte-multiselect/pull/388
- Reduce live-examples dependencies by 4 packages by @janosh in https://github.com/janosh/svelte-multiselect/pull/390

## New Contributors

- @AlessioBugetti made their first contribution in https://github.com/janosh/svelte-multiselect/pull/386

## [v11.5.1](https://github.com/janosh/svelte-multiselect/compare/v11.5.0...v11.5.1)

> 18 January 2026

- Enhance tooltip attachment with new options and accessibility by @janosh in https://github.com/janosh/svelte-multiselect/pull/378
- Use :where() for user-overridable CSS selectors by @janosh in https://github.com/janosh/svelte-multiselect/pull/381
- Add heading-anchors module for SSR-compatible heading links by @janosh in https://github.com/janosh/svelte-multiselect/pull/382
- Add 4 new event callbacks for user feedback and analytics by @janosh in https://github.com/janosh/svelte-multiselect/pull/383
- Enhance Nav component with extended route configuration by @janosh in https://github.com/janosh/svelte-multiselect/pull/384

## [v11.5.0](https://github.com/janosh/svelte-multiselect/compare/v11.4.0...v11.5.0)

> 4 January 2026

- Add `MultiSelect` `onreorder` event and fire `onchange` event on drag-drop reordering by @janosh in https://github.com/janosh/svelte-multiselect/pull/373
- fix: prevent extra binding updates on init and selection by @janosh in https://github.com/janosh/svelte-multiselect/pull/374
- Option grouping with collapsible headers and per-group select all by @janosh in https://github.com/janosh/svelte-multiselect/pull/375
- `resizable` attachment + `MultiSelect` keyboard shortcuts + more test coverage by @janosh in https://github.com/janosh/svelte-multiselect/pull/376
- ARIA 1.2 combobox pattern for VoiceOver accessibility by @janosh in https://github.com/janosh/svelte-multiselect/pull/377

## [v11.4.0](https://github.com/janosh/svelte-multiselect/compare/v11.3.0...v11.4.0)

> 25 December 2025

- Add prop `selectAllOption: boolean = false` to `MultiSelect` by @janosh in https://github.com/janosh/svelte-multiselect/pull/345
- Change `closeDropdownOnSelect` default from `'if-mobile'` to `false` by @janosh in https://github.com/janosh/svelte-multiselect/pull/349
- Don't open dropdown when clicking on selected options by @janosh in https://github.com/janosh/svelte-multiselect/pull/355
- Add `MultiSelect` prop `selectedFlipParams` for customizable flip animation by @janosh in https://github.com/janosh/svelte-multiselect/pull/358
- Prevent mouse hover during scroll from overriding `MultiSelect` arrow key navigation by @janosh in https://github.com/janosh/svelte-multiselect/pull/359
- Overload `placeholder` prop to support `object | string` with `persistent` option by @janosh in https://github.com/janosh/svelte-multiselect/pull/360
- fix: `resetFilterOnAdd` for Enter/selectAll, add `can_remove`/`is_object` helpers, prevent spurious `removeAll` events by @janosh in https://github.com/janosh/svelte-multiselect/pull/361
- Fix enter key deselection now preserves `searchText` (matching mouse behavior) by @janosh in https://github.com/janosh/svelte-multiselect/pull/363
- fix: prevent infinite loops with array-cloning reactive wrappers (stores, Superforms) by @janosh in https://github.com/janosh/svelte-multiselect/pull/365
- fix: don't render message `<li>` when duplicateOptionMsg/noMatchingOptionsMsg/createOptionMsg is empty by @janosh in https://github.com/janosh/svelte-multiselect/pull/366
- v11.4.0 + fix Svelte Playground links and npm package compatibility by @janosh in https://github.com/janosh/svelte-multiselect/pull/368

## [v11.3.0](https://github.com/janosh/svelte-multiselect/compare/v11.2.4...v11.3.0)

> 9 November 2025

- Allow initializing `selected` from `value` prop by @janosh in https://github.com/janosh/svelte-multiselect/pull/338
- Fix generic type inference in `MultiSelect` by @janosh in https://github.com/janosh/svelte-multiselect/pull/340
- Better `Nav.svelte` with dropdown menus and a burger button for mobile views by @janosh in https://github.com/janosh/svelte-multiselect/pull/341

## [v11.2.4](https://github.com/janosh/svelte-multiselect/compare/v11.2.3...v11.2.4)

> 4 October 2025

- Add prop `fuzzy: boolean = true` to `MultiSelect` and `CmdPalette` for fuzzy option filtering (#334) by @janosh
- fix broken mobile touch selection with portal enabled (#336) by @janosh
- immediately hide tooltip on scroll + icon fixes in MultiSelect + type fixes in CmdPalette and PrevNext by @janosh

## [v11.2.3](https://github.com/janosh/svelte-multiselect/compare/v11.2.2...v11.2.3)

> 13 August 2025

- Items can no longer be removed via backspace when that would violate minSelect by @janosh in https://github.com/janosh/svelte-multiselect/pull/328
- Add `/events` demo page by @janosh in https://github.com/janosh/svelte-multiselect/pull/329
- Add MultiSelect prop `keepSelectedInDropdown: false | 'plain' | 'checkboxes'` by @janosh in https://github.com/janosh/svelte-multiselect/pull/331
- Add /attachments demo page + add arrow to tooltip by @janosh in https://github.com/janosh/svelte-multiselect/pull/332

## [v11.2.2](https://github.com/janosh/svelte-multiselect/compare/v11.2.1...v11.2.2)

> 12 July 2025

- Add Svelte attachments: `draggable`, `sortable`, `tooltip`, `highlight_matches`, `click_outside` by @janosh in https://github.com/janosh/svelte-multiselect/pull/325

**Full Changelog**: https://github.com/janosh/svelte-multiselect/compare/v11.2.1...v11.2.2

All notable changes to this project will be documented in this file. Dates are displayed in UTC.

## [v11.2.1](https://github.com/janosh/svelte-multiselect/compare/v11.2.0...v11.2.1)

> 11 July 2025

- Drop accidental `highlight.js` dependency by @janosh in https://github.com/janosh/svelte-multiselect/pull/324

**Full Changelog**: https://github.com/janosh/svelte-multiselect/compare/v11.2.0...v11.2.1

## [v11.2.0](https://github.com/janosh/svelte-multiselect/compare/v11.1.1...v11.2.0)

> 11 July 2025

- Better getting started docs by @janosh in https://github.com/janosh/svelte-multiselect/pull/312
- `removeAll` event timing: clear `selected` before events fire by @janosh in https://github.com/janosh/svelte-multiselect/pull/313
- Open dropdown on programmatic focus and close it on blur by @janosh in https://github.com/janosh/svelte-multiselect/pull/314
- Fix `<input>` adding unwanted width when options selected by @janosh in https://github.com/janosh/svelte-multiselect/pull/315
- MultiSelect fire `oncreate` event for all user-created options by @janosh in https://github.com/janosh/svelte-multiselect/pull/316
- Add new value `'retain-focus'` for prop `closeDropdownOnSelect` by @janosh in https://github.com/janosh/svelte-multiselect/pull/318
- Swap `node` for `deno` by @janosh in https://github.com/janosh/svelte-multiselect/pull/319
- migrate useful Svelte components: `CodeExample`, `CopyButton`, `FileDetails`, `GitHubCorner`, `Icon`, `PrevNext`, `RadioButtons`, `Toggle` by @janosh in https://github.com/janosh/svelte-multiselect/pull/323

**Full Changelog**: https://github.com/janosh/svelte-multiselect/compare/v11.1.1...v11.2.0

## [v11.1.1](https://github.com/janosh/svelte-multiselect/compare/v11.1.0...v11.1.1)

> 20 May 2025

- more playwright tests for active+inactive portal [`66ebd8d`](https://github.com/janosh/svelte-multiselect/commit/66ebd8dedc799180daba0af734f9cbebd1b7c723)
- pnpm remove svelte-multiselect [`bc6ee6c`](https://github.com/janosh/svelte-multiselect/commit/bc6ee6c5a75d0c7c223159ee72da568e5eb6befd)
- replace `browser` from @app/env import with `typeof window` check in portal() action to support non-sveltekit apps [`2a8f116`](https://github.com/janosh/svelte-multiselect/commit/2a8f116b89b9f42e075f57dc7ecb2b63a4065723)
- remove unused link-check-config.json [`c4f26ef`](https://github.com/janosh/svelte-multiselect/commit/c4f26efda66e3a153cf2a5ec0fcd2de29d19f4bc)

## [v11.1.0](https://github.com/janosh/svelte-multiselect/compare/v11.0.0...v11.1.0)

> 17 May 2025

- Multiselect portal [`#306`](https://github.com/janosh/svelte-multiselect/pull/306)
- Multiselect portal (#306) [`#301`](https://github.com/janosh/svelte-multiselect/issues/301)

## [v11.0.0](https://github.com/janosh/svelte-multiselect/compare/v11.0.0-rc.1...v11.0.0)

> 15 May 2025

- Prevent empty style attributes on `ul.selected &gt; li` and `ul.options &gt; li` [`#304`](https://github.com/janosh/svelte-multiselect/pull/304)
- Breaking: Svelte 5 [`#295`](https://github.com/janosh/svelte-multiselect/pull/295)
- update and fix linting, fix 2 dead readme links [`91f22d0`](https://github.com/janosh/svelte-multiselect/commit/91f22d0cafdf931607288d18c5268badd358d83b)

## [v11.0.0-rc.1](https://github.com/janosh/svelte-multiselect/compare/v10.3.0...v11.0.0-rc.1)

> 24 October 2024

- update `MultiSelect.svelte` for Svelte5 compatibility [`#293`](https://github.com/janosh/svelte-multiselect/pull/293)

## [v10.3.0](https://github.com/janosh/svelte-multiselect/compare/v10.2.0...v10.3.0)

> 8 April 2024

- `MultiSelect` fix form validation not resetting when `required` prop changes [`#286`](https://github.com/janosh/svelte-multiselect/pull/286)
- Update readme.md [`#283`](https://github.com/janosh/svelte-multiselect/pull/283)
- Housekeeping [`#282`](https://github.com/janosh/svelte-multiselect/pull/282)
- Improve docs around Events [`#280`](https://github.com/janosh/svelte-multiselect/pull/280)
- Add props `style`, `inputStyle`, `liOptionStyle`, `liSelectedStyle`, `ulSelectedStyle`, `ulOptionsStyle` [`#279`](https://github.com/janosh/svelte-multiselect/pull/279)
- Add props `liUserMsgClass` and `liUserMsgActiveClass` [`#274`](https://github.com/janosh/svelte-multiselect/pull/274)
- link check treat 403 http status as alive, update deps [`1b04c15`](https://github.com/janosh/svelte-multiselect/commit/1b04c15eb71ba608c863562cb81e66bc24d21baf)

## [v10.2.0](https://github.com/janosh/svelte-multiselect/compare/v10.1.0...v10.2.0)

> 21 September 2023

- Breaking: rename `focusInputOnSelect` to `closeDropdownOnSelect` [`#267`](https://github.com/janosh/svelte-multiselect/pull/267)
- Fix empty `event.detail.options` payload on `removeAll` [`#266`](https://github.com/janosh/svelte-multiselect/pull/266)
- update deps [`58cee43`](https://github.com/janosh/svelte-multiselect/commit/58cee43adc8bb4a25befb0d804a73752e1d4ced5)

## [v10.1.0](https://github.com/janosh/svelte-multiselect/compare/v10.0.0...v10.1.0)

> 18 July 2023

- Always show `createOptionMsg` if `allowUserOptions` is truthy and user entered text [`#254`](https://github.com/janosh/svelte-multiselect/pull/254)
- Add key `style` to `ObjectOption` for per-option inline CSS [`#252`](https://github.com/janosh/svelte-multiselect/pull/252)
- Make `selected` and `value` each reactive to each other [`#250`](https://github.com/janosh/svelte-multiselect/pull/250)
- [pre-commit.ci] pre-commit autoupdate [`#246`](https://github.com/janosh/svelte-multiselect/pull/246)

# [v10.0.0](https://github.com/janosh/svelte-multiselect/compare/v9.0.0...v10.0.0)

> 1 July 2023

- v10.0.0 [`#245`](https://github.com/janosh/svelte-multiselect/pull/245)
- Add Multiselect prop `maxOptions: number` [`#243`](https://github.com/janosh/svelte-multiselect/pull/243)
- Add `&lt;slot name="user-msg"&gt;` [`#240`](https://github.com/janosh/svelte-multiselect/pull/240)
- Rename prop `duplicateFunc()` to `key()` [`#238`](https://github.com/janosh/svelte-multiselect/pull/238)
- declare types [`#236`](https://github.com/janosh/svelte-multiselect/pull/236)
- add &lt;slot name="after-input"&gt; [`0fe8e8d`](https://github.com/janosh/svelte-multiselect/commit/0fe8e8d59e7dbfe8a650079c052a1ed7902c69fa)
- add sentence on inputmode='none' use case for hiding on-screen keyboards to readme [`466f0a1`](https://github.com/janosh/svelte-multiselect/commit/466f0a12e866ba525194924902b67401397aa21f)

# [v9.0.0](https://github.com/janosh/svelte-multiselect/compare/v8.6.2...v9.0.0)

> 1 June 2023

- Revert "Fix Svelte 3.57 a11y (#215)" [`#232`](https://github.com/janosh/svelte-multiselect/pull/232)
- Add default slot [`#231`](https://github.com/janosh/svelte-multiselect/pull/231)
- CmdPalette add prop close_keys [`099e1ac`](https://github.com/janosh/svelte-multiselect/commit/099e1acbae8b66b0a10129ecb2930bb10920974f)
- add copy buttons to all code fences [`950dcf6`](https://github.com/janosh/svelte-multiselect/commit/950dcf64ccc91471ebf5dc3b7ef169156ef86e44)

## [v8.6.2](https://github.com/janosh/svelte-multiselect/compare/v8.6.1...v8.6.2)

> 15 May 2023

- Remove circular import between `MultiSelect` and `index.ts` [`#230`](https://github.com/janosh/svelte-multiselect/pull/230)
- Automatically add "bug" label to bug report issues [`#229`](https://github.com/janosh/svelte-multiselect/pull/229)
- Allow `createOptionMsg=null` to suppress console error when `allowUserOptions` thruthy [`#227`](https://github.com/janosh/svelte-multiselect/pull/227)
- Fix MultiSelect unable to deselect object options [`#226`](https://github.com/janosh/svelte-multiselect/pull/226)
- Update pnpm instructions [`#224`](https://github.com/janosh/svelte-multiselect/pull/224)

## [v8.6.1](https://github.com/janosh/svelte-multiselect/compare/v8.6.0...v8.6.1)

> 30 April 2023

- Fix `svelte-check` errors [`#223`](https://github.com/janosh/svelte-multiselect/pull/223)
- fix: hide dropdown when custom messages are empty [`#220`](https://github.com/janosh/svelte-multiselect/pull/220)
- DRY workflows [`#218`](https://github.com/janosh/svelte-multiselect/pull/218)
- fix: allow object options to share the same label [`#217`](https://github.com/janosh/svelte-multiselect/pull/217)
- delete wait_for_animation_end() and fix tests to use playwright auto-waiting correctly [`2493029`](https://github.com/janosh/svelte-multiselect/commit/249302938315a69dd6d16c9f35b0a1fb5471bbeb)
- don't highlight noMatchingOptionsMsg &lt;span&gt; in sms-search-matches [`a1feca7`](https://github.com/janosh/svelte-multiselect/commit/a1feca747ac5cf7de4e2de2408d14b9a033e8afa)

## [v8.6.0](https://github.com/janosh/svelte-multiselect/compare/v8.5.0...v8.6.0)

> 19 March 2023

- Fix Svelte 3.57 a11y [`#215`](https://github.com/janosh/svelte-multiselect/pull/215)
- Add prop `highlightMatches` to `MultiSelect` [`#212`](https://github.com/janosh/svelte-multiselect/pull/212)
- fix: add missing role attr for &lt;li&gt; [`#211`](https://github.com/janosh/svelte-multiselect/pull/211)
- update deps, set TS moduleResolution=bundler [`a12835e`](https://github.com/janosh/svelte-multiselect/commit/a12835ee312174fa247a38742a8724ac540c8808)

## [v8.5.0](https://github.com/janosh/svelte-multiselect/compare/v8.4.0...v8.5.0)

> 9 March 2023

- Fix Lighthouse a11y issues [`#210`](https://github.com/janosh/svelte-multiselect/pull/210)
- clear selected and searchText first, then trigger removeAll and change events in remove_all() [`#208`](https://github.com/janosh/svelte-multiselect/issues/208)
- add props style, span_style, open, dialog, input, placeholder to CmdPalette + pipe through all other props to MultiSelect [`97e6815`](https://github.com/janosh/svelte-multiselect/commit/97e6815cf0eb87a13303922f0186ceb0434b72a9)
- fix /css-classes example not applying styles from external classes [`aa1e28e`](https://github.com/janosh/svelte-multiselect/commit/aa1e28e482999ff496a2b12a1aefc4cc80ada798)

## [v8.4.0](https://github.com/janosh/svelte-multiselect/compare/v8.3.0...v8.4.0)

> 1 March 2023

- Make first matching option active automatically on entering searchText [`#206`](https://github.com/janosh/svelte-multiselect/pull/206)
- add src/lib/NavPalette.svelte invoked with cmd+k for keyboard-only site navigation [`e3f4ea9`](https://github.com/janosh/svelte-multiselect/commit/e3f4ea955970bc81973420fb197ce68ac55cc391)
- rename NavPalette to CmdPalette and make it execute generic actions on item select [`b27cd80`](https://github.com/janosh/svelte-multiselect/commit/b27cd806c4c7c1bbf3d311e2d5ba6c7844eabb8d)
- update to svelte-package v2 [`8d3df3e`](https://github.com/janosh/svelte-multiselect/commit/8d3df3ef5d742f3f3b7041f339d4b8cac556e0e6)
- fix selected options having cursor: grab (to indicate drag and drop support to change order) even if only single option selected [`3309e1e`](https://github.com/janosh/svelte-multiselect/commit/3309e1e176e0a55945fdc9b30e7ff290dabe3cf0)

## [v8.3.0](https://github.com/janosh/svelte-multiselect/compare/v8.2.4...v8.3.0)

> 25 January 2023

- Don't error on removing options that are in `selected` but not in `options` array [`#204`](https://github.com/janosh/svelte-multiselect/pull/204)
- Add class 'remove' to buttons that remove selected options [`#202`](https://github.com/janosh/svelte-multiselect/pull/202)
- Add prop allowEmpty: boolean = false [`#198`](https://github.com/janosh/svelte-multiselect/pull/198)
- Support `immutable` Svelte compiler option [`#197`](https://github.com/janosh/svelte-multiselect/pull/197)
- group demo routes [`e813e48`](https://github.com/janosh/svelte-multiselect/commit/e813e480716f29ab4bdd53f90afe56485507fb1c)
- breaking: rename addOptionMsg to createOptionMsg [`f24e025`](https://github.com/janosh/svelte-multiselect/commit/f24e0256fcdc32c90ed798edbb663a6be18ebe00)

## [v8.2.4](https://github.com/janosh/svelte-multiselect/compare/v8.2.3...v8.2.4)

> 8 January 2023

- Coverage badges [`#190`](https://github.com/janosh/svelte-multiselect/pull/190)
- feat: add type inference for the `options` prop [`#189`](https://github.com/janosh/svelte-multiselect/pull/189)
- feat: add type inference for the `options` prop (#189) [`#78`](https://github.com/janosh/svelte-multiselect/issues/78)
- merge ExampleCode.svelte with CollapsibleCode.svelte [`56ff99b`](https://github.com/janosh/svelte-multiselect/commit/56ff99bcc378c5582b303aa1c03302cdbceb3076)
- pnpm add -D svelte-zoo to outsource some site components and icons [`f2a387c`](https://github.com/janosh/svelte-multiselect/commit/f2a387cbcc9b1471c4f76fb0df2b7c2a09c52951)
- restore reactive searchText block in loading example [`846da66`](https://github.com/janosh/svelte-multiselect/commit/846da66af058ac1f448c8aaa513d12fb4c2ac4cc)
- fix bunch of TS errors, add playwright test for dragging selected options to reorder [`a483217`](https://github.com/janosh/svelte-multiselect/commit/a4832176f6fceb5346af2d4cd8ecc01a5626ab43)
- add update-coverage package.json script [`1094f08`](https://github.com/janosh/svelte-multiselect/commit/1094f08cec9d6fd2f54b058af05022ab35ec4ac9)
- add vite alias $root to clean up package.json, readme|contributing|changelog.md imports [`c19cbe4`](https://github.com/janosh/svelte-multiselect/commit/c19cbe4e38413bbcd04d4e35eddcd4cd88c67662)
- mv src/components src/site [`3683ed7`](https://github.com/janosh/svelte-multiselect/commit/3683ed70f19498070ffe9e95c0261c688fb2f7c7)

## [v8.2.3](https://github.com/janosh/svelte-multiselect/compare/v8.2.2...v8.2.3)

> 28 December 2022

- add 'Open in StackBlitz' links to example code fences [`ac07557`](https://github.com/janosh/svelte-multiselect/commit/ac075576c261892807faa0071b5f3e0b5b4fcd2c)

## [v8.2.2](https://github.com/janosh/svelte-multiselect/compare/v8.2.1...v8.2.2)

> 18 December 2022

- Issue console warning if `sortSelected && selectedOptionsDraggable` [`#187`](https://github.com/janosh/svelte-multiselect/pull/187)
- Add new slot named 'expand-icon' [`#186`](https://github.com/janosh/svelte-multiselect/pull/186)

## [v8.2.1](https://github.com/janosh/svelte-multiselect/compare/v8.2.0...v8.2.1)

> 10 December 2022

- Fix `allowUserOptions` preventing dropdown list navigation with up/down arrow keys [`#184`](https://github.com/janosh/svelte-multiselect/pull/184)
- Mdsvexamples [`#182`](https://github.com/janosh/svelte-multiselect/pull/182)
- Add changelog & contributing pages to site [`#181`](https://github.com/janosh/svelte-multiselect/pull/181)
- tweak contributing.md and css-classes example [`6f78033`](https://github.com/janosh/svelte-multiselect/commit/6f78033826beb34cd00bf3282c93ac5328905735)
- fix build error [`b896d36`](https://github.com/janosh/svelte-multiselect/commit/b896d3643a0988b0d0bed832ba46bcad0e2c4494)
- fix readme badge for gh-pages.yml status [`906b560`](https://github.com/janosh/svelte-multiselect/commit/906b56024a826ed45263197b1267015d88f0a660)

## [v8.2.0](https://github.com/janosh/svelte-multiselect/compare/v8.1.0...v8.2.0)

> 30 November 2022

- Add `changelog.md` [`#180`](https://github.com/janosh/svelte-multiselect/pull/180)
- Draggable selected options [`#178`](https://github.com/janosh/svelte-multiselect/pull/178)
- Set `&lt;base href="/svelte-multiselect" /&gt;` `if !dev && !prerendering` [`#172`](https://github.com/janosh/svelte-multiselect/pull/172)
- Publish docs to GitHub pages [`#170`](https://github.com/janosh/svelte-multiselect/pull/170)
- Contributing docs plus issue and PR templates with StackBlitz repro starter [`#169`](https://github.com/janosh/svelte-multiselect/pull/169)
- add missing about field to bug-report issue template (closes #171) [`#171`](https://github.com/janosh/svelte-multiselect/issues/171)
- fix prop form_input: set default value null to make it optional [`b150fe0`](https://github.com/janosh/svelte-multiselect/commit/b150fe0032ebde82a319b23bd5e6b573e0c31721)

## [v8.1.0](https://github.com/janosh/svelte-multiselect/compare/v8.0.4...v8.1.0)

> 18 November 2022

- Add minSelect prop [`#166`](https://github.com/janosh/svelte-multiselect/pull/166)
- Add `pnpm test` to readme [`#168`](https://github.com/janosh/svelte-multiselect/pull/168)
- Add class for maxSelectMsg [`#167`](https://github.com/janosh/svelte-multiselect/pull/167)
- Allow `required=1 | 2 | ...` to set minimum number of selected options for form submission [`#161`](https://github.com/janosh/svelte-multiselect/pull/161)
- Add minSelect prop (#166) [`#163`](https://github.com/janosh/svelte-multiselect/issues/163) [`#163`](https://github.com/janosh/svelte-multiselect/issues/163) [`#163`](https://github.com/janosh/svelte-multiselect/issues/163)
- mv /max-select example to /min-max-select [`9838db8`](https://github.com/janosh/svelte-multiselect/commit/9838db87d044a0d3d261c82ac1d654b9e32310d1)

## [v8.0.4](https://github.com/janosh/svelte-multiselect/compare/v8.0.3...v8.0.4)

> 15 November 2022

- Form validation docs [`#159`](https://github.com/janosh/svelte-multiselect/pull/159)
- Don't `console.error` about missing `options` if `disabled=true` [`#158`](https://github.com/janosh/svelte-multiselect/pull/158)

## [v8.0.3](https://github.com/janosh/svelte-multiselect/compare/v8.0.2...v8.0.3)

> 15 November 2022

- Test uncovered lines [`#157`](https://github.com/janosh/svelte-multiselect/pull/157)
- Don't `console.error` about missing `options` if `loading=true` [`#156`](https://github.com/janosh/svelte-multiselect/pull/156)
- Measure `vitest` coverage with `c8` [`#155`](https://github.com/janosh/svelte-multiselect/pull/155)
- increase --sms-min-height 19-&gt;22pt [`5d0e081`](https://github.com/janosh/svelte-multiselect/commit/5d0e0815d0b488ae23b439a3f085dd083138c326)

## [v8.0.2](https://github.com/janosh/svelte-multiselect/compare/v8.0.1...v8.0.2)

> 7 November 2022

- Pass JSON.stringified selected options to form submission handlers [`#152`](https://github.com/janosh/svelte-multiselect/pull/152)
- Link check CI and readme housekeeping [`#149`](https://github.com/janosh/svelte-multiselect/pull/149)
- REPL links for landing page examples [`#148`](https://github.com/janosh/svelte-multiselect/pull/148)
- Add Collapsible code blocks to usage examples [`#143`](https://github.com/janosh/svelte-multiselect/pull/143)
- REPL links for landing page examples (#148) [`#144`](https://github.com/janosh/svelte-multiselect/issues/144) [`#145`](https://github.com/janosh/svelte-multiselect/issues/145) [`#146`](https://github.com/janosh/svelte-multiselect/issues/146) [`#147`](https://github.com/janosh/svelte-multiselect/issues/147)

## [v8.0.1](https://github.com/janosh/svelte-multiselect/compare/v8.0.0...v8.0.1)

> 30 October 2022

- Revert SCSS preprocessing [`#141`](https://github.com/janosh/svelte-multiselect/pull/141)
- Add unit tests for 2-/1-way binding of `activeIndex` and `activeOption` [`#139`](https://github.com/janosh/svelte-multiselect/pull/139)

# [v8.0.0](https://github.com/janosh/svelte-multiselect/compare/v7.1.0...v8.0.0)

> 22 October 2022

- Add new prop `value` [`#138`](https://github.com/janosh/svelte-multiselect/pull/138)
- New prop resetFilterOnAdd [`#137`](https://github.com/janosh/svelte-multiselect/pull/137)
- `yarn` to `pnpm` [`#134`](https://github.com/janosh/svelte-multiselect/pull/134)
- Rename prop `noOptionsMsg`-&gt;`noMatchingOptionsMsg` [`#133`](https://github.com/janosh/svelte-multiselect/pull/133)
- remove props selectedLabels and selectedValues [`ef6598e`](https://github.com/janosh/svelte-multiselect/commit/ef6598e8b0dc1f2f8cb687074463cb73b2f9ebff)

## [v7.1.0](https://github.com/janosh/svelte-multiselect/compare/v7.0.2...v7.1.0)

> 13 October 2022

- Allow preventing duplicate options when allowUserOptions is thruthy [`#132`](https://github.com/janosh/svelte-multiselect/pull/132)

## [v7.0.2](https://github.com/janosh/svelte-multiselect/compare/v7.0.1...v7.0.2)

> 8 October 2022

- Fix TypeError: Cannot read properties of null (reading 'get_label') - take 2 [`#131`](https://github.com/janosh/svelte-multiselect/pull/131)
- Fix selecting options with falsy labels (like 0) [`#130`](https://github.com/janosh/svelte-multiselect/pull/130)

## [v7.0.1](https://github.com/janosh/svelte-multiselect/compare/v7.0.0...v7.0.1)

> 6 October 2022

- Fix single select with arrow and enter keys [`#128`](https://github.com/janosh/svelte-multiselect/pull/128)
- Add SCSS preprocessing [`#126`](https://github.com/janosh/svelte-multiselect/pull/126)
- [pre-commit.ci] pre-commit autoupdate [`#124`](https://github.com/janosh/svelte-multiselect/pull/124)
- more unit tests [`1adbc99`](https://github.com/janosh/svelte-multiselect/commit/1adbc994b746b39c4ad081dc2573bf37f27c96c0)
- test required but empty MultiSelect fails form validity check (i.e. causes unsubmittable form) and filled one passes it [`fd8b377`](https://github.com/janosh/svelte-multiselect/commit/fd8b37782cd508aacfc8125c6647cefe56144b80)

# [v7.0.0](https://github.com/janosh/svelte-multiselect/compare/v6.1.0...v7.0.0)

> 3 October 2022

- Make selected a single value (not a length-1 array) if maxSelect=1 [`#123`](https://github.com/janosh/svelte-multiselect/pull/123)
- Fix TypeError: Cannot read properties of null (reading 'get_label') at MultiSelect.svelte:75 [`#122`](https://github.com/janosh/svelte-multiselect/pull/122)
- add stopPropagation to keydown handler (closes #114) [`#114`](https://github.com/janosh/svelte-multiselect/issues/114)

## [v6.1.0](https://github.com/janosh/svelte-multiselect/compare/v6.0.3...v6.1.0)

> 30 September 2022

- Forward input DOM events [`#120`](https://github.com/janosh/svelte-multiselect/pull/120)
- Props to manipulating inputmode and pattern attributes [`#116`](https://github.com/janosh/svelte-multiselect/pull/116)
- docs: remove `userInputAs` prop reference [`#115`](https://github.com/janosh/svelte-multiselect/pull/115)
- Fix top option not selectable with enter key [`#113`](https://github.com/janosh/svelte-multiselect/pull/113)

## [v6.0.3](https://github.com/janosh/svelte-multiselect/compare/v6.0.2...v6.0.3)

> 20 September 2022

- Fix using arrow keys to control active option in dropdown list [`#111`](https://github.com/janosh/svelte-multiselect/pull/111)
- eslintrc set @typescript-eslint/no-inferrable-types: off [`c688773`](https://github.com/janosh/svelte-multiselect/commit/c6887737871709cdadc2ef0835795d6c1696e34c)

## [v6.0.2](https://github.com/janosh/svelte-multiselect/compare/v6.0.1...v6.0.2)

> 17 September 2022

- Test readme docs on CSS variables [`#109`](https://github.com/janosh/svelte-multiselect/pull/109)
- Fix selected array not being initialized to options with preselected=true [`#108`](https://github.com/janosh/svelte-multiselect/pull/108)

## [v6.0.1](https://github.com/janosh/svelte-multiselect/compare/v6.0.0...v6.0.1)

> 13 September 2022

- Better props docs and test [`#105`](https://github.com/janosh/svelte-multiselect/pull/105)
- fix breaking change sveltekit:prefetch renamed to data-sveltekit-prefetch [`65ddbb9`](https://github.com/janosh/svelte-multiselect/commit/65ddbb93c720e3d92d7bc3fec232f58e87c0ea6d)
- fix .svx demo routes [`fde53f1`](https://github.com/janosh/svelte-multiselect/commit/fde53f1225fda928412303256d48b77d122d19f1)
- revert from adapter-netlify to adapter-static [`224144d`](https://github.com/janosh/svelte-multiselect/commit/224144dce012d1eef515abafa542c6a6b7e063e8)

# [v6.0.0](https://github.com/janosh/svelte-multiselect/compare/v5.0.6...v6.0.0)

> 3 September 2022

- Better on mobile and better about which option is active [`#103`](https://github.com/janosh/svelte-multiselect/pull/103)
- SvelteKit routes auto migration [`#101`](https://github.com/janosh/svelte-multiselect/pull/101)

## [v5.0.6](https://github.com/janosh/svelte-multiselect/compare/v5.0.5...v5.0.6)

> 2 August 2022

- Fix 'Cannot find module `scroll-into-view-if-needed`' [`#99`](https://github.com/janosh/svelte-multiselect/pull/99)

## [v5.0.5](https://github.com/janosh/svelte-multiselect/compare/v5.0.4...v5.0.5)

> 2 August 2022

- Add `scroll-into-view-if-needed` ponyfill [`#97`](https://github.com/janosh/svelte-multiselect/pull/97)

## [v5.0.4](https://github.com/janosh/svelte-multiselect/compare/v5.0.3...v5.0.4)

> 17 July 2022

- Convert E2E tests from`vitest` to `@playwright/test` [`#95`](https://github.com/janosh/svelte-multiselect/pull/95)
- Allow empty Multiselect [`#94`](https://github.com/janosh/svelte-multiselect/pull/94)
- Add new slot `'remove-icon'` [`#93`](https://github.com/janosh/svelte-multiselect/pull/93)
- [pre-commit.ci] pre-commit autoupdate [`#92`](https://github.com/janosh/svelte-multiselect/pull/92)

## [v5.0.3](https://github.com/janosh/svelte-multiselect/compare/v5.0.2...v5.0.3)

> 1 July 2022

- Reset `activeOption` to `null` if not in `matchingOptions` [`#90`](https://github.com/janosh/svelte-multiselect/pull/90)

## [v5.0.2](https://github.com/janosh/svelte-multiselect/compare/v5.0.1...v5.0.2)

> 27 June 2022

- Replace `li.scrollIntoViewIfNeeded()` with `li.scrollIntoView()` [`#88`](https://github.com/janosh/svelte-multiselect/pull/88)
- Add new prop `parseLabelsAsHtml` [`#84`](https://github.com/janosh/svelte-multiselect/pull/84)
- try fix flaky test 'multiselect &gt; can select and remove many options' [`2b0c453`](https://github.com/janosh/svelte-multiselect/commit/2b0c453c794c0b3b82e81c5b994c10bc305a98d6)
- bump netlify node to v18, update readme + deps [`586c724`](https://github.com/janosh/svelte-multiselect/commit/586c724d471aece2b5a3726bb5eb145e36073fe3)
- remove plausible.js analytics [`cd4c9f6`](https://github.com/janosh/svelte-multiselect/commit/cd4c9f6e18e13959dfb4fcebe9acba7a875b83a2)

## [v5.0.1](https://github.com/janosh/svelte-multiselect/compare/v5.0.0...v5.0.1)

> 23 April 2022

- Strongly typed custom events [`#79`](https://github.com/janosh/svelte-multiselect/pull/79)

# [v5.0.0](https://github.com/janosh/svelte-multiselect/compare/v4.0.6...v5.0.0)

> 21 April 2022

- v5 release [`#76`](https://github.com/janosh/svelte-multiselect/pull/76)
- Work with string options as is, don't convert to objects internally [`#75`](https://github.com/janosh/svelte-multiselect/pull/75)
- v5 release (#76) [`#57`](https://github.com/janosh/svelte-multiselect/issues/57)

## [v4.0.6](https://github.com/janosh/svelte-multiselect/compare/v4.0.5...v4.0.6)

> 7 April 2022

- Fix backspace deleting multiple selected options if identical labels [`#72`](https://github.com/janosh/svelte-multiselect/pull/72)
- Several fixes for `allowUserOptions` [`#69`](https://github.com/janosh/svelte-multiselect/pull/69)
- [pre-commit.ci] pre-commit autoupdate [`#70`](https://github.com/janosh/svelte-multiselect/pull/70)

## [v4.0.5](https://github.com/janosh/svelte-multiselect/compare/v4.0.4...v4.0.5)

> 2 April 2022

- Fix MultiSelect `localStorage` binding [`#66`](https://github.com/janosh/svelte-multiselect/pull/66)

## [v4.0.4](https://github.com/janosh/svelte-multiselect/compare/v4.0.3...v4.0.4)

> 30 March 2022

- Move examples to new `src/routes/demos` dir [`#63`](https://github.com/janosh/svelte-multiselect/pull/63)
- make ToC position fixed (closes #64) [`#64`](https://github.com/janosh/svelte-multiselect/issues/64)
- check for undefined (not falsy) value in rawOp processing (fixes #65) [`#65`](https://github.com/janosh/svelte-multiselect/issues/65)
- LanguageSnippet change SVG icons src repo to vscode-icons for more coverage [`92390e9`](https://github.com/janosh/svelte-multiselect/commit/92390e937a063b2b0c88e0ac6f9a9d8f3cb1eadd)
- more preselected slots in Examples.svelte [`cd0a01a`](https://github.com/janosh/svelte-multiselect/commit/cd0a01a7a6b319299642b3c24c5caea8dc9dc24d)

## [v4.0.3](https://github.com/janosh/svelte-multiselect/compare/v4.0.2...v4.0.3)

> 23 March 2022

- Add `aria-label` to hidden `.form-control` input [`#62`](https://github.com/janosh/svelte-multiselect/pull/62)
- Add `aria-label` to hidden `.form-control` input (#62) [`#58`](https://github.com/janosh/svelte-multiselect/issues/58) [`#35`](https://github.com/janosh/svelte-multiselect/issues/35)
- fix dropdown closing when clicking between list items (closes #61) [`#61`](https://github.com/janosh/svelte-multiselect/issues/61)
- svelte.config.js add kit.prerender.default: true, mv src/{global,app}.d.ts [`4a84913`](https://github.com/janosh/svelte-multiselect/commit/4a8491380e08bad137ca7bdda9ee4ddd38abe3d6)

## [v4.0.2](https://github.com/janosh/svelte-multiselect/compare/v4.0.1...v4.0.2)

> 13 March 2022

- Improve a11y [`#60`](https://github.com/janosh/svelte-multiselect/pull/60)
- Convert tests to Playwright [`#59`](https://github.com/janosh/svelte-multiselect/pull/59)
- Convert tests to Playwright (#59) [`#58`](https://github.com/janosh/svelte-multiselect/issues/58)
- add and document prop invalid (closes #47) [`#47`](https://github.com/janosh/svelte-multiselect/issues/47)
- set width (not height) on svg icons and as px (not em) so they don't shrink with fluid typography on mobile screens [`ba77f93`](https://github.com/janosh/svelte-multiselect/commit/ba77f93b23b375bb650411b580406f1f7d55f365)

## [v4.0.1](https://github.com/janosh/svelte-multiselect/compare/v4.0.0...v4.0.1)

> 5 March 2022

- Rename readonly to disabled [`#55`](https://github.com/janosh/svelte-multiselect/pull/55)
- CSS and UX tweaks [`#52`](https://github.com/janosh/svelte-multiselect/pull/52)
- Readme document test runner config to avoid transpiling errors in downstream testing [`#54`](https://github.com/janosh/svelte-multiselect/pull/54)
- More tests [`#51`](https://github.com/janosh/svelte-multiselect/pull/51)
- Add `vitest` [`#50`](https://github.com/janosh/svelte-multiselect/pull/50)
- Rename readonly to disabled (#55) [`#45`](https://github.com/janosh/svelte-multiselect/issues/45)
- close options dropdown list on input blur (fixes #53) [`#53`](https://github.com/janosh/svelte-multiselect/issues/53)
- CSS and UX tweaks (#52) [`#44`](https://github.com/janosh/svelte-multiselect/issues/44) [`#44`](https://github.com/janosh/svelte-multiselect/issues/44) [`#44`](https://github.com/janosh/svelte-multiselect/issues/44)
- Readme document test runner config to avoid transpiling errors in downstream testing (#54) [`#48`](https://github.com/janosh/svelte-multiselect/issues/48)

# [v4.0.0](https://github.com/janosh/svelte-multiselect/compare/v3.3.0...v4.0.0)

> 21 February 2022

- Implement `allowUserOptions`, `autoScroll` and `loading` (closes #39) [`#41`](https://github.com/janosh/svelte-multiselect/pull/41)
- define DispatchEvents type used to annotate createEventDispatcher() [`#32`](https://github.com/janosh/svelte-multiselect/pull/32)
- add prop required to prevent form submission if no options selected (closes #42) [`#42`](https://github.com/janosh/svelte-multiselect/issues/42)
- Implement `allowUserOptions`, `autoScroll` and `loading` (closes #39) (#41) [`#39`](https://github.com/janosh/svelte-multiselect/issues/39) [`#39`](https://github.com/janosh/svelte-multiselect/issues/39)

## [v3.3.0](https://github.com/janosh/svelte-multiselect/compare/v3.2.3...v3.3.0)

> 20 February 2022

- by default, only show maxSelectMsg if maxSelect != null and &gt; 1 (closes #37) [`#37`](https://github.com/janosh/svelte-multiselect/issues/37)
- add CSS var --sms-options-shadow defaults to subtle black shadow around dropdown list (0 0 14pt -8pt black) (closes #36) [`#36`](https://github.com/janosh/svelte-multiselect/issues/36)
- add prop liActiveOptionClass = '' (closes #35) [`#35`](https://github.com/janosh/svelte-multiselect/issues/35)
- turn searchText = and showOptions = false into bindable props (closes #33) [`#33`](https://github.com/janosh/svelte-multiselect/issues/33)
- document missing noOptionsMsg prop (closes #34) [`#34`](https://github.com/janosh/svelte-multiselect/issues/34)
- ensure custom class names (outerDivClass, ulOptionsClass) come last (closes #38) [`#38`](https://github.com/janosh/svelte-multiselect/issues/38)
- fix ToC scroll to heading (closes #31) [`#31`](https://github.com/janosh/svelte-multiselect/issues/31)
- only show remove all btn when maxSelect !== 1 (for #37) [`64cfd8a`](https://github.com/janosh/svelte-multiselect/commit/64cfd8a1108e19aae12e65c3ad17177f09a066d8)

## [v3.2.3](https://github.com/janosh/svelte-multiselect/compare/v3.2.2...v3.2.3)

> 19 February 2022

- Fixes for focus on click and wiggle on hitting maxSelect [`#30`](https://github.com/janosh/svelte-multiselect/pull/30)

## [v3.2.2](https://github.com/janosh/svelte-multiselect/compare/v3.2.1...v3.2.2)

> 16 February 2022

- Expose filter method [`#29`](https://github.com/janosh/svelte-multiselect/pull/29)
- readme improve docs on css variables and granular control through :global() selectors (closes #27) [`#27`](https://github.com/janosh/svelte-multiselect/issues/27)

## [v3.2.1](https://github.com/janosh/svelte-multiselect/compare/v3.2.0...v3.2.1)

> 7 February 2022

- mv input outside ul.selected for better HTML semantics (closes #26) [`#26`](https://github.com/janosh/svelte-multiselect/issues/26)

## [v3.2.0](https://github.com/janosh/svelte-multiselect/compare/v3.1.1...v3.2.0)

> 3 February 2022

- apply id prop to &lt;input&gt; insted of outer div (closes #25) [`#25`](https://github.com/janosh/svelte-multiselect/issues/25)
- add eslint commit hook + update deps [`6ad44b8`](https://github.com/janosh/svelte-multiselect/commit/6ad44b85057aef71eae19293de80f9d42f91f87b)
- v.3.2.0 [`71ff2d1`](https://github.com/janosh/svelte-multiselect/commit/71ff2d192caccacbe41f83949c14d7d4ca87d590)
- add readme badge to document minimum svelte version (for #24) [`7d9fe5a`](https://github.com/janosh/svelte-multiselect/commit/7d9fe5a977b56dab95069b64321f0718e0d61f08)

## [v3.1.1](https://github.com/janosh/svelte-multiselect/compare/v3.1.0...v3.1.1)

> 25 January 2022

- wiggle the maxSelect msg on hitting selection limit (closes #19) [`#19`](https://github.com/janosh/svelte-multiselect/issues/19)
- readme better docs for CSS variables, rename slots {options,selected}Renderer -&gt; render{options,selected} [`c8ab724`](https://github.com/janosh/svelte-multiselect/commit/c8ab7241506cfe6b5930d098150a251e85c52afd)

## [v3.1.0](https://github.com/janosh/svelte-multiselect/compare/v3.0.1...v3.1.0)

> 22 January 2022

- add selectedRenderer + optionRenderer named slots (closes #21) [`#21`](https://github.com/janosh/svelte-multiselect/issues/21)
- docs site use unmodified readme with slot to insert examples, yarn add svelte-github-corner [`1072691`](https://github.com/janosh/svelte-multiselect/commit/10726916ea2a72560cd8ee6f2806526bf932e771)
- readme add note on type exports for TS users, add error page that redirects to index [`dde76c8`](https://github.com/janosh/svelte-multiselect/commit/dde76c8b92408b7fddca0b555a63c2b1bfd0dbe8)

## [v3.0.1](https://github.com/janosh/svelte-multiselect/compare/v3.0.0...v3.0.1)

> 7 January 2022

- favorite web framework show Confetti.svelte on:add Svelte [`8d109ee`](https://github.com/janosh/svelte-multiselect/commit/8d109ee5c7755e447fcb72419f3b7ecc19cac0b2)
- bump svelte@3.45.0 to silence warning: MultiSelect has unused export property 'defaultDisabledTitle' (sveltejs/svelte#6964) [`f80a7a6`](https://github.com/janosh/svelte-multiselect/commit/f80a7a622310005407585298f2611597c0941990)
- update readme + svelte-toc@0.2.0 [`40013ba`](https://github.com/janosh/svelte-multiselect/commit/40013badd61dd0fcade7ab295dabd26693e3cc51)
- [pre-commit.ci] pre-commit autoupdate [`0d05864`](https://github.com/janosh/svelte-multiselect/commit/0d05864d19987460dd30d667eb22deb91a520668)
- iOS Safari prevent zoom into page on focus MultiSelect input [`44f17be`](https://github.com/janosh/svelte-multiselect/commit/44f17be53378e38f4a8748b815737d25cdebc85f)

# [v3.0.0](https://github.com/janosh/svelte-multiselect/compare/v2.0.0...v3.0.0)

> 29 December 2021

- ensure active option is scrolled into view if needed (closes #15), breaking change: renames tokens to options [`#15`](https://github.com/janosh/svelte-multiselect/issues/15)

# [v2.0.0](https://github.com/janosh/svelte-multiselect/compare/v1.2.2...v2.0.0)

> 24 December 2021

- Convert options from simple strings to objects [`#16`](https://github.com/janosh/svelte-multiselect/pull/16)
- Add local to transition:fly [`#14`](https://github.com/janosh/svelte-multiselect/pull/14)
- add onClickOutside action, used to replace input.on:blur() for hiding options (closes #18) [`#18`](https://github.com/janosh/svelte-multiselect/issues/18)
- update deps [`fb90f93`](https://github.com/janosh/svelte-multiselect/commit/fb90f936fa0d49f81e6c9c60986dd04749ea6a67)
- more keyboard friendliness by showing remove button focus and triggering on space bar or enter key [`b87d22b`](https://github.com/janosh/svelte-multiselect/commit/b87d22bc5706acd18e1e79c40b3845f2ee3615b2)
- add plausible [`0557c0f`](https://github.com/janosh/svelte-multiselect/commit/0557c0f2bbef80820540302af29c79b7ac89023b)

## [v1.2.2](https://github.com/janosh/svelte-multiselect/compare/v1.2.1...v1.2.2)

> 27 October 2021

- set &lt;input&gt; width back to 1pt as it's only needed to tab into, focus and blur &lt;MultiSelect&gt; (closes #12) [`#12`](https://github.com/janosh/svelte-multiselect/issues/12)
- update readme [`45c7993`](https://github.com/janosh/svelte-multiselect/commit/45c7993398c986499d4c0729177620cbec719cb7)

## [v1.2.1](https://github.com/janosh/svelte-multiselect/compare/v1.2.0...v1.2.1)

> 21 October 2021

- make internal CSS easily overridable (sveltejs/svelte#6859) [`d15a445`](https://github.com/janosh/svelte-multiselect/commit/d15a44504707c178c67e22318b2cc6095b1b192f)

## [v1.2.0](https://github.com/janosh/svelte-multiselect/compare/v1.1.13...v1.2.0)

> 12 October 2021

- add src/lib/index.ts for package path export '.' (closes #11) [`#11`](https://github.com/janosh/svelte-multiselect/issues/11)

## [v1.1.13](https://github.com/janosh/svelte-multiselect/compare/v1.1.12...v1.1.13)

> 12 October 2021

- add src/lib/index.ts for package path export '.' (closes #11) [`#11`](https://github.com/janosh/svelte-multiselect/issues/11)

## [v1.1.12](https://github.com/janosh/svelte-multiselect/compare/v1.1.11...v1.1.12)

> 11 October 2021

- Add new prop disabledOptions [`#9`](https://github.com/janosh/svelte-multiselect/pull/9)
- add pre-commit hooks [`dfb6399`](https://github.com/janosh/svelte-multiselect/commit/dfb6399a77b705f8e5979eb887d345a5f52ff929)
- [pre-commit.ci] pre-commit autoupdate [`b69425d`](https://github.com/janosh/svelte-multiselect/commit/b69425d18473122f1af889d2f48c60d02e43b99f)

## [v1.1.11](https://github.com/janosh/svelte-multiselect/compare/v1.1.10...v1.1.11)

> 3 September 2021

- fix removeAll button not dispatching remove and change events (closes #7) [`#7`](https://github.com/janosh/svelte-multiselect/issues/7)
- remove @tsconfig/svelte, update deps [`9b2c231`](https://github.com/janosh/svelte-multiselect/commit/9b2c23181f4a96bd9d002f535dd669153e772b72)
- add type=(add|remove) detail to 'change' event dispatch [`8290458`](https://github.com/janosh/svelte-multiselect/commit/8290458b898292a28d65710d6941f193fb9964aa)

## [v1.1.10](https://github.com/janosh/svelte-multiselect/compare/v1.1.9...v1.1.10)

> 12 August 2021

- add on:change event and document events in readme (closes #5) [`#5`](https://github.com/janosh/svelte-multiselect/issues/5)

## [v1.1.9](https://github.com/janosh/svelte-multiselect/compare/v1.1.8...v1.1.9)

> 12 July 2021

- convert to typescript [`bd391c5`](https://github.com/janosh/svelte-multiselect/commit/bd391c5aba615ab41e2f561f81e057928a7064a8)
- update to @sveltejs/kit@1.0.0-next.124+ to use svelte field in package.json [`2367e38`](https://github.com/janosh/svelte-multiselect/commit/2367e38d699e503e6dc98808904278f96eb54ee7)

## [v1.1.8](https://github.com/janosh/svelte-multiselect/compare/v1.1.7...v1.1.8)

> 7 July 2021

- turn hard-coded remove button titles into props [`c35162b`](https://github.com/janosh/svelte-multiselect/commit/c35162b0d0c1ed183bc23dbf15b0ff46638cbb3b)
- guard against selected being nullish, keep ul.options in the DOM even if showoptions is false to allow selecting in dev tools for styling [`b9bd576`](https://github.com/janosh/svelte-multiselect/commit/b9bd576f6f76ec86ebeff1d899d8947bef64f66f)

## [v1.1.7](https://github.com/janosh/svelte-multiselect/compare/v1.1.6...v1.1.7)

> 5 July 2021

- add css classes as props for use with tailwind (closes #3) [`#3`](https://github.com/janosh/svelte-multiselect/issues/3)

## [v1.1.6](https://github.com/janosh/svelte-multiselect/compare/v1.1.5...v1.1.6)

> 23 June 2021

- fix: don't remove tags if search string is non-empty, open options on clicking selected tags (#2) [`5ffed50`](https://github.com/janosh/svelte-multiselect/commit/5ffed50617f47dba6ffbafd6ce266fa6e064c7de)
- update svelte-toc to fix deploy [`d5279dd`](https://github.com/janosh/svelte-multiselect/commit/d5279dd11279509493030aeb26295873929b2253)

## [v1.1.5](https://github.com/janosh/svelte-multiselect/compare/v1.1.4...v1.1.5)

> 22 June 2021

- convert to svelte-kit package [`9db3cfb`](https://github.com/janosh/svelte-multiselect/commit/9db3cfb5b6e2db844961be5bc59fc12e5d5b6b76)

## [v1.1.4](https://github.com/janosh/svelte-multiselect/compare/v1.1.3...v1.1.4)

> 21 June 2021

- fix setting initial value for selected, fix setting class 'selected' in single mode [`16d11de`](https://github.com/janosh/svelte-multiselect/commit/16d11de77567f9d30e37e815dfcb9a7d580d6500)

## [v1.1.3](https://github.com/janosh/svelte-multiselect/compare/v1.1.2...v1.1.3)

> 20 June 2021

- replace prop single with maxSelect to specify any number of selectable options, add class single to div.multiselect if maxSelect===1 (#2) [`36e916f`](https://github.com/janosh/svelte-multiselect/commit/36e916f4a42d395c394ddff47364a17fd22a7ec1)
- add linked headings [`2eedf9a`](https://github.com/janosh/svelte-multiselect/commit/2eedf9aa24512ff96f8ccff564d3a1fa7615388a)

## [v1.1.2](https://github.com/janosh/svelte-multiselect/compare/v1.1.1...v1.1.2)

> 28 May 2021

- add css var props [`f591814`](https://github.com/janosh/svelte-multiselect/commit/f5918141805cfc6acda28c836a57c3df81fa758f)

## [v1.1.1](https://github.com/janosh/svelte-multiselect/compare/v1.1.0...v1.1.1)

> 25 May 2021

- add GitHubCorner.svelte for link to repo [`e80a402`](https://github.com/janosh/svelte-multiselect/commit/e80a402556783108bc5dc626f9816b647e2c937f)
- remove selected tokens with backspace [`c5d7495`](https://github.com/janosh/svelte-multiselect/commit/c5d7495a43b945dd56ad06fbe639de0db542d5f4)
- add readme badges [`992eaa4`](https://github.com/janosh/svelte-multiselect/commit/992eaa43ec19841b3035a5dcf9996eaf58316fa8)
- demo site fix stripping start of readme for docs [`107273d`](https://github.com/janosh/svelte-multiselect/commit/107273de356f176cb0fc94f28ae4f2e773b62d42)
- add svelte-toc table of contents to demo site [`36aa1c5`](https://github.com/janosh/svelte-multiselect/commit/36aa1c523c5bc3acb14e9613b61c04ffd54c6100)

## [v1.1.0](https://github.com/janosh/svelte-multiselect/compare/v1.0.1...v1.1.0)

> 9 May 2021

- import readme on demo site instead of duplication [`c0e4924`](https://github.com/janosh/svelte-multiselect/commit/c0e49246e76a81600bb35931fd7d30f6f6aeb550)
- remove ununsed example.svx [`2138caa`](https://github.com/janosh/svelte-multiselect/commit/2138caa171f20a2f80c2e75d0dffd066caf17a83)
- rename package dir, improve readme [`0150378`](https://github.com/janosh/svelte-multiselect/commit/015037848f666a76b24b93603764084b41611740)

## [v1.0.1](https://github.com/janosh/svelte-multiselect/compare/v1.0.0...v1.0.1)

> 8 May 2021

- remove hidden input for storing currently selected as JSON [`802a219`](https://github.com/janosh/svelte-multiselect/commit/802a2195a28986c219298d7d9e7ca47f2aaf7db6)

## v1.0.0

> 7 May 2021

- initial commit [`14dd38a`](https://github.com/janosh/svelte-multiselect/commit/14dd38adb06a8899e39efabdb114faab943cedf0)
