import MultiSelect from '$lib'
import { describe, expect, test } from 'vitest'

describe(`MultiSelect`, () => {
  test(`defaultDisabledTitle and custom per-option disabled titles are applied correctly`, () => {
    const defaultDisabledTitle = `Not selectable`
    const special_disabled_title = `Special disabled title`
    const options = [0, 1, 2].map((el) => ({
      label: el,
      value: el,
      disabled: true,
      disabledTitle: el ? undefined : special_disabled_title,
    }))

    new MultiSelect({
      target: document.body,
      props: { options, defaultDisabledTitle },
    })

    const lis = document.querySelectorAll(`div.multiselect > ul.options > li`)

    expect(lis.length).toBe(3)

    expect([...lis].map((li) => li.title)).toEqual([
      special_disabled_title,
      defaultDisabledTitle,
      defaultDisabledTitle,
    ])
  })

  test(`removeAllTitle and removeBtnTitle are applied correctly`, () => {
    const removeAllTitle = `Custom remove all title`
    const removeBtnTitle = `Custom remove button title`
    const options = [1, 2, 3].map((itm) => ({
      label: itm,
      value: itm,
      preselected: true,
    }))

    new MultiSelect({
      target: document.body,
      props: { removeAllTitle, removeBtnTitle, options },
    })
    const remove_all_btn = document.querySelector(
      `div.multiselect button.remove-all`
    ) as HTMLButtonElement
    const remove_btns = document.querySelectorAll(
      `div.multiselect > ul.selected > li > button`
    )

    expect(remove_all_btn.title).toBe(removeAllTitle)
    expect([...remove_btns].map((btn) => btn.title)).toEqual(
      options.map((op) => `${removeBtnTitle} ${op.label}`)
    )
  })
})
