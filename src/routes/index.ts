import { RequestHandler } from '@sveltejs/kit'

export const get: RequestHandler = async () => {
  const routes = Object.keys(import.meta.glob(`./*.svx`)).map(
    (filename) => filename.split(`.`)[1]
  )

  return { body: { routes } }
}
