import { CircleSpinner } from '$lib'
import { mount } from 'svelte'
import { expect, test } from 'vite-plus/test'
import { doc_query } from './index'

test.each([
  [`defaults`, {}, `1em`, `cornflowerblue`, `1.5s`],
  [
    `custom props`,
    { size: `100px`, color: `rebeccapurple`, duration: `250ms` },
    `100px`,
    `rebeccapurple`,
    `250ms`,
  ],
] as const)(
  `CircleSpinner renders %s`,
  (_label, props, expected_size, expected_color, expected_duration) => {
    mount(CircleSpinner, { target: document.body, props })

    const div = doc_query(`div`)
    expect(div.style.width).toBe(expected_size)
    expect(div.style.height).toBe(expected_size)
    expect(div.style.borderColor).toBe(
      `${expected_color} transparent ${expected_color} ${expected_color}`,
    )
    expect(div.style.getPropertyValue(`--duration`)).toBe(expected_duration)
  },
)
