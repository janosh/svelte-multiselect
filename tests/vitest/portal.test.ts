import { portal_action } from '$lib/portal'
import { tick } from 'svelte'
import { expect, test, vi } from 'vite-plus/test'

function create_fixture(in_shadow_root = false) {
  const host = document.createElement(`div`)
  const home = in_shadow_root ? host.attachShadow({ mode: `open` }) : host
  const target = document.createElement(`button`)
  const node = document.createElement(`div`)
  const sibling = document.createElement(`span`)
  home.append(target, node, sibling)
  document.body.append(host)
  return { home, target, node, sibling }
}

test(`restores from a shadow root after its anchor is removed`, async () => {
  const { target, node, sibling } = create_fixture(true)
  const active_params = { active: true, open: true, target_node: target }
  node.style.color = `red`
  const action = portal_action(node, active_params)
  await tick()
  expect(node.parentElement).toBe(document.body)

  sibling.remove()
  action.update({ ...active_params, active: false })
  expect(node.previousSibling).toBe(target)
  expect(node.nextSibling).toBeNull()
  expect(node.style.cssText).toBe(`color: red;`)
  expect(node.hidden).toBe(false)
  expect(node.hasAttribute(`data-placement`)).toBe(false)

  action.update(active_params)
  await tick()
  action.destroy()
  expect(node.isConnected).toBe(false)
})

// closing must hide the dropdown in the same tick; deferring it to the reposition
// microtask would leave a stale dropdown painted for a frame
test(`hides synchronously when open flips false`, () => {
  const { target, node } = create_fixture()
  const action = portal_action(node, { active: true, open: true, target_node: target })
  expect(node.hidden).toBe(false)

  action.update({ active: true, open: false, target_node: target })
  expect(node.hidden).toBe(true)

  // deactivating must not un-hide a dropdown that is still closed
  action.update({ active: false, open: false, target_node: target })
  expect(node.hidden).toBe(true)
  action.destroy()
})

test(`destroy detaches viewport listeners only when portalled`, () => {
  const { home, target, node } = create_fixture()
  const remove_spy = vi.spyOn(globalThis, `removeEventListener`)

  // never portalled, so Svelte owns removal and the action must leave the node alone
  portal_action(node, { active: false, open: true, target_node: target }).destroy()
  expect(node.parentNode).toBe(home)
  const baseline = remove_spy.mock.calls.length

  portal_action(node, { active: true, open: true, target_node: target }).destroy()
  // the exact pairs matter: scroll must be removed with capture=true or the
  // capturing listener added on activate stays bound forever
  expect(
    remove_spy.mock.calls.slice(baseline).map(([type, , options]) => [type, options]),
  ).toEqual([
    [`scroll`, true],
    [`resize`, undefined],
  ])
  expect(node.isConnected).toBe(false)
})
