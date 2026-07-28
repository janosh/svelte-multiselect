import LiteYouTubeEmbed from '$lib/LiteYouTubeEmbed.svelte'
import { mount, tick } from 'svelte'
import { afterAll, describe, expect, test, vi } from 'vite-plus/test'
import { doc_query } from './index'

// happy-dom navigates an iframe's src for real, which would put youtube.com requests in
// the test run; serve every request locally instead and record what was asked for.
const { settings } = (
  globalThis as unknown as {
    happyDOM: { settings: { fetch: Record<string, unknown> } }
  }
).happyDOM
const fetched: string[] = []
const original_interceptor = settings.fetch.interceptor
settings.fetch.interceptor = {
  beforeAsyncRequest: ({ request }: { request: { url: string } }) => {
    fetched.push(request.url)
    return new Response(``)
  },
}
afterAll(() => {
  settings.fetch.interceptor = original_interceptor
})
describe(`LiteYouTubeEmbed`, () => {
  const mount_embed = (props: Record<string, unknown> = {}) => {
    const state_props = $state({ video_id: `abc123`, ...props })
    mount(LiteYouTubeEmbed, { target: document.body, props: state_props })
    return state_props
  }
  const iframes = () => document.querySelectorAll(`iframe`)
  const click = (selector: string) => doc_query(selector).click()

  // the entire point of the component: an unwatched embed costs one image, not a player
  test.each([
    [`play button`, `button.play-btn`],
    [`poster image`, `img.poster`],
  ])(`has no iframe until the %s is clicked, then exactly one`, async (_desc, sel) => {
    // rest is spread ahead of the component's own onclick, so unchained this is dropped
    const consumer_click = vi.fn()
    mount_embed({ onclick: consumer_click })
    await tick()
    expect(iframes()).toHaveLength(0)
    expect(document.querySelector(`img.poster`)).not.toBeNull()

    click(sel)
    await tick()
    expect(iframes()).toHaveLength(1)
    expect(consumer_click).toHaveBeenCalledOnce()

    click(sel) // a second click must not stack a second player
    await tick()
    expect(iframes()).toHaveLength(1)
  })

  test(`builds both poster sources and the labels from video_id`, async () => {
    const props = mount_embed({
      video_id: `xyz789`,
      play_label: `Watch the talk`,
      iframe_title: `Talk player`,
    })
    await tick()

    expect(doc_query(`picture source`).getAttribute(`srcset`)).toBe(
      `https://i.ytimg.com/vi_webp/xyz789/hqdefault.webp`,
    )
    expect(doc_query(`picture source`).getAttribute(`type`)).toBe(`image/webp`)
    const poster = doc_query<HTMLImageElement>(`img.poster`)
    expect(poster.getAttribute(`src`)).toBe(`https://i.ytimg.com/vi/xyz789/hqdefault.jpg`)
    // the poster is decorative, so the play button is the only thing carrying the label
    expect(poster.alt).toBe(``)
    expect(doc_query(`button.play-btn`).getAttribute(`aria-label`)).toBe(`Watch the talk`)

    click(`button.play-btn`)
    await tick()
    // a supplied title, not the default: asserting the default cannot tell a wired prop
    // from a hardcoded attribute
    expect(doc_query(`iframe`).getAttribute(`title`)).toBe(`Talk player`)

    // the poster URLs get the same encoding the iframe src above is checked for
    props.video_id = `a b/c`
    await tick()
    expect(doc_query(`picture source`).getAttribute(`srcset`)).toBe(
      `https://i.ytimg.com/vi_webp/a%20b%2Fc/hqdefault.webp`,
    )
    expect(doc_query(`img.poster`).getAttribute(`src`)).toBe(
      `https://i.ytimg.com/vi/a%20b%2Fc/hqdefault.jpg`,
    )
  })

  test.each([
    [
      `defaults to youtube-nocookie`,
      {},
      `https://www.youtube-nocookie.com/embed/abc123?autoplay=1`,
    ],
    [
      `nocookie=false opts into the tracking host`,
      { nocookie: false },
      `https://www.youtube.com/embed/abc123?autoplay=1`,
    ],
    [
      `empty player_params drops the default autoplay`,
      { player_params: {} },
      `https://www.youtube-nocookie.com/embed/abc123`,
    ],
    [
      `start and list`,
      { player_params: { autoplay: 1, start: 90, list: `PLabc` } },
      `https://www.youtube-nocookie.com/embed/abc123?autoplay=1&start=90&list=PLabc`,
    ],
    [
      `player_params replace the default rather than merging`,
      { player_params: { cc_load_policy: 1, hl: `de` } },
      `https://www.youtube-nocookie.com/embed/abc123?cc_load_policy=1&hl=de`,
    ],
    [
      `video_id is url-encoded`,
      { video_id: `a b/c` },
      `https://www.youtube-nocookie.com/embed/a%20b%2Fc?autoplay=1`,
    ],
  ])(`iframe src: %s`, async (_desc, props, expected_src) => {
    mount_embed(props)
    await tick()
    click(`button.play-btn`)
    await tick()

    expect(doc_query(`iframe`).getAttribute(`src`)).toBe(expected_src)
  })

  test(`a new video_id tears the player back down to the poster`, async () => {
    const props = mount_embed({ video_id: `first` })
    await tick()
    click(`button.play-btn`)
    await tick()
    expect(iframes()).toHaveLength(1)

    fetched.length = 0
    props.video_id = `second`
    await tick()

    expect(iframes()).toHaveLength(0)
    // teardown has to be synchronous: leaving the iframe up for even one render lets the
    // browser start loading the new video, the exact cost this component exists to avoid
    expect(fetched).toEqual([])
    expect(doc_query(`img.poster`).getAttribute(`src`)).toBe(
      `https://i.ytimg.com/vi/second/hqdefault.jpg`,
    )
    expect(doc_query(`picture source`).getAttribute(`srcset`)).toBe(
      `https://i.ytimg.com/vi_webp/second/hqdefault.webp`,
    )
  })

  test(`keeps a consumer class alongside the styling hook and flags activation`, async () => {
    mount_embed({ class: `my-embed`, style: `--lite-youtube-bg: navy` })
    await tick()

    const wrapper = doc_query(`div.lite-youtube`)
    expect(wrapper.classList.contains(`my-embed`)).toBe(true)
    expect(wrapper.classList.contains(`activated`)).toBe(false)
    expect(wrapper.getAttribute(`style`)).toBe(`--lite-youtube-bg: navy;`)

    click(`button.play-btn`)
    await tick()
    expect(wrapper.classList.contains(`activated`)).toBe(true)
  })
})
