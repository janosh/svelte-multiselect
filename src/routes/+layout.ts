export const prerender = true

export const _demo_routes = Object.keys(
  import.meta.glob(`./*/+page.{svx,svelte}`)
)
  .map((filename) => filename.split(`/`)[1])
  .filter((name) => !name.endsWith(`.md`))

if (_demo_routes.length < 5) {
  throw new Error(`Too few demo routes found: ${_demo_routes.length}`)
}
