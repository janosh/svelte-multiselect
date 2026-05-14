import { mount } from 'svelte'
import App from './SmokeApp.svelte'

const target = document.querySelector(`#app`)
if (!target) throw new Error(`package smoke fixture target missing`)

mount(App, { target })
