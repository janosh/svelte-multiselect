// Tests for the Confetti animation component
import Confetti from '$site/Confetti.svelte'
import { mount } from 'svelte'
import { expect, test, vi } from 'vite-plus/test'

test(`renders n_items spans and reuses DOM nodes across animation frames`, async () => {
  mount(Confetti, { target: document.body, props: { n_items: 5, speed: 5 } })

  const spans = Array.from(document.querySelectorAll<HTMLSpanElement>(`div > span`))
  expect(spans).toHaveLength(5)
  const initial_tops = spans.map((span) => span.style.top)

  // wait until the animation loop has moved at least one span
  await vi.waitFor(() => {
    const current = document.querySelectorAll<HTMLSpanElement>(`div > span`)
    const moved = Array.from(current).some(
      (span, idx) => span.style.top !== initial_tops[idx],
    )
    if (!moved) throw new Error(`animation has not advanced yet`)
  })

  // spans must be updated in place - a content-derived each key would destroy
  // and recreate every span on each frame
  const after = document.querySelectorAll<HTMLSpanElement>(`div > span`)
  expect(after).toHaveLength(5)
  after.forEach((span, idx) => expect(span).toBe(spans[idx]))
})

test(`freeze stops the animation`, async () => {
  mount(Confetti, {
    target: document.body,
    props: { n_items: 3, speed: 5, freeze: true },
  })

  const get_tops = () =>
    Array.from(document.querySelectorAll<HTMLSpanElement>(`div > span`)).map(
      (span) => span.style.top,
    )
  const initial_tops = get_tops()
  await new Promise((resolve) => setTimeout(resolve, 100))
  expect(get_tops()).toEqual(initial_tops)
})
