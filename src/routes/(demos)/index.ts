const hidden_demos = [`/confetti`, `/wiggle`] // internal test pages not shown in nav

export const routes = Object.keys(import.meta.glob(`./**/+page.{svelte,md}`))
  .map((filename) => {
    const parts = filename.split(`/`).filter((part) => !part.startsWith(`(`)) // remove hidden route segments
    return { route: `/${parts.slice(1, -1).join(`/`)}`, filename }
  })
  .filter(({ filename }) => !filename.includes(`/(hide)/`))
  .filter(({ route }) => !hidden_demos.includes(route))

if (routes.length < 3) {
  console.error(`Too few demo routes found: ${routes.length}`)
}

export const demo_pages = routes.map(({ route }) => route)
